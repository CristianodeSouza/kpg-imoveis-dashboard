import { NextResponse } from "next/server";
import { upsertLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.LEADS_WEBHOOK_SECRET;
  const body = await request.json().catch(() => ({}));
  const params = new URL(request.url).searchParams;
  const providedSecret = request.headers.get("x-kpg-secret") || params.get("secret") || body.secret;
  const tenantId = request.headers.get("x-tenant-id") || params.get("tenantId") || body.tenantId;

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
  }

  const { lead } = await upsertLead(body, tenantId);
  return NextResponse.json({ ok: true, lead });
}
