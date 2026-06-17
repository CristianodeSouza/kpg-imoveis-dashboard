import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getTenantPaymentOverview } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const overview = await getTenantPaymentOverview(session.tenantId);
  return NextResponse.json(overview);
}
