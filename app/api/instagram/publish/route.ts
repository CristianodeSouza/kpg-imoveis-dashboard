import { NextResponse } from "next/server";
import { requireTenantService } from "@/lib/services";
import type { PublishPayload } from "@/lib/types";
import { ensureInstagramQuota } from "@/lib/publications";
import { createJob } from "@/lib/jobs";
import { runJobById } from "@/lib/job-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const body = (await request.json()) as PublishPayload;
    const imageUrls = Array.from(new Set(body.imageUrls || [])).filter((url) => /^https?:\/\//i.test(url));
    const caption = String(body.caption || "").trim();

    if (!caption) return NextResponse.json({ error: "A legenda nao pode ficar vazia." }, { status: 400 });
    if (!imageUrls.length) return NextResponse.json({ error: "Selecione pelo menos uma imagem publica." }, { status: 400 });

    await ensureInstagramQuota(session.tenantId);
    const job = await createJob({
      tenantId: session.tenantId,
      type: "instagram.publish",
      priority: 50,
      maxAttempts: 3,
      payload: {
        userId: session.userId,
        caption,
        imageUrls,
        imageCount: imageUrls.length,
        captionPreview: caption.slice(0, 160)
      }
    });

    const processed = await runJobById(job.id, { workerId: `publish-api-${Date.now()}` });
    if (processed?.status === "completed") {
      return NextResponse.json({
        ok: true,
        queued: false,
        jobId: job.id,
        result: processed.result,
        message: "Publicacao enviada ao Instagram com sucesso."
      });
    }

    if (processed?.status === "failed") {
      return NextResponse.json({
        ok: false,
        queued: false,
        jobId: job.id,
        error: processed.error || "Falha ao publicar no Instagram."
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      jobId: job.id,
      message: processed?.error
        ? `Publicacao enviada para a fila com nova tentativa agendada: ${processed.error}`
        : "Publicacao enviada para a fila. O worker publicara no Instagram em segundo plano."
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao enfileirar publicacao.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
