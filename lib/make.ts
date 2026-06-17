type MakeRecord = {
  key?: string;
  data?: Record<string, unknown>;
};

type MakeConfig = {
  baseUrl?: string;
  dataStoreId?: string;
  token?: string;
};

const DEFAULT_MAKE_BASE_URL = "https://us2.make.com/api/v2";
const LEGACY_MAKE_DATA_STORE_ID = "47814";

function clean(value?: string | null) {
  return String(value || "").trim();
}

function resolveMakeConfig(config?: MakeConfig) {
  const tenantToken = clean(config?.token);
  const tenantDataStoreId = clean(config?.dataStoreId);

  if (tenantToken && tenantDataStoreId) {
    return {
      token: tenantToken,
      dataStoreId: tenantDataStoreId,
      baseUrl: clean(config?.baseUrl) || DEFAULT_MAKE_BASE_URL
    };
  }

  const platformToken = clean(process.env.MAKE_API_TOKEN);
  const platformDataStoreId = clean(process.env.MAKE_DATA_STORE_ID) || LEGACY_MAKE_DATA_STORE_ID;

  if (platformToken && platformDataStoreId) {
    return {
      token: platformToken,
      dataStoreId: platformDataStoreId,
      baseUrl: clean(process.env.MAKE_API_BASE_URL) || DEFAULT_MAKE_BASE_URL
    };
  }

  return null;
}

export function hasMakeConfig(config?: MakeConfig) {
  return Boolean(resolveMakeConfig(config));
}

async function fetchMakePage(offset: number, limit: number, config?: MakeConfig) {
  const resolvedConfig = resolveMakeConfig(config);

  if (!resolvedConfig) {
    throw new Error("Integracao de leads ainda nao configurada pela CSR Tecnologia.");
  }

  const url = new URL(`${resolvedConfig.baseUrl}/data-stores/${resolvedConfig.dataStoreId}/data`);
  url.searchParams.set("pg[limit]", String(limit));
  url.searchParams.set("pg[offset]", String(offset));

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${resolvedConfig.token}`
    },
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Falha ao buscar Data Store no Make.");
  }

  return (data.records || data.data || []) as MakeRecord[];
}

export async function fetchMakeDataStoreRecords(config?: MakeConfig) {
  const limit = 100;
  let offset = 0;
  const records: MakeRecord[] = [];

  while (offset < 1000) {
    const page = await fetchMakePage(offset, limit, config);
    records.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return records.map((record) => ({
    ...(record.data || {}),
    Key: record.key,
    source: "Make API - WhatsApp Buffer Store"
  }));
}
