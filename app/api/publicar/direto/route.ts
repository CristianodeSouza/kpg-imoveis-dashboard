import { NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ sucesso: false, error: "Sessao invalida." }, { status: 401 });

    const body = await request.json();
    const codigo = Number(body.codigo || body.code);
    const imageUrls = Array.from(new Set((body.imageUrls || body.imagens || []) as string[])).filter((url) =>
      /^https?:\/\//i.test(url)
    );

    if (!codigo) return NextResponse.json({ sucesso: false, error: "Informe o codigo." }, { status: 400 });

    const job = await createJob({
      tenantId: session.tenantId,
      type: "instagram.publish",
      priority: 50,
      maxAttempts: 3,
      payload: {
        userId: session.userId,
        propertyCode: String(codigo),
        caption: String(body.caption || ""),
        imageUrls
      }
    });

    return NextResponse.json({
      sucesso: true,
      queued: true,
      jobId: job.id,
      origem: "next-selected-images"
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
