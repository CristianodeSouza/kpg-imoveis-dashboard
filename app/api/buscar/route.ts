import { NextResponse } from "next/server";
import { lookupProperty } from "@/lib/kpg-api";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";
export const preferredRegion = "gru1";

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ sucesso: false, error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const codigo = String(body.codigo || body.code || "").trim();

  if (!codigo) {
    return NextResponse.json({ sucesso: false, error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const result = await lookupProperty(codigo, session.tenantId);

  if (!result) {
    return NextResponse.json(
      {
        sucesso: false,
        error:
          "Nao foi possivel carregar este imovel agora. Confira se o codigo existe no site da KPG e tente novamente em alguns instantes."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    imovel: result.imovel,
    property: result.property,
    origem: result.origem
  });
}
