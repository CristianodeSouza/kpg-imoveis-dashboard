import { NextResponse } from "next/server";
import { requireTenantService } from "@/lib/services";
import {
  buildInstagramAuthorizationUrl,
  createInstagramOAuthState,
  getInstagramAppCredentials,
  INSTAGRAM_OAUTH_STATE_COOKIE
} from "@/lib/instagram-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "settings");
  if (response) return response;
  if (!session) return NextResponse.redirect(new URL("/login?next=/app/configuracoes", request.url));

  const credentials = await getInstagramAppCredentials(session.tenantId);
  if (!credentials.appId || !credentials.appSecret) {
    return NextResponse.redirect(
      new URL(
        "/app/configuracoes?instagram=missing_meta_app",
        request.url
      )
    );
  }

  const state = createInstagramOAuthState({ tenantId: session.tenantId, userId: session.userId });
  const redirect = NextResponse.redirect(buildInstagramAuthorizationUrl(credentials.appId, state));
  redirect.cookies.set(INSTAGRAM_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });
  return redirect;
}

