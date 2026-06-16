import { NextResponse } from "next/server";
import { normalizeLead, readLeads, updateLead } from "@/lib/leads";
import { fetchMakeDataStoreRecords, hasMakeConfig } from "@/lib/make";

export const dynamic = "force-dynamic";

export async function GET() {
  if (hasMakeConfig() && !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
    const payloads = await fetchMakeDataStoreRecords();
    return NextResponse.json({
      leads: payloads.map(normalizeLead),
      storage: "make-live"
    });
  }

  const leads = await readLeads();
  return NextResponse.json({
    leads,
    storage: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL ? "kv" : "memory"
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "ID da lead obrigatorio." }, { status: 400 });
  }

  const lead = await updateLead(id, {
    status: body.status,
    notes: body.notes
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
