import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";
import { ensureInstagramQuota, recordInstagramPublication } from "@/lib/publications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function graphFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Instagram API retornou ${response.status}.`);
  }
  return data;
}

async function fetchPublishedPermalink(mediaId: string, token: string) {
  if (!mediaId) return "";
  try {
    const data = await graphFetch(
      `${graphBase}/${encodeURIComponent(mediaId)}?fields=permalink&access_token=${encodeURIComponent(token)}`
    );
    return String(data?.permalink || "");
  } catch {
    return "";
  }
}

async function publishFallback(caption: string, imageUrls: string[], accountId: string, token: string) {
  if (!accountId || !token) throw new Error("Credenciais do Instagram nao configuradas.");

  const create = async (imageUrl: string, isCarouselItem: boolean) => {
    const params = new URLSearchParams({ image_url: imageUrl, access_token: token });
    if (isCarouselItem) params.set("is_carousel_item", "true");
    else params.set("caption", caption);
    const data = await graphFetch(`${graphBase}/${accountId}/media`, { method: "POST", body: params });
    return String(data.id);
  };

  const waitUntilReady = async (creationId: string) => {
    let lastStatus = "";
    for (let attempt = 0; attempt < 18; attempt++) {
      const data = await graphFetch(
        `${graphBase}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`
      );
      lastStatus = String(data.status_code || "");
      if (lastStatus === "FINISHED") return;
      if (lastStatus === "ERROR") throw new Error("Instagram retornou erro ao processar uma imagem do carrossel.");
      await sleep(2000);
    }
    throw new Error(`Instagram ainda nao liberou a midia para publicacao. Status: ${lastStatus || "pendente"}.`);
  };

  const publish = async (creationId: string) => {
    await waitUntilReady(creationId);
    return graphFetch(`${graphBase}/${accountId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: creationId, access_token: token })
    });
  };

  if (imageUrls.length === 1) {
    const result = await publish(await create(imageUrls[0], false));
    return { ...result, tipo: "imagem", fotos_publicadas: 1 };
  }

  const children = await Promise.all(imageUrls.slice(0, 10).map((imageUrl) => create(imageUrl, true)));
  await Promise.all(children.map((childId) => waitUntilReady(childId)));

  const carousel = await graphFetch(`${graphBase}/${accountId}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
      access_token: token
    })
  });
  const result = await publish(String(carousel.id));
  return { ...result, tipo: "carrossel", fotos_publicadas: children.length };
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "instagram-publisher");
    if (response) return response;
    if (!session) return NextResponse.json({ sucesso: false, error: "Sessao invalida." }, { status: 401 });

    const settings = await readTenantSettings(session.tenantId);
    const body = await request.json();
    const codigo = Number(body.codigo || body.code);
    const caption = String(body.caption || "").trim();

    if (!codigo) return NextResponse.json({ sucesso: false, error: "Informe o codigo." }, { status: 400 });

    const imageUrls = Array.from(new Set((body.imageUrls || body.imagens || []) as string[])).filter((url) =>
      /^https?:\/\//i.test(url)
    );

    if (imageUrls.length) {
      await ensureInstagramQuota(session.tenantId);
      const resultado = await publishFallback(caption, imageUrls, settings.instagramAccountId, settings.instagramAccessToken || "");
      const publishedPermalink = await fetchPublishedPermalink(String(resultado.id || ""), settings.instagramAccessToken || "");
      const permalink =
        publishedPermalink ||
        resultado.permalink ||
        resultado.url ||
        (resultado.id ? `https://www.instagram.com/p/${resultado.id}/` : "");
      const { usage } = await recordInstagramPublication({
        tenantId: session.tenantId,
        userId: session.userId,
        propertyCode: codigo,
        caption,
        instagramPostId: resultado.id,
        instagramUrl: permalink,
        mediaType: resultado.tipo,
        photosCount: resultado.fotos_publicadas,
        metadata: resultado
      });
      return NextResponse.json({
        sucesso: true,
        resultado: { ...resultado, url: permalink },
        usage,
        origem: "next-selected-images"
      });
    }

    const backend = await postToBackend("/api/publicar/direto", { codigo, caption });
    if (backend) return NextResponse.json(backend);

    if (!imageUrls.length) {
      return NextResponse.json(
        { sucesso: false, error: "Selecione pelo menos uma foto para publicar." },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { sucesso: false, error: error instanceof Error ? error.message : "Erro ao publicar." },
      { status: 500 }
    );
  }
}
