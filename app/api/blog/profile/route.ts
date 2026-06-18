import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { getSigaBlogIntegration, readBlogProfile, writeBlogProfile } from "@/lib/blog";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const profile = await readBlogProfile(session.tenantId);
  const integration = await getSigaBlogIntegration(session.tenantId, profile.sigaImobiliariaSlug);
  return NextResponse.json({ profile, integration });
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "blog-automatizado");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const profile = await writeBlogProfile(session.tenantId, body);
  const integration = await getSigaBlogIntegration(session.tenantId, profile.sigaImobiliariaSlug);

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "blog.profile.updated",
    target: profile.id,
    metadata: { changed: Object.keys(body) }
  });

  return NextResponse.json({ ok: true, profile, integration });
}
