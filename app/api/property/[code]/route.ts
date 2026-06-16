import { NextResponse } from "next/server";
import { lookupProperty } from "@/lib/kpg-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    return NextResponse.json({ error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const result = await lookupProperty(cleanCode);

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
