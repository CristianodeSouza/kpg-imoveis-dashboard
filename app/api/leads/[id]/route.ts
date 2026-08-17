import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireTenantService(request, "mini-crm");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { history: { orderBy: { createdAt: "asc" } } }
  });
  if (!lead) return NextResponse.json({ error: "Lead nao encontrada." }, { status: 404 });

  const raw = lead.raw && typeof lead.raw === "object" ? lead.raw as Record<string, unknown> : {};
  const sheetRow = raw.rawSheetRow && typeof raw.rawSheetRow === "object" ? raw.rawSheetRow as Record<string, unknown> : {};
  const brokerStatus = String(sheetRow["Status do Corretor"] || raw.brokerStatus || lead.stage || "").trim();

  return NextResponse.json({
    lead: {
      id: lead.id, name: lead.name, phone: lead.phone, status: lead.status, stage: lead.stage,
      brokerStatus, propertyInterest: lead.propertyInterest, propertyCode: lead.propertyCode,
      propertyUrl: lead.propertyUrl, source: lead.source, createdAt: lead.createdAt,
      lastMessageAt: lead.lastMessageAt, interactions: lead.interactions, notes: lead.notes,
      history: lead.history.map((item) => ({ id: item.id, message: item.message, direction: item.direction, source: item.source, createdAt: item.createdAt }))
    }
  });
}
