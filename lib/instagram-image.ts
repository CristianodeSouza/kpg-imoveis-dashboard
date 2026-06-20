import sharp from "sharp";

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

async function uploadToImgBb(image: Buffer, name: string) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY nao configurada para tratar imagens.");

  const formData = new FormData();
  formData.set("image", image.toString("base64"));
  formData.set("name", name.replace(/[^a-z0-9-_]/gi, "-").slice(0, 80));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || "Falha ao subir imagem tratada no ImgBB.");
  }
  return String(data?.data?.url || data?.data?.display_url || "");
}

export async function prepareInstagramImage(
  url: string,
  options: { index: number; tenantId: string; preset?: InstagramImagePreset }
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

  return uploadToImgBb(processed, `${options.tenantId}-${preset}-${options.index}-${Date.now()}`);
}

export async function prepareInstagramImages(
  urls: string[],
  options: { tenantId: string; preset?: InstagramImagePreset }
) {
  return Promise.all(
    urls.map((url, index) =>
      prepareInstagramImage(url, {
        tenantId: options.tenantId,
        preset: options.preset,
        index: index + 1
      })
    )
  );
}
