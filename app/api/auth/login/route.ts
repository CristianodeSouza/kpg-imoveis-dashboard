import { NextResponse } from "next/server";
import { createSessionCookieValue, SESSION_COOKIE, validateLogin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = await validateLogin(username, password);

  if (!user) {
    return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 });
  }

  await auditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: "auth.login",
    target: user.id
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin
    }
  });
  response.cookies.set(SESSION_COOKIE, createSessionCookieValue({ userId: user.id, tenantId: user.tenantId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
