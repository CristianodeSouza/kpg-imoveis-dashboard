import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getFromBackend } from "@/lib/backend";
import { readTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const backend = await getFromBackend("/api/status");
  if (backend) return NextResponse.json({ ...backend, backend: "online" });
  const session = await getSessionFromRequest(request);
  const settings = await readTenantSettings(session?.tenantId);

  return NextResponse.json({
    siga: settings.sigaEndpoint && settings.sigaToken ? "configurado" : "pendente",
    instagram: settings.instagramAccessToken && settings.instagramAccountId ? "configurado" : "pendente",
    make: settings.makeApiToken && settings.makeBaseUrl && settings.makeDataStoreId ? "configurado" : "pendente",
    whatsapp: settings.whatsappNumber ? "configurado" : "pendente",
    imgbb: process.env.IMGBB_API_KEY ? "configurado" : "pendente",
    ia_caption: "template (sem IA)",
    backend: "offline"
  });
}
