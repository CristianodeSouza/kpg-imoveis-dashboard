import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireTenantService } from "@/lib/services";
import { publicTenantSettings, readTenantSettings, writeTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "settings");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const settings = await readTenantSettings(session.tenantId);
  return NextResponse.json({ settings: publicTenantSettings(settings) });
}

export async function POST(request: Request) {
  const { session, response } = await requireTenantService(request, "settings");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const settings = await writeTenantSettings(session.tenantId, {
    companyName: body.companyName,
    sigaEndpoint: body.sigaEndpoint,
    sigaToken: body.sigaToken,
    metaAppId: body.metaAppId,
    metaAppSecret: body.metaAppSecret,
    instagramAccountId: body.instagramAccountId,
    instagramAccessToken: body.instagramAccessToken,
    makeBaseUrl: body.makeBaseUrl,
    makeDataStoreId: body.makeDataStoreId,
    makeApiToken: body.makeApiToken,
    whatsappNumber: body.whatsappNumber
  });

  await auditLog({
    tenantId: session.tenantId,
    userId: session.userId,
    action: "settings.updated",
    target: session.tenantId,
    metadata: {
      changed: Object.keys(body).filter((key) => !key.toLowerCase().includes("token") && !key.toLowerCase().includes("secret"))
    }
  });

  return NextResponse.json({
    ok: true,
    settings: publicTenantSettings(settings)
  });
}
