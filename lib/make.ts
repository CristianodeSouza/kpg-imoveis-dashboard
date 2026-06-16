const makeBaseUrl = process.env.MAKE_API_BASE_URL || "https://us2.make.com/api/v2";
const dataStoreId = process.env.MAKE_DATA_STORE_ID || "47814";

type MakeRecord = {
  key?: string;
  data?: Record<string, unknown>;
};

export function hasMakeConfig() {
  return Boolean(process.env.MAKE_API_TOKEN);
}

async function fetchMakePage(offset: number, limit: number) {
  const token = process.env.MAKE_API_TOKEN;
  if (!token) {
    throw new Error("MAKE_API_TOKEN nao configurado no Vercel.");
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

export async function fetchMakeDataStoreRecords() {
  const limit = 100;
  let offset = 0;
  const records: MakeRecord[] = [];

  while (offset < 1000) {
    const page = await fetchMakePage(offset, limit);
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
