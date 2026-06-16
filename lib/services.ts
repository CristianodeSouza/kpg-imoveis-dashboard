import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

export const serviceCatalog = [
  {
    slug: "portal",
    name: "Portal CSR",
    description: "Central de acesso aos servicos contratados.",
    href: "/portal",
    icon: "layout"
  },
  {
    slug: "instagram-publisher",
    name: "Instagram Publisher SIGA",
    description: "Busca imoveis no SIGA, gera legendas e publica no Instagram.",
    href: "/app/instagram",
    icon: "instagram"
  },
  {
    slug: "mini-crm",
    name: "Mini CRM de Leads",
    description: "Organiza leads imobiliarios por etapa de atendimento.",
    href: "/app/leads",
    icon: "users"
  },
  {
    slug: "settings",
    name: "Configuracoes",
    description: "Credenciais SIGA, Meta, Instagram e WhatsApp do cliente.",
    href: "/app/configuracoes",
    icon: "settings"
  }
];

export async function ensureBaseServices() {
  const services = [];
  for (const item of serviceCatalog) {
    services.push(
      await prisma.service.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
          href: item.href,
          icon: item.icon,
          status: "active"
        },
        create: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          href: item.href,
          icon: item.icon,
          status: "active"
        }
      })
    );
  }
  return services;
}

export async function ensureTenantServices(tenantId: string, slugs = serviceCatalog.map((item) => item.slug)) {
  const services = await ensureBaseServices();
  const selected = services.filter((service) => slugs.includes(service.slug));

  for (const service of selected) {
    await prisma.tenantService.upsert({
      where: { tenantId_serviceId: { tenantId, serviceId: service.id } },
      update: { status: "active" },
      create: {
        tenantId,
        serviceId: service.id,
        status: "active",
        plan: service.slug === "portal" || service.slug === "settings" ? "core" : "starter"
      }
    });
  }
}

export async function getActiveTenantServices(tenantId: string) {
  const now = new Date();
  return prisma.tenantService.findMany({
    where: {
      tenantId,
      status: "active",
      service: { status: "active" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    include: { service: true },
    orderBy: { createdAt: "asc" }
  });
}

export async function tenantHasService(tenantId: string, slug: string) {
  const now = new Date();
  const found = await prisma.tenantService.findFirst({
    where: {
      tenantId,
      status: "active",
      service: { slug, status: "active" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    select: { id: true }
  });
  return Boolean(found);
}

export async function requireTenantService(request: Request, slug: string) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Sessao invalida." }, { status: 401 }) };
  }

  const allowed = await tenantHasService(session.tenantId, slug);
  if (!allowed) {
    return {
      session,
      response: NextResponse.json({ error: "Servico nao contratado ou inativo." }, { status: 403 })
    };
  }

  return { session, response: null };
}
