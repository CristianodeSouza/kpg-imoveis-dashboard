import { NextResponse } from "next/server";
import { upsertLeads } from "@/lib/leads";
import { fetchMakeDataStoreRecords } from "@/lib/make";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const payloads = await fetchMakeDataStoreRecords();
    const { leads } = await upsertLeads(payloads);
    return NextResponse.json({ ok: true, imported: payloads.length, total: leads.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar Make." },
      { status: 500 }
    );
  }
}
