import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { buildSigaPayload, readBlogProfile } from "@/lib/blog";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";
import { readTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatSigaError(parsed: unknown) {
  if (!parsed || typeof parsed !== "object") return "A API SIGA retornou erro.";
  const data = parsed as { Msg?: unknown; Status?: unknown; errors?: Record<string, unknown> };
  const messages: string[] = [];
  if (typeof data.Msg === "string") messages.push(data.Msg);

  if (data.errors && typeof data.errors === "object") {
    for (const [field, value] of Object.entries(data.errors)) {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(", ")}`);
      } else if (typeof value === "string") {
        messages.push(`${field}: ${value}`);
      }
    }
  }

  return messages.length ? messages.join(" | ") : "A API SIGA retornou erro.";
}

function isSigaSuccess(parsed: unknown, httpOk: boolean) {
  if (!httpOk) return false;
  if (!parsed || typeof parsed !== "object") return httpOk;
  const status = String((parsed as { Status?: unknown }).Status || "").toLowerCase();
  return status !== "erro" && status !== "error";
}

export async function POST(request: Request, context: RouteContext) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const post = await prisma.blogPost.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!post) return NextResponse.json({ error: "Post nao encontrado." }, { status: 404 });

  const [profile, settings] = await Promise.all([readBlogProfile(session.tenantId), readTenantSettings(session.tenantId)]);
  const token = settings.sigaToken;
  if (!token) {
    return NextResponse.json({ error: "Configure o token SIGA em Configuracoes antes de publicar." }, { status: 400 });
  }

  const imobiliaria = profile.sigaImobiliariaSlug.trim();
  if (!imobiliaria) {
    return NextResponse.json({ error: "Informe o slug da imobiliaria na API SIGA na aba Estrategia." }, { status: 400 });
  }

  const payload = {
    ...buildSigaPayload(profile, post),
    status: Number(body.status) === 1 ? 1 : 0
  };
  const endpoint = `https://api.sigacrm.com.br/${encodeURIComponent(imobiliaria)}/cadastrar/post-blog`;

  try {
    const sigaResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await sigaResponse.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    const success = isSigaSuccess(parsed, sigaResponse.ok);
    const saved = await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        payload,
        sigaResponse: parsed as object,
        sigaStatus: success ? "sent" : "error",
        editorialStatus: payload.status === 1 && success ? "published" : "draft",
        publishedAt: payload.status === 1 && success ? new Date() : post.publishedAt
      }
    });

    await auditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: success ? "blog.post.sent_to_siga" : "blog.post.siga_error",
      target: post.id,
      metadata: { status: sigaResponse.status, endpoint, publishStatus: payload.status, sigaResponse: parsed }
    });

    if (!success) {
      return NextResponse.json({ error: formatSigaError(parsed), status: sigaResponse.status, response: parsed, post: saved }, { status: 502 });
    }

    return NextResponse.json({ ok: true, post: saved, response: parsed });
  } catch (error) {
    const saved = await prisma.blogPost.update({
      where: { id: post.id },
      data: { payload, sigaStatus: "error", sigaResponse: { error: error instanceof Error ? error.message : "Erro desconhecido" } }
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao publicar no SIGA.", post: saved }, { status: 502 });
  }
}
