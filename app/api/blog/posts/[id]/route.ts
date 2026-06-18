import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { normalizeSlug, scoreGeo, scoreSeo, scoreSlug } from "@/lib/blog";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(request: Request, context: RouteContext) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const { id } = await context.params;
  const current = await prisma.blogPost.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!current) return NextResponse.json({ error: "Post nao encontrado." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const profile = await prisma.blogProfile.findUnique({ where: { tenantId: session.tenantId } });
  const title = text(body.title) || current.title;
  const requestedSlug = normalizeSlug(text(body.slug) || current.slug);
  const slugConflict = await prisma.blogPost.findFirst({
    where: {
      tenantId: session.tenantId,
      slug: requestedSlug,
      id: { not: current.id }
    },
    select: { id: true }
  });
  const slug = slugConflict ? `${requestedSlug}-${Date.now().toString().slice(-5)}` : requestedSlug;
  const description = text(body.description) || current.description;
  const tags = text(body.tags) || current.tags;
  const html = text(body.html) || current.html;
  const keyword = current.topic || title;
  const seoScore = scoreSeo({ title, slug, description, tags, html }, keyword);
  const geoScore = scoreGeo({ title, slug, description, html }, { companyName: profile?.companyName, city: profile?.city, region: current.region });
  const slugScore = scoreSlug(slug, {
    city: profile?.city,
    region: current.region,
    intent: current.intent,
    propertyType: current.propertyType
  });

  const updated = await prisma.blogPost.update({
    where: { id: current.id },
    data: {
      title,
      slug,
      description,
      tags,
      html,
      seoScore,
      geoScore,
      slugScore,
      editorialStatus: "reviewed",
      sigaStatus: current.sigaStatus === "sent" ? "sent" : "not_sent"
    }
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "blog.post.updated",
    target: current.id,
    metadata: { slug, seoScore, geoScore, slugScore }
  });

  return NextResponse.json({ ok: true, post: updated });
}
