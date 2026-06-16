import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";
import { normalizeProperty } from "@/lib/property";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const codigo = String(body.codigo || body.code || "").trim();

  if (!codigo) {
    return NextResponse.json({ sucesso: false, error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const backend = await postToBackend<{ sucesso: boolean; imovel: unknown }>("/api/buscar", {
    codigo: Number(codigo)
  });

  if (backend?.imovel) {
    return NextResponse.json({
      sucesso: true,
      imovel: backend.imovel,
      property: normalizeProperty({ imovel: backend.imovel }, codigo),
      origem: "backend"
    });
  }

  const endpoint = `https://www.kpgimoveis.com.br/api/imovel/${encodeURIComponent(codigo)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Referer: "https://www.kpgimoveis.com.br/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    },
    cache: "no-store"
  });
  const text = await response.text();

  if (!response.ok || !text.trim()) {
    return NextResponse.json({ sucesso: false, error: "Nenhum imovel encontrado para este codigo." }, { status: 404 });
  }

  try {
    const payload = JSON.parse(text);
    return NextResponse.json({
      sucesso: true,
      imovel: payload?.imovel || payload?.data || payload,
      property: normalizeProperty(payload, codigo),
      origem: "proxy-kpg"
    });
  } catch {
    return NextResponse.json({ sucesso: false, error: "A API retornou conteudo invalido." }, { status: 502 });
  }
}
