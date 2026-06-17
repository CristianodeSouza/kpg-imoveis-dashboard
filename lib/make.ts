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
  return Boolean(config?.token && config?.dataStoreId);
}

async function fetchMakePage(offset: number, limit: number, config?: MakeConfig) {
  const token = config?.token;
  const makeBaseUrl = config?.baseUrl || "https://us2.make.com/api/v2";
  const dataStoreId = config?.dataStoreId;

  if (!token || !dataStoreId) {
    throw new Error("Token e Data Store ID do Make nao configurados para este cliente.");
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
