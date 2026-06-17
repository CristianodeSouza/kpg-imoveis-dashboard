import { NextResponse } from "next/server";
import { upsertLeads } from "@/lib/leads";
import { fetchMakeDataStoreRecords } from "@/lib/make";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "mini-crm");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const settings = await readTenantSettings(session.tenantId);
    const payloads = await fetchMakeDataStoreRecords({
      baseUrl: settings.makeBaseUrl,
      dataStoreId: settings.makeDataStoreId,
      token: settings.makeApiToken
    });
    const { leads } = await upsertLeads(payloads, session.tenantId);
    return NextResponse.json({ ok: true, imported: payloads.length, total: leads.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar leads.";
    return NextResponse.json(
      { error: message.replace("Make", "integracao de leads") },
      { status: 500 }
    );
  }
}
