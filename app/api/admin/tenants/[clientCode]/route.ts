import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { ensureBaseServices } from "@/lib/services";
import { publicTenantSettings, readTenantSettings, writeTenantSettings } from "@/lib/settings";
import { getInstagramUsage, listInstagramPublications, publicationTitleFromCaption } from "@/lib/publications";
import { getTenantPaymentOverview } from "@/lib/payments";

export const dynamic = "force-dynamic";

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

function requiredText(value: unknown) {
  return String(value ?? "").trim();
}

async function loadTenant(clientCode: string) {
  return prisma.tenant.findFirst({
    where: { AND: [{ clientCode }, { clientCode: { not: "PLATFORM" } }] },
    include: {
      users: { select: { id: true, name: true, username: true, role: true, createdAt: true } },
      services: { include: { service: true }, orderBy: { createdAt: "asc" } },
      settings: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: true }
      }
    }
  });
}

async function serializeTenant(tenant: NonNullable<Awaited<ReturnType<typeof loadTenant>>>) {
  const [settings, instagramUsage, publicationLogs, payments] = await Promise.all([
    readTenantSettings(tenant.id),
    getInstagramUsage(tenant.id),
    listInstagramPublications(tenant.id, 80),
    getTenantPaymentOverview(tenant.id)
  ]);
  return {
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
    users: tenant.users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    })),
    services: tenant.services.map((item) => ({
      slug: item.service.slug,
      name: item.service.name,
      status: item.status,
      plan: item.plan,
      priceCents: item.priceCents,
      expiresAt: item.expiresAt
    })),
    integrations: {
      siga: Boolean(tenant.settings?.sigaEndpoint && tenant.settings.sigaTokenEncrypted),
      instagram: Boolean(tenant.settings?.instagramAccountId && tenant.settings.instagramAccessTokenEncrypted),
      whatsapp: Boolean(tenant.settings?.whatsappNumber)
    },
    settings: publicTenantSettings(settings),
    paymentSummary: payments.summary,
    paymentRecords: payments.payments,
    instagramUsage,
    publicationLogs: publicationLogs.map((item) => ({
      id: item.id,
      title: publicationTitleFromCaption(item.caption, item.mediaType),
      propertyCode: item.propertyCode,
      caption: item.caption,
      instagramPostId: item.instagramPostId,
      instagramUrl: item.instagramUrl,
      mediaType: item.mediaType,
      photosCount: item.photosCount,
      status: item.status,
      createdAt: item.createdAt,
      cycleStart: item.cycleStart,
      cycleEnd: item.cycleEnd
    })),
    activityLogs: tenant.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      target: log.target,
      username: log.user?.username,
      createdAt: log.createdAt
    })),
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt
  };
}

export async function GET(request: Request, context: { params: Promise<{ clientCode: string }> }) {
  const { response } = await requirePlatformAdmin(request);
  if (response) return response;

  const { clientCode } = await context.params;
  const tenant = await loadTenant(String(clientCode || "").toUpperCase());
  if (!tenant) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });

  const services = await ensureBaseServices();
  return NextResponse.json({
    tenant: await serializeTenant(tenant),
    services: services
      .filter((service) => !["portal", "settings"].includes(service.slug))
      .map((service) => ({
        slug: service.slug,
        name: service.name,
        description: service.description,
        status: service.status
      }))
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ clientCode: string }> }) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;

  const { clientCode } = await context.params;
  const existing = await loadTenant(String(clientCode || "").toUpperCase());
  if (!existing) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (body.settings) {
    const currentSettings = await readTenantSettings(existing.id);
    const missingFields = [
      ["Nome da empresa", requiredText(body.settings.companyName)],
      ["Endpoint CRM SIGA", requiredText(body.settings.sigaEndpoint)],
      ["Token CRM SIGA", requiredText(body.settings.sigaToken) || currentSettings.sigaToken],
      ["Instagram Account ID", requiredText(body.settings.instagramAccountId)],
      ["Instagram Access Token", requiredText(body.settings.instagramAccessToken) || currentSettings.instagramAccessToken]
    ]
      .filter(([, value]) => !value)
      .map(([label]) => label);

    if (missingFields.length) {
      return NextResponse.json(
        { error: `Preencha os campos obrigatorios: ${missingFields.join(", ")}.` },
        { status: 400 }
      );
    }

    await writeTenantSettings(existing.id, {
      companyName: body.settings.companyName,
      sigaEndpoint: body.settings.sigaEndpoint,
      sigaToken: body.settings.sigaToken,
      metaAppId: body.settings.metaAppId,
      metaAppSecret: body.settings.metaAppSecret,
      instagramAccountId: body.settings.instagramAccountId,
      instagramAccessToken: body.settings.instagramAccessToken,
      whatsappNumber: body.settings.whatsappNumber
    });
  }

  await prisma.tenant.update({
    where: { id: existing.id },
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
    const service = bySlug.get(String(update.slug || ""));
    if (!service) continue;
    await prisma.tenantService.upsert({
      where: { tenantId_serviceId: { tenantId: existing.id, serviceId: service.id } },
      update: {
        status: update.enabled ? "active" : "blocked",
        plan: String(update.plan || "starter"),
        priceCents: centsFromValue(update.price),
        expiresAt: parseDate(update.expiresAt)
      },
      create: {
        tenantId: existing.id,
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
      tenantId: existing.id,
      userId: user?.id,
      action: "tenant.detail.updated",
      target: existing.id,
      metadata: {
        services: serviceUpdates.map((item: any) => ({ slug: item.slug, enabled: item.enabled })),
        settingsChanged: Boolean(body.settings)
      }
    }
  });

  const tenant = await loadTenant(existing.clientCode || "");
  return NextResponse.json({ ok: true, tenant: tenant ? await serializeTenant(tenant) : null });
}
