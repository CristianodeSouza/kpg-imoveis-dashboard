import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

export async function requirePlatformAdmin(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return { session: null, user: null, response: NextResponse.json({ error: "Sessao invalida." }, { status: 401 }) };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.tenantId !== session.tenantId || !user.isPlatformAdmin) {
    return { session, user, response: NextResponse.json({ error: "Acesso restrito ao admin CSR." }, { status: 403 }) };
  }

  return { session, user, response: null };
}
