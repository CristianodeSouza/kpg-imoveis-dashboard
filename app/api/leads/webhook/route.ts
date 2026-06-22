import { NextResponse } from "next/server";
import { upsertLead } from "@/lib/leads";
import { verifyTenantWebhookSecret } from "@/lib/webhook-secrets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const params = new URL(request.url).searchParams;
  const providedSecret = request.headers.get("x-kpg-webhook-token") || request.headers.get("x-kpg-secret") || params.get("token") || params.get("secret") || body.secret;
  const tenantId = request.headers.get("x-tenant-id") || params.get("tenantId") || body.tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId obrigatorio para registrar lead." }, { status: 400 });
  }

  if (!providedSecret || !(await verifyTenantWebhookSecret(tenantId, providedSecret))) {
    return NextResponse.json({ error: "Webhook nao autorizado para este cliente." }, { status: 401 });
  }

  const { lead } = await upsertLead(body, tenantId);
  return NextResponse.json({ ok: true, lead });
}
