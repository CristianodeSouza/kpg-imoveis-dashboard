import type { TenantSettings as DbTenantSettings } from "@prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export type TenantSettings = {
  tenantId: string;
  companyName: string;
  sigaBaseUrl: string;
  sigaSlug: string;
  sigaEndpoint: string;
  sigaToken?: string;
  metaAppId: string;
  metaAppSecret?: string;
  instagramAccountId: string;
  instagramAccessToken?: string;
  makeBaseUrl: string;
  makeDataStoreId: string;
  makeApiToken?: string;
  leadSource: string;
  googleSheetsSpreadsheetId: string;
  googleSheetsSheetName: string;
  googleBusinessClientId: string;
  googleBusinessClientSecret?: string;
  googleBusinessAccountId: string;
  googleBusinessLocationId: string;
  googleBusinessRefreshToken?: string;
  googleBusinessAccessToken?: string;
  googleBusinessTokenExpiresAt?: string | null;
  whatsappNumber: string;
  updatedAt?: string;
};

export type PublicTenantSettings = Omit<
  TenantSettings,
  | "sigaToken"
  | "metaAppSecret"
  | "instagramAccessToken"
  | "makeBaseUrl"
  | "makeDataStoreId"
  | "makeApiToken"
  | "googleBusinessClientSecret"
  | "googleBusinessRefreshToken"
  | "googleBusinessAccessToken"
> & {
  sigaTokenConfigured: boolean;
  metaAppSecretConfigured: boolean;
  instagramAccessTokenConfigured: boolean;
  instagramOAuthAvailable: boolean;
  googleBusinessTokenConfigured: boolean;
  googleBusinessOAuthConfigured: boolean;
};

const text = (value: unknown) => String(value ?? "").trim();
const hasField = (patch: Partial<TenantSettings>, key: keyof TenantSettings) =>
  Object.prototype.hasOwnProperty.call(patch, key);

