import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ensureTenantServices } from "@/lib/services";
export { createSessionCookieValue, getSessionFromCookies, getSessionFromRequest, SESSION_COOKIE } from "@/lib/session";

const DEFAULT_TENANT_SLUG = "kpg";
const PLATFORM_TENANT_SLUG = "csr-tecnologia";

export async function ensureDefaultTenantAndUser() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {},
    create: {
      name: "KPG Imoveis",
      slug: DEFAULT_TENANT_SLUG,
      settings: {
        create: {
          companyName: "KPG Imoveis"
        }
      }
    },
    include: { settings: true }
  });

  if (!tenant.settings) {
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        companyName: tenant.name
      }
    });
  }

  const username = (process.env.DEFAULT_ADMIN_USERNAME || "KPGIMOVEIS").trim().toUpperCase();
  await ensureTenantServices(tenant.id, ["portal", "settings", "instagram-publisher", "mini-crm", "blog-automatizado", "seo-intelligence"]);

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: { isPlatformAdmin: false, role: "owner", tenantId: tenant.id }
    });
    return { tenant, user };
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Administrador",
      username,
      passwordHash: await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || "cristiano", 12),
      role: "owner",
      isPlatformAdmin: false
    }
  });

  return { tenant, user };
}

export async function ensurePlatformTenantAndAdmin() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: PLATFORM_TENANT_SLUG },
    update: { name: "CSR Tecnologia", status: "active" },
    create: {
      name: "CSR Tecnologia",
      slug: PLATFORM_TENANT_SLUG,
      status: "active",
      settings: { create: { companyName: "CSR Tecnologia" } }
    }
  });

  await ensureTenantServices(tenant.id, ["portal", "settings"]);

  const username = (process.env.PLATFORM_ADMIN_USERNAME || "CSRTECNOLOGIA").trim().toUpperCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || "cristiano";
  const existingUser = await prisma.user.findUnique({ where: { username } });

  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        tenantId: tenant.id,
        role: "owner",
        isPlatformAdmin: true
      }
    });
    return { tenant, user };
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Administrador CSR",
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role: "owner",
      isPlatformAdmin: true
    }
  });

  return { tenant, user };
}

export async function validateLogin(username: string, password: string) {
  await ensureDefaultTenantAndUser();
  await ensurePlatformTenantAndAdmin();
  const normalizedUsername = username.trim().toUpperCase();
  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    include: { tenant: true }
  });

  if (!user || user.tenant.status !== "active") return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}
