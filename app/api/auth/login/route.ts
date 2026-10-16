import { NextResponse } from "next/server";

const SESSION_COOKIE = "session";

const USERS = {
  "KPGIMOVEIS": {
    password: "cristiano",
    id: "user-kpg-001",
    name: "KPG Imóveis",
    tenantId: "tenant-kpg-001",
    role: "owner",
    isPlatformAdmin: false
  },
  "CANDURINHA": {
    password: "admin123",
    id: "user-admin-001",
    name: "Admin CSR",
    tenantId: "tenant-csr-001",
    role: "owner",
    isPlatformAdmin: true
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toUpperCase();
    const password = String(body.password || "");

    console.log(`🔐 Login: ${username}`);

    const userData: any = USERS[username as keyof typeof USERS];

    if (!userData || userData.password !== password) {
      console.log(`❌ Fail: ${username}`);
      return NextResponse.json(
        { error: "Usuario ou senha invalidos." },
        { status: 401 }
      );
    }

    const user = {
      id: userData.id,
      name: userData.name,
      role: userData.role,
      tenantId: userData.tenantId,
      isPlatformAdmin: userData.isPlatformAdmin
    };

    console.log(`✅ Success: ${username}`);

    const response = NextResponse.json({
      ok: true,
      user: user
    });

    // Cookie simples sem usar createSessionCookieValue
    const sessionData = JSON.stringify({
      userId: user.id,
      tenantId: user.tenantId
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionData,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return response;
  } catch (error: any) {
    console.error(`❌ Error: ${error?.message || error}`);
    return NextResponse.json(
      { error: "Falha interna no login." },
      { status: 500 }
    );
  }
}
