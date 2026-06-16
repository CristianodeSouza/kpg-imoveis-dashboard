import { NextResponse } from "next/server";
import { readTenantSettings } from "@/lib/settings";
import { requireTenantService } from "@/lib/services";
import type { InstagramAccountSummary, MediaInsight } from "@/lib/types";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

const numberFromMetric = (value: unknown) => {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    const first = value[0] as { value?: unknown } | undefined;
    return numberFromMetric(first?.value);
  }
  return 0;
};

async function graphFetch(path: string, params: Record<string, string | number | undefined>, token: string) {
  const url = new URL(`${graphBase}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  url.searchParams.set("access_token", token);

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  return { response, data };
}

const mapMetrics = (metrics: any[] = []) =>
  metrics.map((metric: any) => ({
    name: String(metric.name),
    value: numberFromMetric(metric.values)
  }));

async function fetchAccount(accountId: string, token: string): Promise<InstagramAccountSummary | null> {
  const fields = [
    "id",
    "username",
    "name",
    "followers_count",
    "media_count",
    "profile_picture_url",
    "website"
  ].join(",");
  const { response, data } = await graphFetch(accountId, { fields }, token);
  if (!response.ok) return null;

  let metrics: InstagramAccountSummary["metrics"] = [];
  const insights = await graphFetch(
    `${accountId}/insights`,
    { metric: "reach,profile_views,website_clicks", period: "day" },
    token
  );
  if (insights.response.ok) metrics = mapMetrics(insights.data?.data || []);

  return {
    id: String(data.id || accountId),
    username: String(data.username || ""),
    name: String(data.name || ""),
    followersCount: Number(data.followers_count || 0),
    mediaCount: Number(data.media_count || 0),
    profilePictureUrl: data.profile_picture_url ? String(data.profile_picture_url) : undefined,
    website: data.website ? String(data.website) : undefined,
    metrics
  };
}

export async function GET(request: Request) {
  const { session, response: authResponse } = await requireTenantService(request, "instagram-publisher");
  if (authResponse) return authResponse;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const settings = await readTenantSettings(session.tenantId);
  const accountId = settings.instagramAccountId;
  const token = settings.instagramAccessToken;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Credenciais do Instagram nao configuradas." }, { status: 500 });
  }

  const fields = [
    "id",
    "caption",
    "media_url",
    "thumbnail_url",
    "media_type",
    "permalink",
    "timestamp",
    "username",
    "like_count",
    "comments_count",
    "children{media_type,media_url,thumbnail_url}",
    "insights.metric(reach,views,saved,shares,total_interactions)"
  ].join(",");

  let { response, data } = await graphFetch(`${accountId}/media`, { fields, limit: 24 }, token);

  if (!response.ok && data?.error?.message?.includes("insights")) {
    const fallbackFields = fields.replace(",insights.metric(reach,views,saved,shares,total_interactions)", "");
    const fallback = await graphFetch(`${accountId}/media`, { fields: fallbackFields, limit: 24 }, token);
    response = fallback.response;
    data = fallback.data;
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Falha ao buscar indicadores do Instagram." },
      { status: response.status }
    );
  }

  const account = await fetchAccount(accountId, token);
  const media: MediaInsight[] = (data.data || []).map((item: any) => ({
    id: String(item.id),
    caption: String(item.caption || ""),
    permalink: String(item.permalink || ""),
    timestamp: String(item.timestamp || ""),
    mediaType: String(item.media_type || ""),
    mediaUrl: item.media_url ? String(item.media_url) : undefined,
    thumbnailUrl: item.thumbnail_url ? String(item.thumbnail_url) : undefined,
    childrenCount: Array.isArray(item.children?.data) ? item.children.data.length : undefined,
    likeCount: Number(item.like_count || 0),
    commentsCount: Number(item.comments_count || 0),
    metrics: mapMetrics(item.insights?.data || [])
  }));

  return NextResponse.json({ account, media });
}
