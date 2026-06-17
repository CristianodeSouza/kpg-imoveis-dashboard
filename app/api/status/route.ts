import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { readTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  const settings = await readTenantSettings(session.tenantId);

  return NextResponse.json({
    siga: settings.sigaEndpoint && settings.sigaToken ? "configurado" : "pendente",
    instagram: settings.instagramAccessToken && settings.instagramAccountId ? "configurado" : "pendente",
    whatsapp: settings.whatsappNumber ? "configurado" : "pendente",
    imgbb: process.env.IMGBB_API_KEY ? "configurado" : "pendente",
    ia_caption: "template (sem IA)",
    backend: "nao utilizado"
  });
}
