import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { ensureTenantServices } from "@/lib/services";
export { createSessionCookieValue, getSessionFromCookies, getSessionFromRequest, SESSION_COOKIE } from "@/lib/session";

const DEFAULT_TENANT_SLUG = "kpg";

export async function ensureDefaultTenantAndUser() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {},
    create: {
      name: process.env.COMPANY_NAME || "KPG Imoveis",
      slug: DEFAULT_TENANT_SLUG,
      settings: {
        create: {
          companyName: process.env.COMPANY_NAME || "KPG Imoveis",
          sigaEndpoint: process.env.SIGA_ENDPOINT || "",
          sigaTokenEncrypted: encryptSecret(process.env.SIGA_TOKEN),
          metaAppId: process.env.META_APP_ID || "",
          metaAppSecretEncrypted: encryptSecret(process.env.META_APP_SECRET),
          instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || "",
          instagramAccessTokenEncrypted: encryptSecret(process.env.INSTAGRAM_ACCESS_TOKEN),
          makeBaseUrl: process.env.MAKE_API_BASE_URL || "",
          makeDataStoreId: process.env.MAKE_DATA_STORE_ID || "",
          makeApiTokenEncrypted: encryptSecret(process.env.MAKE_API_TOKEN),
          whatsappNumber: process.env.WHATSAPP_CTA || ""
        }
      }
    },
    include: { settings: true }
  });

  if (!tenant.settings) {
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        companyName: tenant.name,
        sigaEndpoint: process.env.SIGA_ENDPOINT || "",
        sigaTokenEncrypted: encryptSecret(process.env.SIGA_TOKEN),
        metaAppId: process.env.META_APP_ID || "",
        metaAppSecretEncrypted: encryptSecret(process.env.META_APP_SECRET),
        instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || "",
        instagramAccessTokenEncrypted: encryptSecret(process.env.INSTAGRAM_ACCESS_TOKEN),
        makeBaseUrl: process.env.MAKE_API_BASE_URL || "",
        makeDataStoreId: process.env.MAKE_DATA_STORE_ID || "",
        makeApiTokenEncrypted: encryptSecret(process.env.MAKE_API_TOKEN),
        whatsappNumber: process.env.WHATSAPP_CTA || ""
      }
    });
  } else {
    await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: {
        companyName: tenant.settings.companyName || process.env.COMPANY_NAME || tenant.name,
        sigaEndpoint: tenant.settings.sigaEndpoint || process.env.SIGA_ENDPOINT || "",
        sigaTokenEncrypted:
          tenant.settings.sigaTokenEncrypted || encryptSecret(process.env.SIGA_TOKEN),
        metaAppId: tenant.settings.metaAppId || process.env.META_APP_ID || "",
        metaAppSecretEncrypted:
          tenant.settings.metaAppSecretEncrypted || encryptSecret(process.env.META_APP_SECRET),
        instagramAccountId:
          tenant.settings.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID || "",
        instagramAccessTokenEncrypted:
          tenant.settings.instagramAccessTokenEncrypted || encryptSecret(process.env.INSTAGRAM_ACCESS_TOKEN),
        makeBaseUrl: tenant.settings.makeBaseUrl || process.env.MAKE_API_BASE_URL || "",
        makeDataStoreId: tenant.settings.makeDataStoreId || process.env.MAKE_DATA_STORE_ID || "",
        makeApiTokenEncrypted:
          tenant.settings.makeApiTokenEncrypted || encryptSecret(process.env.MAKE_API_TOKEN),
        whatsappNumber: tenant.settings.whatsappNumber || process.env.WHATSAPP_CTA || ""
      }
    });
  }

  const username = (process.env.DEFAULT_ADMIN_USERNAME || "KPGIMOVEIS").trim().toUpperCase();
  await ensureTenantServices(tenant.id);

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    const user =
      existingUser.isPlatformAdmin && existingUser.role === "owner"
        ? existingUser
        : await prisma.user.update({
            where: { id: existingUser.id },
            data: { isPlatformAdmin: true, role: "owner" }
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
      isPlatformAdmin: true
    }
  });

  return { tenant, user };
}

export async function validateLogin(username: string, password: string) {
  await ensureDefaultTenantAndUser();
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
