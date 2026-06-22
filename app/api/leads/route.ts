import { NextResponse } from "next/server";
import { readLeads, updateLead } from "@/lib/leads";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "mini-crm");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const { leads, pagination } = await readLeads(session.tenantId, {
    page: Number(params.get("page") || 1),
    pageSize: Number(params.get("pageSize") || 100),
    status: params.get("status") || undefined
  });
  return NextResponse.json({
    leads,
    pagination,
    storage: "supabase"
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
