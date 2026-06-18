import { normalizeProperty } from "@/lib/property";
import { prisma } from "@/lib/db";
import { readTenantSettings } from "@/lib/settings";
import { randomUUID } from "crypto";

type LookupResult = {
  imovel: unknown;
  origem: string;
  property: ReturnType<typeof normalizeProperty>;
  upstream?: {
    status?: number;
    source?: string;
  };
};

const PROPERTY_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const FETCH_TIMEOUT_MS = 12000;

const browserHeaders = (token = "", referer = "https://www.kpgimoveis.com.br/") => ({
  Accept: "application/json,text/plain,*/*",
  Authorization: token ? `Bearer ${token}` : "",
  "Content-Type": "application/json",
  Referer: referer,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
});

const sigaApiHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

const parsePayload = (text: string) => {
  if (!text.trim()) return null;
  try {
    const payload = JSON.parse(text);
    return payload?.imovel || payload?.data || payload;
  } catch {
    return null;
  }
};

const sigaEndpoints = (baseEndpoint: string, codigo: string) => {
  const endpoint = baseEndpoint.trim().replace(/\/$/, "");
  const encoded = encodeURIComponent(codigo);
  if (!endpoint) return [];
  if (/\{codigo\}/i.test(endpoint)) return [endpoint.replace(/\{codigo\}/gi, encoded)];
  if (/\{code\}/i.test(endpoint)) return [endpoint.replace(/\{code\}/gi, encoded)];
  return [`${endpoint}/${encoded}`, `${endpoint}?codigo=${encoded}`, `${endpoint}?code=${encoded}`];
};

const normalizedBaseUrl = (baseUrl: string) => {
  const clean = baseUrl.trim().replace(/\/$/, "");
  return clean || "https://api.sigacrm.com.br";
};

const sigaPropertyEndpoint = (baseUrl: string, slug: string, codigo: string) =>
  `${normalizedBaseUrl(baseUrl)}/${encodeURIComponent(slug.trim().toLowerCase())}/imovel/${encodeURIComponent(codigo)}`;

const sigaLookupCode = (codigo: string) => {
  const clean = codigo.trim();
  const numeric = clean.match(/\d+/)?.[0] || "";
  return numeric || clean;
};

function endpointOrigin(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}/`;
  } catch {
    return "https://www.kpgimoveis.com.br/";
  }
}

async function fetchWithTimeout(endpoint: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(endpoint, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function cacheResultFromRecord(record: {
  imovel: unknown;
  origem: string;
  property: unknown;
  sourceUrl: string;
}): LookupResult {
  return {
    imovel: record.imovel,
    origem: `${record.origem || "cache"}-cache`,
    property: record.property as ReturnType<typeof normalizeProperty>,
    upstream: { source: record.sourceUrl }
  };
}

async function readFreshCache(codigo: string, tenantId: string) {
  const [cached] = await prisma.$queryRaw<
    Array<{ imovel: unknown; origem: string; property: unknown; sourceUrl: string; lastSuccessAt: Date }>
  >`SELECT "imovel", "origem", "property", "sourceUrl", "lastSuccessAt" FROM "PropertyCache" WHERE "tenantId" = ${tenantId} AND "code" = ${codigo} LIMIT 1`;
  if (!cached) return null;
  if (Date.now() - cached.lastSuccessAt.getTime() > PROPERTY_CACHE_TTL_MS) return null;
  return cacheResultFromRecord(cached);
}

async function readStaleCache(codigo: string, tenantId: string) {
  const [cached] = await prisma.$queryRaw<
    Array<{ imovel: unknown; origem: string; property: unknown; sourceUrl: string }>
  >`SELECT "imovel", "origem", "property", "sourceUrl" FROM "PropertyCache" WHERE "tenantId" = ${tenantId} AND "code" = ${codigo} LIMIT 1`;
  return cached ? cacheResultFromRecord(cached) : null;
}

async function savePropertyCache(tenantId: string, codigo: string, result: LookupResult) {
  const sourceUrl = result.property.sourceUrl || result.upstream?.source || "";
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "PropertyCache" ("id", "tenantId", "code", "origem", "sourceUrl", "imovel", "property", "lastError", "createdAt", "updatedAt")
    VALUES (${id}, ${tenantId}, ${codigo}, ${result.origem}, ${sourceUrl}, ${JSON.stringify(result.imovel)}::jsonb, ${JSON.stringify(result.property)}::jsonb, '', NOW(), NOW())
    ON CONFLICT ("tenantId", "code") DO UPDATE SET
      "origem" = EXCLUDED."origem",
      "sourceUrl" = EXCLUDED."sourceUrl",
      "imovel" = EXCLUDED."imovel",
      "property" = EXCLUDED."property",
      "lastSuccessAt" = NOW(),
      "lastCheckedAt" = NOW(),
      "failureCount" = 0,
      "lastError" = '',
      "updatedAt" = NOW()
  `;
}

