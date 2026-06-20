import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { text } from "@/lib/seo";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

function parseDate(value: unknown) {
  const clean = text(value);
  if (!clean) return null;
  const date = new Date(clean);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "seo-intelligence");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const current = await prisma.seoCredential.findUnique({ where: { tenantId: session.tenantId } });
  const accessToken = text(body.googleAccessToken);
  const refreshToken = text(body.googleRefreshToken);

  const credentials = await prisma.seoCredential.upsert({
    where: { tenantId: session.tenantId },
    create: {
      tenantId: session.tenantId,
      googleAccountEmail: text(body.googleAccountEmail),
      googleSearchConsoleProperty: text(body.googleSearchConsoleProperty),
      googleAccessTokenEncrypted: encryptSecret(accessToken),
      googleRefreshTokenEncrypted: encryptSecret(refreshToken),
      googleTokenExpiresAt: parseDate(body.googleTokenExpiresAt),
      scopes: text(body.scopes)
    },
    update: {
      googleAccountEmail: text(body.googleAccountEmail) || current?.googleAccountEmail || "",
      googleSearchConsoleProperty: text(body.googleSearchConsoleProperty) || current?.googleSearchConsoleProperty || "",
      ...(accessToken ? { googleAccessTokenEncrypted: encryptSecret(accessToken) } : {}),
      ...(refreshToken ? { googleRefreshTokenEncrypted: encryptSecret(refreshToken) } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "googleTokenExpiresAt") ? { googleTokenExpiresAt: parseDate(body.googleTokenExpiresAt) } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "scopes") ? { scopes: text(body.scopes) } : {})
    }
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "seo.credentials.updated",
    target: credentials.id,
    metadata: {
      googleAccountEmail: credentials.googleAccountEmail,
      googleSearchConsoleProperty: credentials.googleSearchConsoleProperty,
      tokenProvided: Boolean(accessToken || refreshToken)
    }
  });

  return NextResponse.json({
    ok: true,
    credentials: {
      configured: Boolean(credentials.googleAccessTokenEncrypted || credentials.googleRefreshTokenEncrypted),
      googleAccountEmail: credentials.googleAccountEmail,
      googleSearchConsoleProperty: credentials.googleSearchConsoleProperty,
      scopes: credentials.scopes,
      updatedAt: credentials.updatedAt
    }
  });
}
