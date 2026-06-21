import { NextResponse } from "next/server";
import { googleBusinessPostService } from "@/lib/google-business";
import { publishInstagramForTenant } from "@/lib/instagram-publisher";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";
import type { PublishChannels } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type ProviderResult = {
  provider: "instagram" | "google_business_profile";
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  usage?: unknown;
};

function selectedChannels(value: unknown): PublishChannels {
  const channels = (value || {}) as Partial<PublishChannels>;
  return {
    instagram: channels.instagram !== false,
    googleBusinessProfile: Boolean(channels.googleBusinessProfile)
  };
}

function firstImage(assets: any, property: any) {
  const candidates = [
    ...(Array.isArray(assets?.imageUrls) ? assets.imageUrls : []),
    assets?.imageUrl,
    ...(Array.isArray(property?.photos) ? property.photos : [])
  ];
  return candidates.find((url) => /^https?:\/\//i.test(String(url || ""))) || "";
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ success: false, error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const channels = selectedChannels(body.channels);
  const property = body.property || {};
  const content = body.content || {};
  const assets = body.assets || {};
  const imageUrls = Array.from(new Set((assets.imageUrls || property.photos || []) as string[])).filter((url) =>
    /^https?:\/\//i.test(url)
  );
  const propertyCode = String(property.code || body.codigo || "");
  const propertyUrl = String(content.gmb_url || property.sourceUrl || assets.url || "");
  const results: ProviderResult[] = [];

  if (!channels.instagram && !channels.googleBusinessProfile) {
    return NextResponse.json({ success: false, error: "Selecione pelo menos um canal." }, { status: 400 });
  }

  if (channels.instagram) {
    try {
      const published = await publishInstagramForTenant({
        tenantId: session.tenantId,
        userId: session.userId,
        propertyCode,
        caption: String(content.instagram_caption || body.caption || ""),
        imageUrls
      });
      results.push({
        provider: "instagram",
        success: true,
        postId: published.postId,
        url: published.url,
        usage: published.usage
      });
    } catch (error) {
      results.push({
        provider: "instagram",
        success: false,
        error: error instanceof Error ? error.message : "Falha ao publicar no Instagram."
      });
    }
  }

  if (channels.googleBusinessProfile) {
    try {
      const published = await googleBusinessPostService.createPost({
        tenantId: session.tenantId,
        userId: session.userId,
        propertyCode,
        summary: String(content.gmb_summary || ""),
        imageUrl: firstImage(assets, property),
        cta: content.gmb_cta || "LEARN_MORE",
        url: propertyUrl
      });
      results.push({
        provider: "google_business_profile",
        success: true,
        postId: published.postId,
        url: published.url
      });
    } catch (error) {
      results.push({
        provider: "google_business_profile",
        success: false,
        error: error instanceof Error ? error.message : "Falha ao publicar no Google Meu Negocio."
      });
    }
  }

  const allSuccess = results.every((item) => item.success);
  const partial = results.some((item) => item.success) && results.some((item) => !item.success);
  const instagram = results.find((item) => item.provider === "instagram");
  const gmb = results.find((item) => item.provider === "google_business_profile");
  const errorMessage = results
    .filter((item) => !item.success)
    .map((item) => `${item.provider}: ${item.error}`)
    .join(" | ");

  await prisma.socialPublication.create({
    data: {
      tenantId: session.tenantId,
      userId: session.userId,
      propertyCode,
      propertyUrl,
      channels: channels as any,
      instagramStatus: instagram ? (instagram.success ? "published" : "failed") : "skipped",
      instagramPostId: instagram?.postId || "",
      instagramUrl: instagram?.url || "",
      gmbStatus: gmb ? (gmb.success ? "published" : "failed") : "skipped",
      gmbPostId: gmb?.postId || "",
      gmbUrl: gmb?.url || "",
      errorMessage,
      metadata: { results, content, assets: { imageCount: imageUrls.length } } as any
    }
  });

  return NextResponse.json({
    success: allSuccess,
    partial,
    results
  });
}
