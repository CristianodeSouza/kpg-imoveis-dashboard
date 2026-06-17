import type { TenantSettings as DbTenantSettings } from "@prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export type TenantSettings = {
  tenantId: string;
  companyName: string;
  sigaEndpoint: string;
  sigaToken?: string;
  metaAppId: string;
  metaAppSecret?: string;
  instagramAccountId: string;
  instagramAccessToken?: string;
  makeBaseUrl: string;
  makeDataStoreId: string;
  makeApiToken?: string;
  whatsappNumber: string;
  updatedAt?: string;
};

export type PublicTenantSettings = Omit<
  TenantSettings,
  "sigaToken" | "metaAppSecret" | "instagramAccessToken" | "makeBaseUrl" | "makeDataStoreId" | "makeApiToken"
> & {
  sigaTokenConfigured: boolean;
  metaAppSecretConfigured: boolean;
  instagramAccessTokenConfigured: boolean;
  instagramOAuthAvailable: boolean;
};

const text = (value: unknown) => String(value ?? "").trim();
const hasField = (patch: Partial<TenantSettings>, key: keyof TenantSettings) =>
  Object.prototype.hasOwnProperty.call(patch, key);

function mapSettings(settings: DbTenantSettings): TenantSettings {
  return {
    tenantId: settings.tenantId,
    companyName: settings.companyName,
    sigaEndpoint: settings.sigaEndpoint,
    sigaToken: decryptSecret(settings.sigaTokenEncrypted),
    metaAppId: settings.metaAppId,
    metaAppSecret: decryptSecret(settings.metaAppSecretEncrypted),
    instagramAccountId: settings.instagramAccountId,
    instagramAccessToken: decryptSecret(settings.instagramAccessTokenEncrypted),
    makeBaseUrl: settings.makeBaseUrl,
    makeDataStoreId: settings.makeDataStoreId,
    makeApiToken: decryptSecret(settings.makeApiTokenEncrypted),
    whatsappNumber: settings.whatsappNumber,
    updatedAt: settings.updatedAt.toISOString()
  };
}

export async function readTenantSettings(tenantId: string) {
  const resolvedTenantId = text(tenantId);
  if (!resolvedTenantId) throw new Error("tenantId obrigatorio para ler configuracoes do cliente.");
  let settings = await prisma.tenantSettings.findUnique({ where: { tenantId: resolvedTenantId } });

  if (!settings) {
    const tenant = await prisma.tenant.findUnique({ where: { id: resolvedTenantId } });
    settings = await prisma.tenantSettings.create({
      data: {
        tenantId: resolvedTenantId,
        companyName: tenant?.name || "Imobiliaria",
        sigaEndpoint: "",
        metaAppId: "",
        instagramAccountId: "",
        makeBaseUrl: "",
        makeDataStoreId: "",
        whatsappNumber: ""
      }
    });
  }

  return mapSettings(settings);
}

export async function writeTenantSettings(tenantId: string, patch: Partial<TenantSettings>) {
  const current = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  const next = await prisma.tenantSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      companyName: text(patch.companyName) || "Imobiliaria",
      sigaEndpoint: text(patch.sigaEndpoint),
      sigaTokenEncrypted: encryptSecret(patch.sigaToken),
      metaAppId: text(patch.metaAppId),
      metaAppSecretEncrypted: encryptSecret(patch.metaAppSecret),
      instagramAccountId: text(patch.instagramAccountId),
      instagramAccessTokenEncrypted: encryptSecret(patch.instagramAccessToken),
      makeBaseUrl: text(patch.makeBaseUrl),
      makeDataStoreId: text(patch.makeDataStoreId),
      makeApiTokenEncrypted: encryptSecret(patch.makeApiToken),
      whatsappNumber: text(patch.whatsappNumber)
    },
    update: {
      companyName: text(patch.companyName) || current?.companyName || "Imobiliaria",
      ...(hasField(patch, "sigaEndpoint") ? { sigaEndpoint: text(patch.sigaEndpoint) } : {}),
      ...(hasField(patch, "metaAppId") ? { metaAppId: text(patch.metaAppId) } : {}),
      ...(hasField(patch, "instagramAccountId") ? { instagramAccountId: text(patch.instagramAccountId) } : {}),
      ...(hasField(patch, "makeBaseUrl") ? { makeBaseUrl: text(patch.makeBaseUrl) } : {}),
      ...(hasField(patch, "makeDataStoreId") ? { makeDataStoreId: text(patch.makeDataStoreId) } : {}),
      ...(hasField(patch, "whatsappNumber") ? { whatsappNumber: text(patch.whatsappNumber) } : {}),
      ...(text(patch.sigaToken) ? { sigaTokenEncrypted: encryptSecret(patch.sigaToken) } : {}),
      ...(text(patch.metaAppSecret) ? { metaAppSecretEncrypted: encryptSecret(patch.metaAppSecret) } : {}),
      ...(text(patch.instagramAccessToken)
        ? { instagramAccessTokenEncrypted: encryptSecret(patch.instagramAccessToken) }
        : {}),
      ...(text(patch.makeApiToken) ? { makeApiTokenEncrypted: encryptSecret(patch.makeApiToken) } : {})
    }
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name: text(patch.companyName) || current?.companyName || "Imobiliaria" }
  });

  return mapSettings(next);
}

export function publicTenantSettings(settings: TenantSettings): PublicTenantSettings {
  const { sigaToken, metaAppSecret, instagramAccessToken, makeBaseUrl, makeDataStoreId, makeApiToken, ...publicSettings } = settings;
  const hasTenantMetaApp = Boolean(settings.metaAppId && metaAppSecret);
  const hasPlatformMetaApp = Boolean(
    (process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID) && process.env.META_APP_SECRET
  );
  return {
    ...publicSettings,
    sigaTokenConfigured: Boolean(sigaToken),
    metaAppSecretConfigured: Boolean(metaAppSecret),
    instagramAccessTokenConfigured: Boolean(instagramAccessToken),
    instagramOAuthAvailable: hasTenantMetaApp || hasPlatformMetaApp
  };
}
