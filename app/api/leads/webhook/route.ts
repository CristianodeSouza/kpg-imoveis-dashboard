import { NextResponse } from "next/server";
import { upsertLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.LEADS_WEBHOOK_SECRET;
  const body = await request.json().catch(() => ({}));
  const providedSecret = request.headers.get("x-kpg-secret") || new URL(request.url).searchParams.get("secret") || body.secret;

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
  }

  const { lead } = await upsertLead(body);
  return NextResponse.json({ ok: true, lead });
}
