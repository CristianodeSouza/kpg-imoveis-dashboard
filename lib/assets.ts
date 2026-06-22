import crypto from "crypto";
import { prisma } from "@/lib/db";

type AssetInput = {
  tenantId: string;
  type: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  sourceUrl?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
};

function cleanPath(value: string) {
  return value.replace(/[^a-z0-9._/-]/gi, "-").replace(/-+/g, "-").slice(0, 180);
}

async function uploadSupabaseStorage(input: AssetInput, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_ASSETS_BUCKET || "tenant-assets";

  if (!supabaseUrl || !serviceRoleKey) return null;

  const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": input.mimeType,
      "x-upsert": "true"
    },
    body: new Uint8Array(input.buffer)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Falha ao salvar asset no Supabase Storage: ${response.status} ${detail}`.slice(0, 500));
  }

  return {
    provider: "supabase-storage",
    storagePath: `${bucket}/${path}`,
    url: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`
  };
}

async function uploadImgBbFallback(input: AssetInput, name: string) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ASSETS_BUCKET para storage de assets.");

  const formData = new FormData();
  formData.set("image", input.buffer.toString("base64"));
  formData.set("name", name);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json();
  if (!response.ok || !data?.success) throw new Error(data?.error?.message || "Falha ao subir asset no fallback ImgBB.");

  return {
    provider: "imgbb-fallback",
    storagePath: "",
    url: String(data?.data?.url || data?.data?.display_url || "")
  };
}

export async function saveTenantAsset(input: AssetInput) {
  const hash = crypto.createHash("sha1").update(input.buffer).digest("hex").slice(0, 16);
  const name = cleanPath(`${input.type}-${Date.now()}-${hash}.${input.extension.replace(/^\./, "")}`);
  const path = cleanPath(`${input.tenantId}/${input.type}/${name}`);
  const uploaded = (await uploadSupabaseStorage(input, path)) || (await uploadImgBbFallback(input, name));

  return prisma.asset.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      provider: uploaded.provider,
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      jobId: input.jobId || "",
      sourceUrl: input.sourceUrl || "",
      metadata: {
        ...(input.metadata || {}),
        storageStrategy: "supabase-storage",
        fallbackUsed: uploaded.provider !== "supabase-storage"
      }
    }
  });
}
