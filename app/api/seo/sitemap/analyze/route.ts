import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { aggregateSitemapScore, buildSitemapRecommendations, parseSitemapXml, qualityForUrl, text } from "@/lib/seo";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "seo-intelligence");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const siteId = text(body.siteId);
  if (!siteId) return NextResponse.json({ error: "siteId obrigatorio." }, { status: 400 });

  const site = await prisma.seoSite.findFirst({ where: { id: siteId, tenantId: session.tenantId } });
  if (!site) return NextResponse.json({ error: "Site nao encontrado para este cliente." }, { status: 404 });

  const sitemapResponse = await fetch(site.sitemapUrl, {
    headers: { Accept: "application/xml,text/xml,*/*" },
    cache: "no-store"
  }).catch((error) => {
    throw new Error(`Nao foi possivel acessar o sitemap: ${error instanceof Error ? error.message : "erro de rede"}`);
  });

  if (!sitemapResponse.ok) {
    return NextResponse.json({ error: `Sitemap retornou HTTP ${sitemapResponse.status}.` }, { status: 400 });
  }

  const xml = await sitemapResponse.text();
  const parsed = parseSitemapXml(xml);
  if (!parsed.length) {
    return NextResponse.json({ error: "Nenhuma URL encontrada no sitemap informado." }, { status: 400 });
  }

  const seen = new Set<string>();
  let duplicateCount = 0;
  let missingLocation = 0;
  let oldUrls = 0;
  let shortSlugs = 0;
  let withoutImages = 0;

  for (const item of parsed) {
    if (seen.has(item.url)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(item.url);
    const quality = qualityForUrl(item);
    if (quality.issues.includes("URL sem localidade clara")) missingLocation += 1;
    if (quality.issues.includes("URL sem atualizacao recente")) oldUrls += 1;
    if (quality.issues.includes("Slug curto para SEO")) shortSlugs += 1;
    if (quality.issues.includes("Sem imagem declarada no sitemap")) withoutImages += 1;

    await prisma.seoSitemapUrl.upsert({
      where: { siteId_url: { siteId: site.id, url: item.url } },
      update: {
        tenantId: session.tenantId,
        lastmod: item.lastmod || null,
        changefreq: item.changefreq || "",
        priority: item.priority || "",
        status: quality.status,
        qualityScore: quality.score,
        issues: quality.issues,
        metadata: item.metadata,
        lastSeenAt: new Date()
      },
      create: {
        tenantId: session.tenantId,
        siteId: site.id,
        url: item.url,
        lastmod: item.lastmod || null,
        changefreq: item.changefreq || "",
        priority: item.priority || "",
        status: quality.status,
        qualityScore: quality.score,
        issues: quality.issues,
        metadata: item.metadata
      }
    });
  }

  const sitemapUrls = await prisma.seoSitemapUrl.findMany({ where: { siteId: site.id, tenantId: session.tenantId } });
  const sitemapScore = aggregateSitemapScore(sitemapUrls);
  const indexationScore = sitemapUrls.length ? Math.round((sitemapUrls.filter((item) => item.status !== "error").length / sitemapUrls.length) * 100) : 0;
  const geoScore = sitemapUrls.length ? Math.round(((sitemapUrls.length - missingLocation) / sitemapUrls.length) * 100) : 0;
  const seoScore = Math.round((sitemapScore + indexationScore + geoScore) / 3);

  await prisma.seoRecommendation.deleteMany({
    where: { tenantId: session.tenantId, siteId: site.id, source: { in: ["sitemap", "geo", "seo", "content"] } }
  });

  const recommendations = buildSitemapRecommendations({
    tenantId: session.tenantId,
    siteId: site.id,
    total: parsed.length,
    duplicateCount,
    missingLocation,
    oldUrls,
    shortSlugs,
    withoutImages
  });
  if (recommendations.length) await prisma.seoRecommendation.createMany({ data: recommendations });

  const updatedSite = await prisma.seoSite.update({
    where: { id: site.id },
    data: {
      sitemapScore,
      indexationScore,
      geoScore,
      seoScore,
      lastSitemapCheckAt: new Date()
    }
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "seo.sitemap.analyzed",
    target: site.id,
    metadata: { total: parsed.length, unique: seen.size, duplicateCount, sitemapScore }
  });

  return NextResponse.json({
    ok: true,
    site: updatedSite,
    result: {
      total: parsed.length,
      unique: seen.size,
      duplicateCount,
      missingLocation,
      oldUrls,
      shortSlugs,
      withoutImages,
      sitemapScore,
      indexationScore,
      geoScore,
      seoScore
    }
  });
}
