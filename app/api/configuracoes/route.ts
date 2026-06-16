import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireTenantService } from "@/lib/services";
import { publicTenantSettings, readTenantSettings, writeTenantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value ?? "").trim();
}

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
  const current = await readTenantSettings(session.tenantId);
  const missingFields = [
    ["Nome da imobiliaria", text(body.companyName)],
    ["Endpoint da API SIGA", text(body.sigaEndpoint)],
    ["Token da API SIGA", text(body.sigaToken) || current.sigaToken],
    ["Instagram Account ID", text(body.instagramAccountId)],
    ["Instagram Access Token", text(body.instagramAccessToken) || current.instagramAccessToken]
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label);

  if (missingFields.length) {
    return NextResponse.json(
      { error: `Preencha os campos obrigatorios: ${missingFields.join(", ")}.` },
      { status: 400 }
    );
  }

  const settings = await writeTenantSettings(session.tenantId, {
    companyName: body.companyName,
    sigaEndpoint: body.sigaEndpoint,
    sigaToken: body.sigaToken,
    metaAppId: body.metaAppId,
    metaAppSecret: body.metaAppSecret,
    instagramAccountId: body.instagramAccountId,
    instagramAccessToken: body.instagramAccessToken,
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
