import crypto from "crypto";
import { readTenantSettings } from "@/lib/settings";

export const INSTAGRAM_OAUTH_STATE_COOKIE = "instagram_oauth_state";

type InstagramOAuthState = {
  tenantId: string;
  userId: string;
  nonce: string;
  exp: number;
};

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
}

function secret() {
  return process.env.SESSION_SECRET || process.env.SETTINGS_ENCRYPTION_KEY || "dev-session-secret-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function instagramRedirectUri() {
  return `${appUrl()}/api/integrations/instagram/callback`;
}

export function createInstagramOAuthState(input: { tenantId: string; userId: string }) {
  const payload: InstagramOAuthState = {
    tenantId: input.tenantId,
    userId: input.userId,
    nonce: crypto.randomBytes(16).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readInstagramOAuthState(value?: string | null) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || sign(body) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstagramOAuthState;
    if (!payload.tenantId || !payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getInstagramAppCredentials(tenantId: string) {
  const settings = await readTenantSettings(tenantId);
  return {
    appId: settings.metaAppId || process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "",
    appSecret: settings.metaAppSecret || process.env.META_APP_SECRET || "",
    source: settings.metaAppId && settings.metaAppSecret ? "tenant" : "platform"
  };
}

export function instagramOAuthScope() {
  return (
    process.env.INSTAGRAM_OAUTH_SCOPE ||
    "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights"
  );
}

export function buildInstagramAuthorizationUrl(appId: string, state: string) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", instagramRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", instagramOAuthScope());
  url.searchParams.set("state", state);
  return url.toString();
}

