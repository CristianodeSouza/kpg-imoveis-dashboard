import { prepareInstagramImages } from "@/lib/instagram-image";
import { ensureInstagramQuota, recordInstagramPublication } from "@/lib/publications";
import { readTenantSettings } from "@/lib/settings";

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

async function publishToInstagram(caption: string, imageUrls: string[], accountId: string, token: string) {
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

export async function publishInstagramForTenant(input: {
  tenantId: string;
  userId?: string | null;
  propertyCode?: string | number | null;
  caption: string;
  imageUrls: string[];
}) {
  const settings = await readTenantSettings(input.tenantId);
  const caption = String(input.caption || "").trim();
  const imageUrls = Array.from(new Set(input.imageUrls || [])).filter((url) => /^https?:\/\//i.test(url));

  if (!caption) throw new Error("A legenda do Instagram nao pode ficar vazia.");
  if (!imageUrls.length) throw new Error("Selecione pelo menos uma imagem publica para o Instagram.");

  await ensureInstagramQuota(input.tenantId);
  const preparedImageUrls = await prepareInstagramImages(imageUrls.slice(0, 10), {
    tenantId: input.tenantId,
    preset: "feed-portrait"
  });
  const result = await publishToInstagram(caption, preparedImageUrls, settings.instagramAccountId, settings.instagramAccessToken || "");
  const publishedPermalink = await fetchPublishedPermalink(String(result.id || ""), settings.instagramAccessToken || "");
  const permalink =
    publishedPermalink || result.permalink || result.url || (result.id ? `https://www.instagram.com/p/${result.id}/` : "");
  const { usage } = await recordInstagramPublication({
    tenantId: input.tenantId,
    userId: input.userId,
    propertyCode: input.propertyCode,
    caption,
    instagramPostId: result.id,
    instagramUrl: permalink,
    mediaType: result.tipo,
    photosCount: result.fotos_publicadas,
    metadata: { ...result, originalImageUrls: imageUrls, preparedImageUrls, imagePreset: "feed-portrait" }
  });
  return {
    success: true,
    provider: "instagram" as const,
    postId: String(result.id || ""),
    url: permalink,
    result: { ...result, url: permalink, imagens_tratadas: preparedImageUrls.length },
    usage
  };
}
