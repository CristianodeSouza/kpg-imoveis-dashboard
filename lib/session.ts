import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "siga_saas_session";

export type SessionPayload = {
  userId: string;
  tenantId: string;
  exp: number;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function sessionSecret() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET obrigatoria em producao.");
  }
  return process.env.SESSION_SECRET || process.env.SETTINGS_ENCRYPTION_KEY || "dev-session-secret-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function parseCookieHeader(header: string | null, name: string) {
  return (header || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function createSessionCookieValue(payload: Omit<SessionPayload, "exp">) {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionCookieValue(value?: string | null): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || sign(body) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.tenantId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request) {
  return readSessionCookieValue(parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE));
}

export async function getSessionFromCookies() {
  const store = await cookies();
  return readSessionCookieValue(store.get(SESSION_COOKIE)?.value);
}
