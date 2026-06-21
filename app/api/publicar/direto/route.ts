import { NextResponse } from "next/server";
import { publishInstagramForTenant } from "@/lib/instagram-publisher";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    const published = await publishInstagramForTenant({
      tenantId: session.tenantId,
      userId: session.userId,
      propertyCode: codigo,
      caption: String(body.caption || ""),
      imageUrls
    });

    return NextResponse.json({
      sucesso: true,
      resultado: published.result,
      usage: published.usage,
      origem: "next-selected-images"
    });
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
