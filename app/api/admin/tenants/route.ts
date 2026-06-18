import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ensureBaseServices, ensureTenantServices } from "@/lib/services";
import { getInstagramUsage } from "@/lib/publications";

export const dynamic = "force-dynamic";

const PLATFORM_TENANT_SLUG = "csr-tecnologia";
const CLIENT_CODE_PREFIX = "CLI";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function centsFromValue(value: unknown) {
  const text = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const number = Number(text || 0);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function parseDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function nextClientCode() {
  const tenants = await prisma.tenant.findMany({
    where: { clientCode: { startsWith: `${CLIENT_CODE_PREFIX}-` } },
    select: { clientCode: true }
  });
  const max = tenants.reduce((current, tenant) => {
    const number = Number(String(tenant.clientCode || "").replace(`${CLIENT_CODE_PREFIX}-`, ""));
    return Number.isFinite(number) ? Math.max(current, number) : current;
  }, 0);
  return `${CLIENT_CODE_PREFIX}-${String(max + 1).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  const { response } = await requirePlatformAdmin(request);
  if (response) return response;

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: PLATFORM_TENANT_SLUG } },
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true } },
      services: { include: { service: true } },
      settings: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true }
      }
    }
  });
  const services = await ensureBaseServices();

  const usageByTenant = new Map(
    await Promise.all(tenants.map(async (tenant) => [tenant.id, await getInstagramUsage(tenant.id)] as const))
  );

  return NextResponse.json({
    services: services.map((service) => ({
      slug: service.slug,
      name: service.name,
      description: service.description,
      href: service.href,
      status: service.status
    })),
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      clientCode: tenant.clientCode,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      billingStatus: tenant.billingStatus,
      document: tenant.document,
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      monthlyValueCents: tenant.monthlyValueCents,
      acquiredAt: tenant.acquiredAt,
      notes: tenant.notes,
      usersCount: tenant.users.length,
      services: tenant.services.map((item) => ({
        slug: item.service.slug,
        name: item.service.name,
        status: item.status,
        plan: item.plan,
        priceCents: item.priceCents,
        expiresAt: item.expiresAt
      })),
      integrations: {
        siga: Boolean(tenant.settings?.sigaBaseUrl && tenant.settings?.sigaSlug && tenant.settings.sigaTokenEncrypted),
        instagram: Boolean(tenant.settings?.instagramAccountId && tenant.settings.instagramAccessTokenEncrypted),
        whatsapp: Boolean(tenant.settings?.whatsappNumber)
      },
      activityLogs: tenant.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        target: log.target,
        username: log.user?.username,
        createdAt: log.createdAt
      })),
      instagramUsage: usageByTenant.get(tenant.id),
      createdAt: tenant.createdAt
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
      clientCode: await nextClientCode(),
      name,
      slug: slugify(body.slug || name),
      status: "active",
      billingStatus: String(body.billingStatus || "active"),
      document: String(body.document || "").trim(),
      contactName: String(body.contactName || ownerName || "").trim(),
      contactEmail: String(body.contactEmail || "").trim(),
      contactPhone: String(body.contactPhone || "").trim(),
      monthlyValueCents: centsFromValue(body.monthlyValue),
      acquiredAt: parseDate(body.acquiredAt),
      notes: String(body.notes || "").trim(),
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

export async function PATCH(request: Request) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const tenantId = String(body.tenantId || "").trim();
  if (!tenantId) return NextResponse.json({ error: "tenantId obrigatorio." }, { status: 400 });

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: String(body.name || "").trim() || undefined,
      status: String(body.status || "active"),
      billingStatus: String(body.billingStatus || "active"),
      document: String(body.document || "").trim(),
      contactName: String(body.contactName || "").trim(),
      contactEmail: String(body.contactEmail || "").trim(),
      contactPhone: String(body.contactPhone || "").trim(),
      monthlyValueCents: centsFromValue(body.monthlyValue),
      acquiredAt: parseDate(body.acquiredAt),
      notes: String(body.notes || "").trim()
    }
  });

  const services = await ensureBaseServices();
  const bySlug = new Map(services.map((service) => [service.slug, service]));
  const serviceUpdates = Array.isArray(body.services) ? body.services : [];

  for (const update of serviceUpdates) {
    const slug = String(update.slug || "");
    const service = bySlug.get(slug);
    if (!service) continue;
    await prisma.tenantService.upsert({
      where: { tenantId_serviceId: { tenantId, serviceId: service.id } },
      update: {
        status: update.enabled ? "active" : "blocked",
        plan: String(update.plan || "starter"),
        priceCents: centsFromValue(update.price),
        expiresAt: parseDate(update.expiresAt)
      },
      create: {
        tenantId,
        serviceId: service.id,
        status: update.enabled ? "active" : "blocked",
        plan: String(update.plan || "starter"),
        priceCents: centsFromValue(update.price),
        expiresAt: parseDate(update.expiresAt)
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user?.id,
      action: "tenant.updated",
      target: tenantId,
      metadata: { services: serviceUpdates.map((item: any) => ({ slug: item.slug, enabled: item.enabled })) }
    }
  });

  return NextResponse.json({ ok: true, tenant });
}
