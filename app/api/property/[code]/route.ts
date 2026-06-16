import { NextResponse } from "next/server";
import { normalizeProperty } from "@/lib/property";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const cleanCode = code?.trim();

  if (!cleanCode) {
    return NextResponse.json({ error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const endpoint = `https://www.kpgimoveis.com.br/api/imovel/${encodeURIComponent(cleanCode)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Referer: "https://www.kpgimoveis.com.br/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    },
    cache: "no-store"
  });

  const text = await response.text();

  if (!response.ok) {
    return NextResponse.json(
      { error: `SIGA/KPG retornou ${response.status}.`, details: text.slice(0, 500) },
      { status: response.status }
    );
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Nenhum imovel encontrado para este codigo." }, { status: 404 });
  }

  try {
    const payload = JSON.parse(text);
    const property = normalizeProperty(payload, cleanCode);
    return NextResponse.json({ property });
  } catch {
    return NextResponse.json(
      { error: "A API retornou um conteudo que nao e JSON.", details: text.slice(0, 500) },
      { status: 502 }
    );
  }
}
