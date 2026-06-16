import { NextResponse } from "next/server";
import { absolutizeBackendUrls, postToBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const codigo = Number(body.codigo || body.code);
  const idImovel = Number(body.id_imovel || body.id || codigo);

  if (!codigo || !idImovel) {
    return NextResponse.json({ sucesso: false, error: "Informe codigo e id_imovel." }, { status: 400 });
  }

  const backend = await postToBackend<{
    sucesso: boolean;
    caption: string;
    criativos: { feed: string[]; stories: string[]; carousel: string[] };
  }>("/api/criativos/gerar", { codigo, id_imovel: idImovel });

  if (backend) {
    return NextResponse.json(absolutizeBackendUrls({ ...backend, origem: "backend" }));
  }

  return NextResponse.json(
    {
      sucesso: false,
      error: "Backend de criativos indisponivel. Inicie o FastAPI na porta 8000 para gerar imagens 1080x1350."
    },
    { status: 503 }
  );
}
