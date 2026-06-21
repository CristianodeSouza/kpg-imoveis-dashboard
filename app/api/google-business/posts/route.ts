import { NextResponse } from "next/server";
import { googleBusinessPostService } from "@/lib/google-business";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const published = await googleBusinessPostService.createPost({
      tenantId: session.tenantId,
      userId: session.userId,
      propertyCode: body.propertyCode,
      accountId: body.accountId,
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
      status: published.status || "LIVE",
      url: published.url,
      historyId: published.historyId
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, provider: "google_business_profile", error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
