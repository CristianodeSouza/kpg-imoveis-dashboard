import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { normalizeDomain, normalizeSitemapUrl, text } from "@/lib/seo";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

function publicSite(site: any) {
  const sitemapUrls = site.sitemapUrls || [];
  const recommendations = site.recommendations || [];
  const validUrls = sitemapUrls.filter((item: any) => item.status === "valid").length;
  const warningUrls = sitemapUrls.filter((item: any) => item.status === "warning").length;
  const errorUrls = sitemapUrls.filter((item: any) => item.status === "error").length;
  return {
    id: site.id,
    name: site.name,
    domain: site.domain,
    propertyUrl: site.propertyUrl,
    sitemapUrl: site.sitemapUrl,
    status: site.status,
    seoScore: site.seoScore,
    indexationScore: site.indexationScore,
    geoScore: site.geoScore,
    sitemapScore: site.sitemapScore,
    lastSitemapCheckAt: site.lastSitemapCheckAt,
    createdAt: site.createdAt,
    metrics: {
      totalUrls: sitemapUrls.length,
      validUrls,
      warningUrls,
      errorUrls,
      openRecommendations: recommendations.filter((item: any) => item.status === "open").length
    },
    recommendations: recommendations.slice(0, 6),
    sitemapUrls: sitemapUrls.slice(0, 12)
  };
}

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "seo-intelligence");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const [sites, credentials] = await Promise.all([
    prisma.seoSite.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        sitemapUrls: { orderBy: [{ qualityScore: "asc" }, { lastSeenAt: "desc" }], take: 100 },
        recommendations: { where: { status: "open" }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 10 }
      }
    }),
    prisma.seoCredential.findUnique({ where: { tenantId: session.tenantId } })
  ]);

  const totals = sites.reduce(
    (acc, site) => {
      acc.urls += site.sitemapUrls.length;
      acc.recommendations += site.recommendations.length;
      acc.averageSeo += site.seoScore;
      acc.averageSitemap += site.sitemapScore;
      return acc;
    },
    { urls: 0, recommendations: 0, averageSeo: 0, averageSitemap: 0 }
  );

  return NextResponse.json({
    credentials: {
      configured: Boolean(credentials?.googleRefreshTokenEncrypted || credentials?.googleAccessTokenEncrypted),
      googleAccountEmail: credentials?.googleAccountEmail || "",
      googleSearchConsoleProperty: credentials?.googleSearchConsoleProperty || "",
      scopes: credentials?.scopes || "",
      updatedAt: credentials?.updatedAt || null
    },
    summary: {
      sites: sites.length,
      urls: totals.urls,
      recommendations: totals.recommendations,
      seoScore: sites.length ? Math.round(totals.averageSeo / sites.length) : 0,
      sitemapScore: sites.length ? Math.round(totals.averageSitemap / sites.length) : 0
    },
    sites: sites.map(publicSite)
  });
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "seo-intelligence");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const domain = normalizeDomain(body.domain || body.propertyUrl || body.sitemapUrl);
  const sitemapUrl = normalizeSitemapUrl(body.sitemapUrl, domain);
  const name = text(body.name) || domain;

  if (!domain || !sitemapUrl) {
    return NextResponse.json({ error: "Informe dominio e sitemap do cliente." }, { status: 400 });
  }

  const site = await prisma.seoSite.upsert({
    where: { tenantId_domain: { tenantId: session.tenantId, domain } },
    update: {
      name,
      propertyUrl: text(body.propertyUrl),
      sitemapUrl,
      status: "active"
    },
    create: {
      tenantId: session.tenantId,
      name,
      domain,
      propertyUrl: text(body.propertyUrl),
      sitemapUrl
    }
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "seo.site.saved",
    target: site.id,
    metadata: { domain, sitemapUrl }
  });

  return NextResponse.json({ ok: true, site });
}
