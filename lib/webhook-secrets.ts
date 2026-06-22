import crypto from "crypto";
import { prisma } from "@/lib/db";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateWebhookToken() {
  return `kpg_wh_${crypto.randomBytes(32).toString("base64url")}`;
}

export async function createTenantWebhookSecret(tenantId: string, name = "default") {
  const token = generateWebhookToken();
  const secret = await prisma.tenantWebhookSecret.create({
    data: {
      tenantId,
      name,
      tokenHash: hashToken(token),
      tokenPreview: `${token.slice(0, 10)}...${token.slice(-6)}`
    }
  });
  return { secret, token };
}

export async function verifyTenantWebhookSecret(tenantId: string, token: string) {
  const tokenHash = hashToken(String(token || ""));
  const secret = await prisma.tenantWebhookSecret.findFirst({
    where: { tenantId, tokenHash, status: "active" }
  });
  if (!secret) return false;
  await prisma.tenantWebhookSecret.update({
    where: { id: secret.id },
    data: { lastUsedAt: new Date() }
  });
  return true;
}

export async function revokeTenantWebhookSecret(tenantId: string, id: string) {
  return prisma.tenantWebhookSecret.updateMany({
    where: { id, tenantId, status: "active" },
    data: { status: "revoked", revokedAt: new Date() }
  });
}
