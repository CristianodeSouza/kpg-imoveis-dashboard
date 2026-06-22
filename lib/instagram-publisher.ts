import { readTenantSettings } from "@/lib/settings";
import { ensureInstagramQuota, recordInstagramPublication } from "@/lib/publications";
import { prepareInstagramImages } from "@/lib/instagram-image";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function createMediaContainer(imageUrl: string, caption: string, isCarouselItem: boolean, accountId: string, token: string) {
  if (!accountId || !token) throw new Error("Credenciais do Instagram nao configuradas no servidor.");

  const params = new URLSearchParams({ image_url: imageUrl, access_token: token });
  if (isCarouselItem) params.set("is_carousel_item", "true");
  else params.set("caption", caption);

  const response = await fetch(`${graphBase}/${accountId}/media`, { method: "POST", body: params });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao criar container de midia.");
  return String(data.id);
}

async function publishContainer(creationId: string, accountId: string, token: string) {
  if (!accountId || !token) throw new Error("Credenciais do Instagram nao configuradas no servidor.");
  const response = await fetch(`${graphBase}/${accountId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: creationId, access_token: token })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao publicar no Instagram.");
  return data;
}

async function fetchPublishedPermalink(mediaId: string, token: string) {
  if (!mediaId) return "";
  try {
    const response = await fetch(`${graphBase}/${encodeURIComponent(mediaId)}?fields=permalink&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return "";
    return String(data?.permalink || "");
  } catch {
    return "";
  }
}

export async function publishInstagramJob(input: {
  tenantId: string;
  userId?: string;
  caption: string;
  imageUrls: string[];
  jobId?: string;
}) {
  const settings = await readTenantSettings(input.tenantId);
  const accountId = settings.instagramAccountId;
  const token = settings.instagramAccessToken || "";
  const imageUrls = Array.from(new Set(input.imageUrls || [])).filter((url) => /^https?:\/\//i.test(url));
  const caption = String(input.caption || "").trim();

  if (!caption) throw new Error("A legenda nao pode ficar vazia.");
  if (!imageUrls.length) throw new Error("Selecione pelo menos uma imagem publica.");

  await ensureInstagramQuota(input.tenantId);
  const preparedImageUrls = await prepareInstagramImages(imageUrls.slice(0, 10), {
    tenantId: input.tenantId,
    preset: "feed-portrait",
    jobId: input.jobId
  });

  if (preparedImageUrls.length === 1) {
    const containerId = await createMediaContainer(preparedImageUrls[0], caption, false, accountId, token);
    const result = await publishContainer(containerId, accountId, token);
    const publishedPermalink = await fetchPublishedPermalink(String(result?.id || ""), token);
    const permalink = publishedPermalink || result?.permalink || result?.url || (result?.id ? `https://www.instagram.com/p/${result.id}/` : "");
    const { usage } = await recordInstagramPublication({
      tenantId: input.tenantId,
      userId: input.userId,
      caption,
      instagramPostId: result?.id,
      instagramUrl: permalink,
      mediaType: "imagem",
      photosCount: 1,
      metadata: { ...result, originalImageUrls: imageUrls, preparedImageUrls, imagePreset: "feed-portrait", jobId: input.jobId }
    });
    return { provider: "instagram", postId: result?.id, url: permalink, mediaType: "imagem", photosCount: 1, usage };
  }

  const children = [];
  for (const imageUrl of preparedImageUrls) {
    children.push(await createMediaContainer(imageUrl, caption, true, accountId, token));
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
  if (!carouselResponse.ok) throw new Error(carousel?.error?.message || "Falha ao criar carrossel.");

  const result = await publishContainer(String(carousel.id), accountId, token);
  const publishedPermalink = await fetchPublishedPermalink(String(result?.id || ""), token);
  const permalink = publishedPermalink || result?.permalink || result?.url || (result?.id ? `https://www.instagram.com/p/${result.id}/` : "");
  const { usage } = await recordInstagramPublication({
    tenantId: input.tenantId,
    userId: input.userId,
    caption,
    instagramPostId: result?.id,
    instagramUrl: permalink,
    mediaType: "carrossel",
    photosCount: children.length,
    metadata: { ...result, originalImageUrls: imageUrls, preparedImageUrls, imagePreset: "feed-portrait", jobId: input.jobId }
  });
  return { provider: "instagram", postId: result?.id, url: permalink, mediaType: "carrossel", photosCount: children.length, usage };
}
