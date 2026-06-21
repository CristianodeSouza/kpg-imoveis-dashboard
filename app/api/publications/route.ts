import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";
import { getInstagramUsage, listInstagramPublications, publicationTitleFromCaption } from "@/lib/publications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const [usage, instagramPublications, socialPublications] = await Promise.all([
    getInstagramUsage(session.tenantId),
    listInstagramPublications(session.tenantId, 80),
    prisma.socialPublication.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 80
    })
  ]);

  const socialInstagramIds = new Set(socialPublications.map((item) => item.instagramPostId).filter(Boolean));
  const socialRows = socialPublications.map((item) => {
    const metadata = (item.metadata || {}) as any;
    const content = metadata?.content || {};
    const results = Array.isArray(metadata?.results) ? metadata.results : [];
    const imageCount = Number(metadata?.assets?.imageCount || 0);
    return {
      id: item.id,
      kind: "social",
      title: publicationTitleFromCaption(content.instagram_caption || content.gmb_summary || "", "Publicacao multicanal"),
      propertyCode: item.propertyCode,
      propertyUrl: item.propertyUrl,
      caption: content.instagram_caption || content.gmb_summary || "",
      channels: {
        instagram: {
          status: item.instagramStatus,
          postId: item.instagramPostId,
          url: item.instagramUrl
        },
        googleBusinessProfile: {
          status: item.gmbStatus,
          postId: item.gmbPostId,
          url: item.gmbUrl
        },
        facebook: { status: "future", postId: "", url: "" },
        blog: { status: "future", postId: "", url: "" }
      },
      results,
      mediaType: imageCount > 1 ? "carrossel" : imageCount === 1 ? "imagem" : "",
      photosCount: imageCount,
      status: item.errorMessage ? "partial" : "published",
      errorMessage: item.errorMessage,
      createdAt: item.createdAt
    };
  });

  const legacyRows = instagramPublications
    .filter((item) => !item.instagramPostId || !socialInstagramIds.has(item.instagramPostId))
    .map((item) => ({
      id: item.id,
      kind: "instagram",
      title: publicationTitleFromCaption(item.caption, item.mediaType),
      propertyCode: item.propertyCode,
      propertyUrl: "",
      caption: item.caption,
      channels: {
        instagram: {
          status: item.status,
          postId: item.instagramPostId,
          url: item.instagramUrl
        },
        googleBusinessProfile: { status: "skipped", postId: "", url: "" },
        facebook: { status: "future", postId: "", url: "" },
        blog: { status: "future", postId: "", url: "" }
      },
      results: [],
      mediaType: item.mediaType,
      photosCount: item.photosCount,
      status: item.status,
      errorMessage: "",
      createdAt: item.createdAt,
      cycleStart: item.cycleStart,
      cycleEnd: item.cycleEnd
    }));

  const publications = [...socialRows, ...legacyRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80);

  return NextResponse.json({
    usage,
    publications
  });
}
