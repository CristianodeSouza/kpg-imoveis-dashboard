import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { createTenantWebhookSecret, revokeTenantWebhookSecret } from "@/lib/webhook-secrets";

export const dynamic = "force-dynamic";

async function tenantByCode(clientCode: string) {
  return prisma.tenant.findFirst({ where: { clientCode } });
}

export async function POST(request: Request, context: { params: Promise<{ clientCode: string }> }) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;
  const { clientCode } = await context.params;
  const tenant = await tenantByCode(clientCode);
  if (!tenant) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });

  await prisma.tenantWebhookSecret.updateMany({
    where: { tenantId: tenant.id, status: "active" },
    data: { status: "revoked", revokedAt: new Date() }
  });
  const { secret, token } = await createTenantWebhookSecret(tenant.id, "default");
  await prisma.auditLog.create({
    data: { tenantId: tenant.id, userId: user?.id, action: "webhook.secret.rotated", target: secret.id }
  });
  return NextResponse.json({ ok: true, token, secret: { id: secret.id, tokenPreview: secret.tokenPreview, createdAt: secret.createdAt } });
}

export async function DELETE(request: Request, context: { params: Promise<{ clientCode: string }> }) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;
  const { clientCode } = await context.params;
  const tenant = await tenantByCode(clientCode);
  if (!tenant) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id obrigatorio." }, { status: 400 });
  await revokeTenantWebhookSecret(tenant.id, id);
  await prisma.auditLog.create({
    data: { tenantId: tenant.id, userId: user?.id, action: "webhook.secret.revoked", target: id }
  });
  return NextResponse.json({ ok: true });
}
