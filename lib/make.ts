type MakeRecord = {
  key?: string;
  data?: Record<string, unknown>;
};

type MakeConfig = {
  baseUrl?: string;
  dataStoreId?: string;
  token?: string;
};

export function hasMakeConfig(config?: MakeConfig) {
  return Boolean(config?.token || process.env.MAKE_API_TOKEN);
}

async function fetchMakePage(offset: number, limit: number, config?: MakeConfig) {
  const token = config?.token || process.env.MAKE_API_TOKEN;
  const makeBaseUrl = config?.baseUrl || process.env.MAKE_API_BASE_URL || "https://us2.make.com/api/v2";
  const dataStoreId = config?.dataStoreId || process.env.MAKE_DATA_STORE_ID || "47814";

  if (!token) {
    throw new Error("Token Make nao configurado para este cliente.");
  }

  const url = new URL(`${makeBaseUrl}/data-stores/${dataStoreId}/data`);
  url.searchParams.set("pg[limit]", String(limit));
  url.searchParams.set("pg[offset]", String(offset));

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`
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
