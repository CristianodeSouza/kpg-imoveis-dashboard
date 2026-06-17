import { normalizeProperty } from "@/lib/property";
import { readTenantSettings } from "@/lib/settings";

type LookupResult = {
  imovel: unknown;
  origem: string;
  property: ReturnType<typeof normalizeProperty>;
  upstream?: {
    status?: number;
    source?: string;
  };
};

const parsePayload = (text: string) => {
  if (!text.trim()) return null;
  const payload = JSON.parse(text);
  return payload?.imovel || payload?.data || payload;
};

const sigaEndpoints = (baseEndpoint: string, codigo: string) => {
  const endpoint = baseEndpoint.trim().replace(/\/$/, "");
  const encoded = encodeURIComponent(codigo);
  if (!endpoint) return [];
  if (/\{codigo\}/i.test(endpoint)) return [endpoint.replace(/\{codigo\}/gi, encoded)];
  if (/\{code\}/i.test(endpoint)) return [endpoint.replace(/\{code\}/gi, encoded)];
  return [`${endpoint}/${encoded}`, `${endpoint}?codigo=${encoded}`, `${endpoint}?code=${encoded}`];
};

async function fetchFromSigaApi(codigo: string, tenantId: string): Promise<LookupResult | null> {
  const settings = await readTenantSettings(tenantId);
  if (!settings.sigaEndpoint || !settings.sigaToken) return null;

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${settings.sigaToken}`,
    "Content-Type": "application/json",
    Token: settings.sigaToken,
    "X-API-Token": settings.sigaToken
  };

  for (const endpoint of sigaEndpoints(settings.sigaEndpoint, codigo)) {
    try {
      const getResponse = await fetch(endpoint, { headers, cache: "no-store" });
      const getText = await getResponse.text();
      if (getResponse.ok && getText.trim()) {
        const imovel = parsePayload(getText);
        if (imovel) {
          return {
            imovel,
            origem: "siga-configurado",
            property: normalizeProperty({ data: imovel, imovel }, codigo),
            upstream: { status: getResponse.status, source: endpoint }
          };
        }
      }

      const postResponse = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ codigo: Number(codigo), code: codigo }),
        cache: "no-store"
      });
      const postText = await postResponse.text();
      if (!postResponse.ok || !postText.trim()) continue;
      const imovel = parsePayload(postText);
      if (!imovel) continue;

      return {
        imovel,
        origem: "siga-configurado",
        property: normalizeProperty({ data: imovel, imovel }, codigo),
        upstream: { status: postResponse.status, source: endpoint }
      };
    } catch {
      // Tenta o proximo formato de endpoint antes de cair nos fallbacks existentes.
    }
  }

  return null;
}

export async function lookupProperty(codigo: string, tenantId: string): Promise<LookupResult | null> {
  const configuredSiga = await fetchFromSigaApi(codigo, tenantId);
  if (configuredSiga) return configuredSiga;
  return null;
}
