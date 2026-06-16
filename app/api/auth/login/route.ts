import { NextResponse } from "next/server";

const USERNAME = "KPGIMOVEIS";
const PASSWORD = "cristiano";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim().toUpperCase();
  const password = String(body.password || "");

  if (username !== USERNAME || password !== PASSWORD) {
    return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("kpg_session", "authenticated", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
