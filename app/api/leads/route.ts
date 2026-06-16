import { NextResponse } from "next/server";
import { normalizeLead, readLeads, updateLead } from "@/lib/leads";
import { fetchMakeDataStoreRecords, hasMakeConfig } from "@/lib/make";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "mini-crm");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const settings = await readTenantSettings(session.tenantId);
  const makeConfig = { baseUrl: settings.makeBaseUrl, dataStoreId: settings.makeDataStoreId, token: settings.makeApiToken };

  if (hasMakeConfig(makeConfig) && !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
    const payloads = await fetchMakeDataStoreRecords(makeConfig);
    return NextResponse.json({
      leads: payloads.map(normalizeLead),
      storage: "make-live"
    });
  }

  const leads = await readLeads(session.tenantId);
  return NextResponse.json({
    leads,
    storage: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL ? "kv" : "memory"
  });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireTenantService(request, "mini-crm");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "ID da lead obrigatorio." }, { status: 400 });
  }

  const lead = await updateLead(id, {
    status: body.status,
    notes: body.notes
  }, session.tenantId);

  if (!lead) {
    return NextResponse.json({ error: "Lead nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
