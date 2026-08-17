import { NextResponse } from "next/server";
import { upsertLeads } from "@/lib/leads";
import { fetchMakeDataStoreRecords } from "@/lib/make";
import { fetchGoogleSheetsLeadRecords } from "@/lib/google-sheets-leads";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { session, response } = await requireTenantService(request, "mini-crm");
    if (response) return response;
    if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

    const settings = await readTenantSettings(session.tenantId);
    const body = await request.json().catch(() => ({}));
    const payloads = settings.leadSource === "GOOGLE_SHEETS"
      ? await fetchGoogleSheetsLeadRecords({
          spreadsheetId: settings.googleSheetsSpreadsheetId,
          sheetName: settings.googleSheetsSheetName
        })
      : await fetchMakeDataStoreRecords({
          baseUrl: settings.makeBaseUrl,
          dataStoreId: settings.makeDataStoreId,
          token: settings.makeApiToken
        });
    const invalid = payloads.filter((payload) => {
      const row = payload as Record<string, unknown>;
      return !String(row.nome || "").trim() && !String(row.numero || "").trim() && !String(row.chatLid || "").trim();
    }).length;
    if (body?.dryRun === true) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        source: settings.leadSource,
        rows: payloads.length,
        valid: payloads.length - invalid,
        invalid
      });
    }

    const { pagination } = await upsertLeads(payloads, session.tenantId);
    return NextResponse.json({ ok: true, source: settings.leadSource, imported: payloads.length - invalid, invalid, total: pagination.total, pagination });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao sincronizar leads.";
    return NextResponse.json(
      { error: message.replace("Make", "integracao de leads") },
      { status: 500 }
    );
  }
}
