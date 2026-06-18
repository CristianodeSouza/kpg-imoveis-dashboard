import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { buildBlogPost, buildSigaPayload, readBlogProfile } from "@/lib/blog";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const posts = await prisma.blogPost.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const profile = await readBlogProfile(session.tenantId);
  const generated = buildBlogPost(profile, body);
  const sameSlugFamily = await prisma.blogPost.count({
    where: {
      tenantId: session.tenantId,
      slug: { startsWith: generated.slug }
    }
  });

  const slug = sameSlugFamily ? `${generated.slug}-${sameSlugFamily + 1}` : generated.slug;
  const post = await prisma.blogPost.create({
    data: {
      tenantId: session.tenantId,
      topic: generated.topic,
      intent: generated.intent,
      region: generated.region,
      propertyType: generated.propertyType,
      title: generated.title,
      slug,
      description: generated.description,
      tags: generated.tags,
      html: generated.html,
      editorialStatus: "draft",
      seoScore: generated.seoScore,
      geoScore: generated.geoScore,
      slugScore: generated.slugScore
    }
  });
  const payload = buildSigaPayload(profile, post);
  const saved = await prisma.blogPost.update({
    where: { id: post.id },
    data: { payload }
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "blog.post.generated",
    target: post.id,
    metadata: { slug: post.slug, seoScore: post.seoScore, geoScore: post.geoScore, slugScore: post.slugScore }
  });

  return NextResponse.json({ ok: true, post: saved, payload });
}
