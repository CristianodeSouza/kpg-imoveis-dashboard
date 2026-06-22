import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createJob } from "@/lib/jobs";
import { text } from "@/lib/seo";
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

  const job = await createJob({
    tenantId: session.tenantId,
    type: "seo.sitemap.analyze",
    priority: 80,
    maxAttempts: 3,
    payload: { siteId, userId: session.userId, sitemapUrl: site.sitemapUrl, domain: site.domain }
  });

  return NextResponse.json({
    ok: true,
    queued: true,
    jobId: job.id,
    message: "Analise de sitemap enviada para a fila."
  }, { status: 202 });
}
