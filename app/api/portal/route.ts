import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveTenantServices } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true }
  });
  if (!user || user.tenantId !== session.tenantId || user.tenant.status !== "active") {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const services = await getActiveTenantServices(session.tenantId);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin
    },
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      status: user.tenant.status
    },
    services: services.map((item) => ({
      slug: item.service.slug,
      name: item.service.name,
      description: item.service.description,
      href: item.service.href,
      icon: item.service.icon,
      plan: item.plan,
      status: item.status
    }))
  });
}
