import { NextResponse } from "next/server";
import { googleBusinessPostService } from "@/lib/google-business";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const { postId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const updated = await googleBusinessPostService.updatePost({
      tenantId: session.tenantId,
      postId,
      summary: body.summary,
      imageUrl: body.imageUrl,
      cta: body.cta,
      url: body.url
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { success: false, provider: "google_business_profile", error: error instanceof Error ? error.message : "Erro ao editar post." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const { postId } = await context.params;
    const deleted = await googleBusinessPostService.deletePost({
      tenantId: session.tenantId,
      postId
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json(
      { success: false, provider: "google_business_profile", error: error instanceof Error ? error.message : "Erro ao excluir post." },
      { status: 500 }
    );
  }
}