async function markLookupFailure(tenantId: string, codigo: string, error: string) {
  await prisma.$executeRaw`
    UPDATE "PropertyCache"
    SET "lastCheckedAt" = NOW(), "failureCount" = "failureCount" + 1, "lastError" = ${error.slice(0, 500)}, "updatedAt" = NOW()
    WHERE "tenantId" = ${tenantId} AND "code" = ${codigo}
  `.catch(() => null);
}

async function fetchFromSigaApi(codigo: string, tenantId: string): Promise<LookupResult | null> {
  const settings = await readTenantSettings(tenantId);
  if (!settings.sigaToken) return null;

  const externalCode = sigaLookupCode(codigo);
  const sigaSlug = settings.sigaSlug.trim();
  if (sigaSlug) {
    const endpoint = sigaPropertyEndpoint(settings.sigaBaseUrl, sigaSlug, externalCode);
    try {
      const response = await fetchWithTimeout(endpoint, {
        headers: sigaApiHeaders(settings.sigaToken),
        cache: "no-store"
      });
      const text = await response.text();
      if (response.ok && text.trim()) {
        const imovel = parsePayload(text);
        if (imovel) {
          return {
            imovel,
            origem: "siga-configurado",
            property: normalizeProperty({ data: imovel, imovel }, codigo),
            upstream: { status: response.status, source: endpoint }
          };
        }
      }
    } catch {
      // Mantem fallback legado abaixo para clientes ainda nao migrados completamente.
    }
  }

  if (!settings.sigaEndpoint) return null;

  const referer = endpointOrigin(settings.sigaEndpoint);
  const headers = browserHeaders(settings.sigaToken, referer);

  for (const endpoint of sigaEndpoints(settings.sigaEndpoint, externalCode)) {
    try {
      const getResponse = await fetchWithTimeout(endpoint, { headers, cache: "no-store" });
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

      const postResponse = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ codigo: externalCode, code: externalCode }),
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

async function findPropertyUrlInSitemap(codigo: string, siteOrigin: string) {
  const sitemapUrl = new URL("/sitemap.xml", siteOrigin).toString();
  const response = await fetchWithTimeout(sitemapUrl, { headers: browserHeaders("", siteOrigin), cache: "no-store" });
  if (!response.ok) return null;
  const xml = await response.text();
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
  const escapedCode = codigo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]*\/imovel\/[^<]*\/\d+)<\/loc>/i)?.[1];
    if (!loc || !new RegExp(`/${escapedCode}$`).test(loc)) continue;
    const image = block.match(/<image:loc>([^<]+)<\/image:loc>/i)?.[1] || "";
    const imageTitle = block.match(/<image:title>([^<]+)<\/image:title>/i)?.[1] || "";
    return { loc, image, imageTitle };
  }
  return null;
}

async function fetchFromPublicSite(codigo: string, tenantId: string): Promise<LookupResult | null> {
  const settings = await readTenantSettings(tenantId);
  const siteOrigin = settings.sigaSlug === "kpg" ? "https://www.kpgimoveis.com.br/" : endpointOrigin(settings.sigaEndpoint || "https://www.kpgimoveis.com.br/");
  const sitemapMatch = await findPropertyUrlInSitemap(codigo, siteOrigin).catch(() => null);
  if (!sitemapMatch) return null;

  const response = await fetchWithTimeout(sitemapMatch.loc, {
    headers: browserHeaders("", sitemapMatch.loc),
    cache: "no-store"
  });
  if (!response.ok) return null;
  const html = await response.text();
  const title =
    sitemapMatch.imageTitle ||
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
    "Imovel";
  const imovel = {
    Codigo: codigo,
    codigo,
    titulo: title,
    anuncio: title,
    url: sitemapMatch.loc,
    fotos: sitemapMatch.image ? [sitemapMatch.image] : []
  };
  return {
    imovel,
    origem: "site-publico",
    property: normalizeProperty({ data: imovel, imovel }, codigo),
    upstream: { status: response.status, source: sitemapMatch.loc }
  };
}

export async function lookupProperty(codigo: string, tenantId: string): Promise<LookupResult | null> {
  const cached = await readFreshCache(codigo, tenantId);
  if (cached) return cached;

  const configuredSiga = await fetchFromSigaApi(codigo, tenantId);
  if (configuredSiga) {
    await savePropertyCache(tenantId, codigo, configuredSiga);
    return configuredSiga;
  }

  const publicSite = await fetchFromPublicSite(codigo, tenantId).catch(() => null);
  if (publicSite) {
    await savePropertyCache(tenantId, codigo, publicSite);
    return publicSite;
  }

  await markLookupFailure(tenantId, codigo, "Todas as fontes de busca de imovel falharam.");
  return readStaleCache(codigo, tenantId);
}
