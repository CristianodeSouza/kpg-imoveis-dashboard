import { NextResponse } from "next/server";
import { createSessionCookieValue, SESSION_COOKIE } from "@/lib/session";

const DEFAULT_USER = {
  id: "user-kpg-001",
  name: "KPG Imóveis",
  tenantId: "tenant-kpg-001",
  role: "owner",
  isPlatformAdmin: false
};

function configuredCredentials() {
  const username = String(
    process.env.AUTH_USERNAME || process.env.DEFAULT_ADMIN_USERNAME || ""
  ).trim().toUpperCase();
  const password = String(
    process.env.AUTH_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || ""
  );

  if (!username || !password) return null;
  return { username, password };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toUpperCase();
    const password = String(body.password || "");
    const credentials = configuredCredentials();

    if (!credentials) {
      console.error("Login configuration missing: set AUTH_* or DEFAULT_ADMIN_*.");
      return NextResponse.json(
        { error: "Login temporariamente indisponivel: configure as credenciais do servidor." },
        { status: 503 }
      );
    }

    if (username !== credentials.username || password !== credentials.password) {
      return NextResponse.json(
        { error: "Usuario ou senha invalidos." },
        { status: 401 }
      );
    }

    const user = {
      ...DEFAULT_USER,
      id: process.env.AUTH_USER_ID || DEFAULT_USER.id,
      name: process.env.AUTH_USER_NAME || DEFAULT_USER.name,
      tenantId: process.env.AUTH_TENANT_ID || DEFAULT_USER.tenantId,
      isPlatformAdmin: process.env.AUTH_IS_PLATFORM_ADMIN === "true"
    };

    const response = NextResponse.json({ ok: true, user });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: createSessionCookieValue({
        userId: user.id,
        tenantId: user.tenantId
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Falha interna no login." },
      { status: 500 }
    );
  }
}
