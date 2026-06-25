import sharp from "sharp";
import { saveExternalTenantAsset, saveTenantAsset } from "@/lib/assets";

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
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType
  };
}

function canUseOriginalForInstagram(input: { contentType: string; width?: number; height?: number; format?: string }) {
  const ratio = input.width && input.height ? input.width / input.height : 0;
  const isJpeg = input.contentType.includes("image/jpeg") || input.format === "jpeg" || input.format === "jpg";
  return isJpeg && ratio >= 0.8 && ratio <= 1.91;
}

export async function prepareInstagramImage(
  url: string,
  options: { index: number; tenantId: string; preset?: InstagramImagePreset; jobId?: string }
) {
  const preset = options.preset || "feed-portrait";
  const size = presets[preset];
  const original = await downloadImage(url);
  const metadata = await sharp(original.buffer).metadata();
  const hasSupabaseStorage = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasSupabaseStorage && canUseOriginalForInstagram({
    contentType: original.contentType,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format
  })) {
    const asset = await saveExternalTenantAsset({
      tenantId: options.tenantId,
      type: "instagram-image",
      mimeType: original.contentType || "image/jpeg",
      sourceUrl: url,
      jobId: options.jobId,
      sizeBytes: original.buffer.length,
      metadata: {
        preset: "original-compatible",
        index: options.index,
        width: metadata.width,
        height: metadata.height,
        reason: "Original JPEG publico compativel com Instagram; evitando fallback ImgBB."
      }
    });
    return asset.url;
  }

  const processed = await sharp(original.buffer)
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
