import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  getInstagramAppCredentials,
  instagramRedirectUri,
  INSTAGRAM_OAUTH_STATE_COOKIE,
  readInstagramOAuthState
} from "@/lib/instagram-oauth";
import { writeTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function redirectToConfig(request: Request, status: string) {
  return new URL(`/app/configuracoes?instagram=${encodeURIComponent(status)}`, request.url);
}

async function exchangeCodeForToken(input: { code: string; appId: string; appSecret: string }) {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: input.appId,
      client_secret: input.appSecret,
      grant_type: "authorization_code",
      redirect_uri: instagramRedirectUri(),
      code: input.code
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_message || data?.error?.message || "Falha ao conectar Instagram.");
  }
  return {
    accessToken: String(data.access_token || ""),
    userId: String(data.user_id || "")
  };
}

async function exchangeForLongLivedToken(accessToken: string, appSecret: string) {
  if (!accessToken) return "";
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) return accessToken;
  return String(data.access_token || accessToken);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "");
  const returnedState = String(url.searchParams.get("state") || "");
  const cookieHeader = request.headers.get("cookie") || "";
  const stateCookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${INSTAGRAM_OAUTH_STATE_COOKIE}=`))
    ?.slice(INSTAGRAM_OAUTH_STATE_COOKIE.length + 1);
  const storedState = readInstagramOAuthState(stateCookie);

  const response = NextResponse.redirect(redirectToConfig(request, "connected"));
  response.cookies.delete(INSTAGRAM_OAUTH_STATE_COOKIE);

  try {
    if (!code) throw new Error("Codigo de autorizacao ausente.");
    if (!storedState || !returnedState || returnedState !== stateCookie) {
      throw new Error("Sessao de conexao expirada. Tente conectar novamente.");
    }

    const credentials = await getInstagramAppCredentials(storedState.tenantId);
    if (!credentials.appId || !credentials.appSecret) {
      throw new Error("Meta App ID/Secret nao configurados.");
    }

    const shortToken = await exchangeCodeForToken({ code, appId: credentials.appId, appSecret: credentials.appSecret });
    const accessToken = await exchangeForLongLivedToken(shortToken.accessToken, credentials.appSecret);
    if (!accessToken || !shortToken.userId) throw new Error("A Meta nao retornou token ou conta Instagram.");

    await writeTenantSettings(storedState.tenantId, {
      metaAppId: credentials.appId,
      instagramAccountId: shortToken.userId,
      instagramAccessToken: accessToken
    });

    await auditLog({
      tenantId: storedState.tenantId,
      userId: storedState.userId,
      action: "instagram.oauth.connected",
      target: shortToken.userId,
      metadata: { source: credentials.source }
    });

    return response;
  } catch (error) {
    const failure = NextResponse.redirect(
      redirectToConfig(request, error instanceof Error ? `error:${error.message}` : "error")
    );
    failure.cookies.delete(INSTAGRAM_OAUTH_STATE_COOKIE);
    return failure;
  }
}

