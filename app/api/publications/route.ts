import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";
import { getInstagramUsage, listInstagramPublications, publicationTitleFromCaption } from "@/lib/publications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") || 50)));
  const take = Math.min(300, page * pageSize);

  const [usage, instagramTotal, socialTotal, googleBusinessTotal, instagramPublications, socialPublications, googleBusinessPosts] = await Promise.all([
    getInstagramUsage(session.tenantId),
    prisma.publicationLog.count({ where: { tenantId: session.tenantId } }),
    prisma.socialPublication.count({ where: { tenantId: session.tenantId } }),
    prisma.googleBusinessPost.count({ where: { tenantId: session.tenantId } }),
    listInstagramPublications(session.tenantId, take),
    prisma.socialPublication.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.googleBusinessPost.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take
    })
  ]);

  const socialInstagramIds = new Set(socialPublications.map((item) => item.instagramPostId).filter(Boolean));
  const socialGoogleBusinessIds = new Set(socialPublications.map((item) => item.gmbPostId).filter(Boolean));
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

  const googleBusinessRows = googleBusinessPosts
    .filter((item) => !item.postId || !socialGoogleBusinessIds.has(item.postId))
    .map((item) => ({
      id: item.id,
      kind: "google_business_profile",
      title: publicationTitleFromCaption(item.summary, "Google Meu Negocio"),
      propertyCode: item.propertyCode,
      propertyUrl: item.targetUrl,
      caption: item.summary,
      channels: {
        instagram: { status: "skipped", postId: "", url: "" },
        googleBusinessProfile: {
          status: item.status === "DELETED" ? "deleted" : item.status === "FAILED" ? "failed" : "published",
          postId: item.postId,
          url: item.targetUrl
        },
        facebook: { status: "future", postId: "", url: "" },
        blog: { status: "future", postId: "", url: "" }
      },
      results: [],
      mediaType: "local post",
      photosCount: item.imageUrl ? 1 : 0,
      status: item.status,
      errorMessage: "",
      createdAt: item.createdAt
    }));

  const publications = [...socialRows, ...legacyRows, ...googleBusinessRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((page - 1) * pageSize, page * pageSize);

  const total = instagramTotal + socialTotal + googleBusinessTotal;

  return NextResponse.json({
    usage,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    },
    publications
  });
}
