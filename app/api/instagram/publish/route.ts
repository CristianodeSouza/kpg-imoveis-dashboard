import { NextResponse } from "next/server";
import type { PublishPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function createMediaContainer(imageUrl: string, caption: string, isCarouselItem: boolean) {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !token) {
    throw new Error("Credenciais do Instagram nao configuradas no servidor.");
  }

  const params = new URLSearchParams({
    image_url: imageUrl,
    access_token: token
  });

  if (isCarouselItem) {
    params.set("is_carousel_item", "true");
  } else {
    params.set("caption", caption);
  }

  const response = await fetch(`${graphBase}/${accountId}/media`, {
    method: "POST",
    body: params
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Falha ao criar container de midia.");
  }

  return String(data.id);
}

async function publishContainer(creationId: string) {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !token) {
    throw new Error("Credenciais do Instagram nao configuradas no servidor.");
  }

  const response = await fetch(`${graphBase}/${accountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: token
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Falha ao publicar no Instagram.");
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublishPayload;
    const imageUrls = Array.from(new Set(body.imageUrls || [])).filter((url) => /^https?:\/\//i.test(url));
    const caption = String(body.caption || "").trim();

    if (!caption) {
      return NextResponse.json({ error: "A legenda nao pode ficar vazia." }, { status: 400 });
    }

    if (!imageUrls.length) {
      return NextResponse.json({ error: "Selecione pelo menos uma imagem publica." }, { status: 400 });
    }

    if (imageUrls.length === 1) {
      const containerId = await createMediaContainer(imageUrls[0], caption, false);
      const result = await publishContainer(containerId);
      return NextResponse.json({ ok: true, result });
    }

    const children = [];
    for (const imageUrl of imageUrls.slice(0, 10)) {
      children.push(await createMediaContainer(imageUrl, caption, true));
    }

    const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) {
      throw new Error("Credenciais do Instagram nao configuradas no servidor.");
    }

    const carouselResponse = await fetch(`${graphBase}/${accountId}/media`, {
      method: "POST",
      body: new URLSearchParams({
        media_type: "CAROUSEL",
        children: children.join(","),
        caption,
        access_token: token
      })
    });
    const carousel = await carouselResponse.json();

    if (!carouselResponse.ok) {
      throw new Error(carousel?.error?.message || "Falha ao criar carrossel.");
    }

    const result = await publishContainer(String(carousel.id));
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao publicar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
