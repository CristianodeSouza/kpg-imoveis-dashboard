import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { readTenantSettings } from "@/lib/settings";

export type GoogleBusinessCta = "LEARN_MORE" | "CALL" | "BOOK" | "ORDER" | "SHOP" | "SIGN_UP";

type Credentials = {
  accountId: string;
  locationId: string;
};

type PublishPostInput = {
  tenantId: string;
  userId?: string | null;
  propertyCode?: string | number | null;
  accountId?: string;
  locationId?: string;
  summary: string;
  imageUrl: string;
  cta?: GoogleBusinessCta;
  url: string;
};

type UpdatePostInput = {
  tenantId: string;
  postId: string;
  summary?: string;
  imageUrl?: string;
  cta?: GoogleBusinessCta;
  url?: string;
};

type DeletePostInput = {
  tenantId: string;
  postId: string;
};

function normalizeResourceId(value: string, prefix: "accounts" | "locations" | "localPosts") {
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

function requireHttpsUrl(value: string, message: string) {
  const clean = String(value || "").trim();
  if (!/^https?:\/\//i.test(clean)) throw new Error(message);
  return clean;
}

function localPostsBaseUrl(credentials: Credentials) {
  return `https://mybusiness.googleapis.com/v4/accounts/${credentials.accountId}/locations/${credentials.locationId}/localPosts`;
}

export class GoogleBusinessPostService {
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

  async credentials(tenantId: string, input?: { accountId?: string; locationId?: string }): Promise<Credentials> {
    const settings = await readTenantSettings(tenantId);
    const accountId = normalizeResourceId(
      input?.accountId || settings.googleBusinessAccountId || process.env.GOOGLE_BUSINESS_ACCOUNT_ID || "",
      "accounts"
    );
    const locationId = normalizeResourceId(
      input?.locationId || settings.googleBusinessLocationId || process.env.GOOGLE_BUSINESS_LOCATION_ID || "",
      "locations"
    );

    if (!accountId) throw new Error("GOOGLE_BUSINESS_ACCOUNT_ID nao configurado para este cliente.");
    if (!locationId) throw new Error("GOOGLE_BUSINESS_LOCATION_ID nao configurado para este cliente.");
    return { accountId, locationId };
  }

  buildPayload(input: { summary: string; imageUrl: string; cta?: GoogleBusinessCta; url: string }) {
    const summary = String(input.summary || "").trim();
    if (!summary) throw new Error("Texto do Google Meu Negocio nao pode ficar vazio.");

    return {
      languageCode: "pt-BR",
      summary,
      topicType: "STANDARD",
      media: [
        {
          mediaFormat: "PHOTO",
          sourceUrl: requireHttpsUrl(input.imageUrl, "Imagem publica obrigatoria para Google Meu Negocio.")
        }
      ],
      callToAction: {
        actionType: input.cta || "LEARN_MORE",
        url: requireHttpsUrl(input.url, "URL publica obrigatoria para Google Meu Negocio.")
      }
    };
  }

  async createPost(input: PublishPostInput) {
    const credentials = await this.credentials(input.tenantId, input);
    const token = await this.accessToken(input.tenantId);
    const payload = this.buildPayload(input);

    const response = await fetch(localPostsBaseUrl(credentials), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Google Business Profile retornou ${response.status}.`);

    const postId = normalizeResourceId(String(data.name || data.localPostId || ""), "localPosts");
    const status = String(data.state || "LIVE");
    const post = await prisma.googleBusinessPost.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        propertyCode: String(input.propertyCode || ""),
        accountId: credentials.accountId,
        locationId: credentials.locationId,
        postId,
        topicType: "STANDARD",
        summary: payload.summary,
        imageUrl: payload.media[0].sourceUrl,
        ctaType: payload.callToAction.actionType,
        targetUrl: payload.callToAction.url,
        status,
        raw: data as any
      }
    });

    return {
      success: true,
      provider: "google_business_profile" as const,
      postId,
      status,
      url: String(data.searchUrl || ""),
      raw: data,
      historyId: post.id
    };
  }

  async updatePost(input: UpdatePostInput) {
    const existing = await prisma.googleBusinessPost.findFirst({
      where: { tenantId: input.tenantId, postId: normalizeResourceId(input.postId, "localPosts") },
      orderBy: { createdAt: "desc" }
    });
    if (!existing) throw new Error("Post do Google Meu Negocio nao encontrado no historico.");

    const token = await this.accessToken(input.tenantId);
    const payload = this.buildPayload({
      summary: input.summary ?? existing.summary,
      imageUrl: input.imageUrl ?? existing.imageUrl,
      cta: input.cta || (existing.ctaType as GoogleBusinessCta) || "LEARN_MORE",
      url: input.url ?? existing.targetUrl
    });

    const postName = `accounts/${existing.accountId}/locations/${existing.locationId}/localPosts/${existing.postId}`;
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${postName}?updateMask=summary,media,callToAction`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Google Business Profile retornou ${response.status}.`);

    const updated = await prisma.googleBusinessPost.update({
      where: { id: existing.id },
      data: {
        summary: payload.summary,
        imageUrl: payload.media[0].sourceUrl,
        ctaType: payload.callToAction.actionType,
        targetUrl: payload.callToAction.url,
        status: String(data.state || existing.status || "LIVE"),
        raw: data as any
      }
    });

    return {
      success: true,
      provider: "google_business_profile" as const,
      postId: updated.postId,
      status: updated.status,
      raw: data
    };
  }

  async deletePost(input: DeletePostInput) {
    const postId = normalizeResourceId(input.postId, "localPosts");
    const existing = await prisma.googleBusinessPost.findFirst({
      where: { tenantId: input.tenantId, postId },
      orderBy: { createdAt: "desc" }
    });
    if (!existing) throw new Error("Post do Google Meu Negocio nao encontrado no historico.");

    const token = await this.accessToken(input.tenantId);
    const postName = `accounts/${existing.accountId}/locations/${existing.locationId}/localPosts/${existing.postId}`;
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${postName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error?.message || `Google Business Profile retornou ${response.status}.`);
    }

    await prisma.googleBusinessPost.update({
      where: { id: existing.id },
      data: { status: "DELETED" }
    });

    return {
      success: true,
      provider: "google_business_profile" as const,
      postId,
      status: "DELETED"
    };
  }

  async publishLocalPost(input: PublishPostInput) {
    return this.createPost(input);
  }
}

export const googleBusinessPostService = new GoogleBusinessPostService();
export const googleBusinessService = googleBusinessPostService;
