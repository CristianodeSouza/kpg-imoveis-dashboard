import { NextResponse } from "next/server";
import { googleBusinessService } from "@/lib/google-business";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const published = await googleBusinessService.publishLocalPost({
      tenantId: session.tenantId,
      locationId: body.locationId,
      summary: body.summary,
      imageUrl: body.imageUrl,
      cta: body.cta || "LEARN_MORE",
      url: body.url
    });

    return NextResponse.json({
      success: true,
      provider: "google_business_profile",
      postId: published.postId,
      message: "Publicado no Google Meu Negocio com sucesso",
      url: published.url
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, provider: "google_business_profile", error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
