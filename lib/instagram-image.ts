import sharp from "sharp";
import { saveTenantAsset } from "@/lib/assets";

type InstagramImagePreset = "feed-portrait" | "story-reel";

const presets: Record<InstagramImagePreset, { width: number; height: number }> = {
  "feed-portrait": { width: 1080, height: 1350 },
  "story-reel": { width: 1080, height: 1920 }
};

async function downloadImage(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Falha ao baixar imagem ${response.status}.`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.includes("image")) {
    throw new Error("URL retornou um arquivo que nao e imagem.");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function prepareInstagramImage(
  url: string,
  options: { index: number; tenantId: string; preset?: InstagramImagePreset; jobId?: string }
) {
  const preset = options.preset || "feed-portrait";
  const size = presets[preset];
  const original = await downloadImage(url);
  const processed = await sharp(original)
    .rotate()
    .resize(size.width, size.height, {
      fit: "cover",
      position: "center"
    })
    .jpeg({
      quality: 92,
      mozjpeg: true
    })
    .toBuffer();

  const asset = await saveTenantAsset({
    tenantId: options.tenantId,
    type: "instagram-image",
    buffer: processed,
    mimeType: "image/jpeg",
    extension: "jpg",
    sourceUrl: url,
    jobId: options.jobId,
    metadata: { preset, index: options.index, width: size.width, height: size.height }
  });

  return asset.url;
}

export async function prepareInstagramImages(
  urls: string[],
  options: { tenantId: string; preset?: InstagramImagePreset; jobId?: string }
) {
  return Promise.all(
    urls.map((url, index) =>
      prepareInstagramImage(url, {
        tenantId: options.tenantId,
        preset: options.preset,
        jobId: options.jobId,
        index: index + 1
      })
    )
  );
}
