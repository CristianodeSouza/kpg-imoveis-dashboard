import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ensureBaseServices, ensureTenantServices } from "@/lib/services";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function GET(request: Request) {
  const { response } = await requirePlatformAdmin(request);
  if (response) return response;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true } },
      services: { include: { service: true } },
      settings: true
    }
  });
  const services = await ensureBaseServices();
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tenant: true, user: true }
  });

  return NextResponse.json({
    services: services.map((service) => ({
      slug: service.slug,
      name: service.name,
      description: service.description,
      href: service.href
    })),
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      usersCount: tenant.users.length,
      services: tenant.services.map((item) => ({
        slug: item.service.slug,
        name: item.service.name,
        status: item.status,
        plan: item.plan
      })),
      integrations: {
        siga: Boolean(tenant.settings?.sigaEndpoint && tenant.settings.sigaTokenEncrypted),
        instagram: Boolean(tenant.settings?.instagramAccountId && tenant.settings.instagramAccessTokenEncrypted),
        whatsapp: Boolean(tenant.settings?.whatsappNumber)
      },
      createdAt: tenant.createdAt
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      target: log.target,
      tenantName: log.tenant.name,
      username: log.user?.username,
      createdAt: log.createdAt
    }))
  });
}

export async function POST(request: Request) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const ownerName = String(body.ownerName || "Administrador").trim();
  const username = String(body.username || "").trim().toUpperCase();
  const password = String(body.password || "").trim();
  const selectedServices = Array.isArray(body.services) ? body.services.map(String) : [];

  if (!name || !username || !password) {
    return NextResponse.json({ error: "Informe cliente, usuario e senha inicial." }, { status: 400 });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug: slugify(body.slug || name),
      status: "active",
      settings: { create: { companyName: name } },
      users: {
        create: {
          name: ownerName || "Administrador",
          username,
          passwordHash: await bcrypt.hash(password, 12),
          role: "owner"
        }
      }
    }
  });

  await ensureTenantServices(tenant.id, ["portal", "settings", ...selectedServices]);
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user?.id,
      action: "tenant.created",
      target: tenant.id,
      metadata: { services: selectedServices }
    }
  });

  return NextResponse.json({ ok: true, tenant });
}
