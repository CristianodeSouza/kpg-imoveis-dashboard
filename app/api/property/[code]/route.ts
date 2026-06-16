import { NextResponse } from "next/server";
import { lookupProperty } from "@/lib/kpg-api";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const preferredRegion = "gru1";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const { code } = await context.params;
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    return NextResponse.json({ error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const result = await lookupProperty(cleanCode, session.tenantId);

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Nao foi possivel carregar este imovel agora. Confira se o codigo existe no site da KPG e tente novamente em alguns instantes."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    property: result.property,
    origem: result.origem
  });
}
