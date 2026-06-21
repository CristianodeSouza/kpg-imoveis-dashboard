import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { readTenantSettings } from "@/lib/settings";

export type GoogleBusinessCta = "LEARN_MORE" | "CALL" | "BOOK" | "ORDER" | "SHOP" | "SIGN_UP";

type PublishInput = {
  tenantId: string;
  locationId?: string;
  summary: string;
  imageUrl: string;
  cta?: GoogleBusinessCta;
  url: string;
};

function normalizeResourceId(value: string, prefix: "accounts" | "locations") {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.startsWith(`${prefix}/`) ? clean.split("/").pop() || "" : clean;
}

function googleClientCredentials() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_BUSINESS_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_BUSINESS_CLIENT_SECRET || ""
  };
}

export class GoogleBusinessService {
  async accessToken(tenantId: string) {
    const settings = await readTenantSettings(tenantId);
    const expiresAt = settings.googleBusinessTokenExpiresAt ? new Date(settings.googleBusinessTokenExpiresAt) : null;
    if (settings.googleBusinessAccessToken && expiresAt && expiresAt.getTime() > Date.now() + 60000) {
      return settings.googleBusinessAccessToken;
    }

    const refreshToken = settings.googleBusinessRefreshToken || process.env.GOOGLE_REFRESH_TOKEN || "";
    const { clientId, clientSecret } = googleClientCredentials();
    if (!refreshToken) throw new Error("Google Business Refresh Token nao configurado para este cliente.");
    if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nao configurados na plataforma.");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error_description || data?.error || "Falha ao renovar token Google Business.");

    const token = String(data.access_token || "");
    const tokenExpiresAt = new Date(Date.now() + Number(data.expires_in || 3600) * 1000);
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        googleBusinessAccessTokenEncrypted: encryptSecret(token),
        googleBusinessTokenExpiresAt: tokenExpiresAt
      }
    });
    return token;
  }

  async publishLocalPost(input: PublishInput) {
    const settings = await readTenantSettings(input.tenantId);
    const summary = String(input.summary || "").trim();
    const imageUrl = String(input.imageUrl || "").trim();
    const url = String(input.url || "").trim();
    const accountId = normalizeResourceId(settings.googleBusinessAccountId || process.env.GOOGLE_BUSINESS_ACCOUNT_ID || "", "accounts");
    const locationId = normalizeResourceId(
      input.locationId || settings.googleBusinessLocationId || process.env.GOOGLE_BUSINESS_LOCATION_ID || "",
      "locations"
    );

    if (!summary) throw new Error("Texto do Google Meu Negocio nao pode ficar vazio.");
    if (!/^https?:\/\//i.test(imageUrl)) throw new Error("Imagem publica obrigatoria para Google Meu Negocio.");
    if (!/^https?:\/\//i.test(url)) throw new Error("URL publica do imovel obrigatoria para Google Meu Negocio.");
    if (!locationId) throw new Error("GOOGLE_BUSINESS_LOCATION_ID nao configurado para este cliente.");
    if (!accountId) throw new Error("GOOGLE_BUSINESS_ACCOUNT_ID nao configurado para este cliente.");

    const token = await this.accessToken(input.tenantId);
    const parent = `accounts/${accountId}/locations/${locationId}`;
    const payload = {
      languageCode: "pt-BR",
      summary,
      callToAction: {
        actionType: input.cta || "LEARN_MORE",
        url
      },
      media: [
        {
          mediaFormat: "PHOTO",
          sourceUrl: imageUrl
        }
      ],
      topicType: "STANDARD"
    };

    const response = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Google Business Profile retornou ${response.status}.`);
    }

    return {
      success: true,
      provider: "google_business_profile" as const,
      postId: String(data.name || data.localPostId || ""),
      url: String(data.searchUrl || ""),
      raw: data
    };
  }
}

export const googleBusinessService = new GoogleBusinessService();
