import { NextResponse } from "next/server";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";
import type { PublishPayload } from "@/lib/types";
import { ensureInstagramQuota, recordInstagramPublication } from "@/lib/publications";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function createMediaContainer(imageUrl: string, caption: string, isCarouselItem: boolean, accountId: string, token: string) {
  if (!accountId || !token) {
    throw new Error("Credenciais do Instagram nao configuradas no servidor.");
  }

  const params = new URLSearchParams({
    image_url: imageUrl,
    access_token: token
  });

  if (isCarouselItem) {
    params.set("is_carousel_item", "true");
  } else {
    params.set("caption", caption);
  }

  const response = await fetch(`${graphBase}/${accountId}/media`, {
    method: "POST",
    body: params
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Falha ao criar container de midia.");
  }

  return String(data.id);
}

async function publishContainer(creationId: string, accountId: string, token: string) {
  if (!accountId || !token) {
    throw new Error("Credenciais do Instagram nao configuradas no servidor.");
  }

  const response = await fetch(`${graphBase}/${accountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: token
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Falha ao publicar no Instagram.");
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const settings = await readTenantSettings(session.tenantId);
    const accountId = settings.instagramAccountId;
    const token = settings.instagramAccessToken || "";
    const body = (await request.json()) as PublishPayload;
    const imageUrls = Array.from(new Set(body.imageUrls || [])).filter((url) => /^https?:\/\//i.test(url));
    const caption = String(body.caption || "").trim();

    if (!caption) {
      return NextResponse.json({ error: "A legenda nao pode ficar vazia." }, { status: 400 });
    }

    if (!imageUrls.length) {
      return NextResponse.json({ error: "Selecione pelo menos uma imagem publica." }, { status: 400 });
    }

    await ensureInstagramQuota(session.tenantId);

    if (imageUrls.length === 1) {
      const containerId = await createMediaContainer(imageUrls[0], caption, false, accountId, token);
      const result = await publishContainer(containerId, accountId, token);
      const permalink = result?.permalink || result?.url || (result?.id ? `https://www.instagram.com/p/${result.id}/` : "");
      const { usage } = await recordInstagramPublication({
        tenantId: session.tenantId,
        userId: session.userId,
        caption,
        instagramPostId: result?.id,
        instagramUrl: permalink,
        mediaType: "imagem",
        photosCount: 1,
        metadata: result
      });
      return NextResponse.json({ ok: true, result: { ...result, url: permalink }, usage });
    }

    const children = [];
    for (const imageUrl of imageUrls.slice(0, 10)) {
      children.push(await createMediaContainer(imageUrl, caption, true, accountId, token));
    }

    if (!accountId || !token) {
      throw new Error("Credenciais do Instagram nao configuradas no servidor.");
    }

    const carouselResponse = await fetch(`${graphBase}/${accountId}/media`, {
      method: "POST",
      body: new URLSearchParams({
        media_type: "CAROUSEL",
        children: children.join(","),
        caption,
        access_token: token
      })
    });
    const carousel = await carouselResponse.json();

    if (!carouselResponse.ok) {
      throw new Error(carousel?.error?.message || "Falha ao criar carrossel.");
    }

    const result = await publishContainer(String(carousel.id), accountId, token);
    const permalink = result?.permalink || result?.url || (result?.id ? `https://www.instagram.com/p/${result.id}/` : "");
    const { usage } = await recordInstagramPublication({
      tenantId: session.tenantId,
      userId: session.userId,
      caption,
      instagramPostId: result?.id,
      instagramUrl: permalink,
      mediaType: "carrossel",
      photosCount: children.length,
      metadata: result
    });
    return NextResponse.json({ ok: true, result: { ...result, url: permalink }, usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao publicar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