function mapSettings(settings: DbTenantSettings): TenantSettings {
  return {
    tenantId: settings.tenantId,
    companyName: settings.companyName,
    sigaBaseUrl: settings.sigaBaseUrl,
    sigaSlug: settings.sigaSlug,
    sigaEndpoint: settings.sigaEndpoint,
    sigaToken: decryptSecret(settings.sigaTokenEncrypted),
    metaAppId: settings.metaAppId,
    metaAppSecret: decryptSecret(settings.metaAppSecretEncrypted),
    instagramAccountId: settings.instagramAccountId,
    instagramAccessToken: decryptSecret(settings.instagramAccessTokenEncrypted),
    makeBaseUrl: settings.makeBaseUrl,
    makeDataStoreId: settings.makeDataStoreId,
    makeApiToken: decryptSecret(settings.makeApiTokenEncrypted),
    leadSource: settings.leadSource,
    googleSheetsSpreadsheetId: settings.googleSheetsSpreadsheetId,
    googleSheetsSheetName: settings.googleSheetsSheetName,
    googleBusinessClientId: settings.googleBusinessClientId,
    googleBusinessClientSecret: decryptSecret(settings.googleBusinessClientSecretEncrypted),
    googleBusinessAccountId: settings.googleBusinessAccountId,
    googleBusinessLocationId: settings.googleBusinessLocationId,
    googleBusinessRefreshToken: decryptSecret(settings.googleBusinessRefreshTokenEncrypted),
    googleBusinessAccessToken: decryptSecret(settings.googleBusinessAccessTokenEncrypted),
    googleBusinessTokenExpiresAt: settings.googleBusinessTokenExpiresAt?.toISOString() || null,
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
        sigaBaseUrl: "https://api.sigacrm.com.br",
        sigaSlug: tenant?.slug || "",
        sigaEndpoint: "",
        metaAppId: "",
        instagramAccountId: "",
        makeBaseUrl: "",
        makeDataStoreId: "",
        leadSource: "MAKE",
        googleSheetsSpreadsheetId: "",
        googleSheetsSheetName: "atendimento",
        googleBusinessClientId: "",
        googleBusinessAccountId: "",
        googleBusinessLocationId: "",
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
      sigaBaseUrl: text(patch.sigaBaseUrl) || "https://api.sigacrm.com.br",
      sigaSlug: text(patch.sigaSlug),
      sigaEndpoint: text(patch.sigaEndpoint),
      sigaTokenEncrypted: encryptSecret(patch.sigaToken),
      metaAppId: text(patch.metaAppId),
      metaAppSecretEncrypted: encryptSecret(patch.metaAppSecret),
      instagramAccountId: text(patch.instagramAccountId),
      instagramAccessTokenEncrypted: encryptSecret(patch.instagramAccessToken),
      makeBaseUrl: text(patch.makeBaseUrl),
      makeDataStoreId: text(patch.makeDataStoreId),
      makeApiTokenEncrypted: encryptSecret(patch.makeApiToken),
      leadSource: text(patch.leadSource).toUpperCase() || "MAKE",
      googleSheetsSpreadsheetId: text(patch.googleSheetsSpreadsheetId),
      googleSheetsSheetName: text(patch.googleSheetsSheetName) || "atendimento",
      googleBusinessClientId: text(patch.googleBusinessClientId),
      googleBusinessClientSecretEncrypted: encryptSecret(patch.googleBusinessClientSecret),
      googleBusinessAccountId: text(patch.googleBusinessAccountId),
      googleBusinessLocationId: text(patch.googleBusinessLocationId),
      googleBusinessRefreshTokenEncrypted: encryptSecret(patch.googleBusinessRefreshToken),
      googleBusinessAccessTokenEncrypted: encryptSecret(patch.googleBusinessAccessToken),
      googleBusinessTokenExpiresAt: patch.googleBusinessTokenExpiresAt ? new Date(patch.googleBusinessTokenExpiresAt) : null,
      encryptionKeyVersion: Number(process.env.SETTINGS_ENCRYPTION_KEY_VERSION || 1),
      whatsappNumber: text(patch.whatsappNumber)
    },
    update: {
      companyName: text(patch.companyName) || current?.companyName || "Imobiliaria",
      ...(hasField(patch, "sigaBaseUrl") ? { sigaBaseUrl: text(patch.sigaBaseUrl) || "https://api.sigacrm.com.br" } : {}),
      ...(hasField(patch, "sigaSlug") ? { sigaSlug: text(patch.sigaSlug).toLowerCase() } : {}),
      ...(hasField(patch, "sigaEndpoint") ? { sigaEndpoint: text(patch.sigaEndpoint) } : {}),
      ...(hasField(patch, "metaAppId") ? { metaAppId: text(patch.metaAppId) } : {}),
      ...(hasField(patch, "instagramAccountId") ? { instagramAccountId: text(patch.instagramAccountId) } : {}),
      ...(hasField(patch, "makeBaseUrl") ? { makeBaseUrl: text(patch.makeBaseUrl) } : {}),
      ...(hasField(patch, "makeDataStoreId") ? { makeDataStoreId: text(patch.makeDataStoreId) } : {}),
      ...(hasField(patch, "leadSource") ? { leadSource: text(patch.leadSource).toUpperCase() || "MAKE" } : {}),
      ...(hasField(patch, "googleSheetsSpreadsheetId") ? { googleSheetsSpreadsheetId: text(patch.googleSheetsSpreadsheetId) } : {}),
      ...(hasField(patch, "googleSheetsSheetName") ? { googleSheetsSheetName: text(patch.googleSheetsSheetName) || "atendimento" } : {}),
      ...(hasField(patch, "googleBusinessClientId") ? { googleBusinessClientId: text(patch.googleBusinessClientId) } : {}),
      ...(hasField(patch, "googleBusinessAccountId") ? { googleBusinessAccountId: text(patch.googleBusinessAccountId) } : {}),
      ...(hasField(patch, "googleBusinessLocationId") ? { googleBusinessLocationId: text(patch.googleBusinessLocationId) } : {}),
      ...(hasField(patch, "googleBusinessTokenExpiresAt")
        ? { googleBusinessTokenExpiresAt: patch.googleBusinessTokenExpiresAt ? new Date(patch.googleBusinessTokenExpiresAt) : null }
        : {}),
      ...(hasField(patch, "whatsappNumber") ? { whatsappNumber: text(patch.whatsappNumber) } : {}),
      ...(text(patch.sigaToken) ? { sigaTokenEncrypted: encryptSecret(patch.sigaToken) } : {}),
      ...(text(patch.metaAppSecret) ? { metaAppSecretEncrypted: encryptSecret(patch.metaAppSecret) } : {}),
      ...(text(patch.instagramAccessToken)
        ? { instagramAccessTokenEncrypted: encryptSecret(patch.instagramAccessToken) }
        : {}),
      ...(text(patch.makeApiToken) ? { makeApiTokenEncrypted: encryptSecret(patch.makeApiToken) } : {}),
      ...(text(patch.googleBusinessClientSecret)
        ? { googleBusinessClientSecretEncrypted: encryptSecret(patch.googleBusinessClientSecret) }
        : {}),
      ...(text(patch.googleBusinessRefreshToken)
        ? { googleBusinessRefreshTokenEncrypted: encryptSecret(patch.googleBusinessRefreshToken) }
        : {}),
      ...(text(patch.googleBusinessAccessToken)
        ? { googleBusinessAccessTokenEncrypted: encryptSecret(patch.googleBusinessAccessToken) }
        : {}),
      encryptionKeyVersion: Number(process.env.SETTINGS_ENCRYPTION_KEY_VERSION || current?.encryptionKeyVersion || 1)
    }
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { name: text(patch.companyName) || current?.companyName || "Imobiliaria" }
  });

  return mapSettings(next);
}

export function publicTenantSettings(settings: TenantSettings): PublicTenantSettings {
  const {
    sigaToken,
    metaAppSecret,
    instagramAccessToken,
    makeBaseUrl,
    makeDataStoreId,
    makeApiToken,
    googleBusinessClientSecret,
    googleBusinessRefreshToken,
    googleBusinessAccessToken,
    ...publicSettings
  } = settings;
  const hasTenantMetaApp = Boolean(settings.metaAppId && metaAppSecret);
  const hasPlatformMetaApp = Boolean(
    (process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID) && process.env.META_APP_SECRET
  );
  return {
    ...publicSettings,
    sigaTokenConfigured: Boolean(sigaToken),
    metaAppSecretConfigured: Boolean(metaAppSecret),
    instagramAccessTokenConfigured: Boolean(instagramAccessToken),
    instagramOAuthAvailable: hasTenantMetaApp || hasPlatformMetaApp,
    googleBusinessTokenConfigured: Boolean(googleBusinessRefreshToken || googleBusinessAccessToken),
    googleBusinessOAuthConfigured: Boolean(settings.googleBusinessClientId && googleBusinessClientSecret)
  };
}
