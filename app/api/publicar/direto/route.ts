import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function publishFallback(caption: string, imageUrls: string[]) {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accountId || !token) throw new Error("Credenciais do Instagram nao configuradas.");

  const create = async (imageUrl: string, isCarouselItem: boolean) => {
    const params = new URLSearchParams({ image_url: imageUrl, access_token: token });
    if (isCarouselItem) params.set("is_carousel_item", "true");
    else params.set("caption", caption);
    const response = await fetch(`${graphBase}/${accountId}/media`, { method: "POST", body: params });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Falha ao criar container.");
    return String(data.id);
  };

  const publish = async (creationId: string) => {
    const response = await fetch(`${graphBase}/${accountId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: creationId, access_token: token })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Falha ao publicar.");
    return data;
  };

  if (imageUrls.length === 1) return publish(await create(imageUrls[0], false));

  const children = [];
  for (const imageUrl of imageUrls.slice(0, 10)) children.push(await create(imageUrl, true));
  const response = await fetch(`${graphBase}/${accountId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
      access_token: token
    })
  });
  const carousel = await response.json();
  if (!response.ok) throw new Error(carousel?.error?.message || "Falha ao criar carrossel.");
  return publish(String(carousel.id));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const codigo = Number(body.codigo || body.code);
    const caption = String(body.caption || "").trim();

    if (!codigo) return NextResponse.json({ sucesso: false, error: "Informe o codigo." }, { status: 400 });

    const backend = await postToBackend("/api/publicar/direto", { codigo, caption });
    if (backend) return NextResponse.json(backend);

    const imageUrls = Array.from(new Set((body.imageUrls || body.imagens || []) as string[])).filter((url) =>
      /^https?:\/\//i.test(url)
    );
    if (!imageUrls.length) {
      return NextResponse.json(
        { sucesso: false, error: "Backend indisponivel e nenhuma URL publica foi enviada para fallback." },
        { status: 503 }
      );
    }
    const resultado = await publishFallback(caption, imageUrls);
    return NextResponse.json({ sucesso: true, resultado, origem: "next-fallback" });
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
