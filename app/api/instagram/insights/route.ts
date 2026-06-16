import { NextResponse } from "next/server";
import type { MediaInsight } from "@/lib/types";

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

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json({ error: "Credenciais do Instagram nao configuradas." }, { status: 500 });
  }

  const fields = [
    "id",
    "caption",
    "media_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
    "insights.metric(reach,views,saved,shares,total_interactions)"
  ].join(",");

  const response = await fetch(
    `${graphBase}/${accountId}/media?fields=${encodeURIComponent(fields)}&limit=12&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Falha ao buscar indicadores do Instagram." },
      { status: response.status }
    );
  }

  const media: MediaInsight[] = (data.data || []).map((item: any) => ({
    id: String(item.id),
    caption: String(item.caption || ""),
    permalink: String(item.permalink || ""),
    timestamp: String(item.timestamp || ""),
    mediaUrl: item.media_url ? String(item.media_url) : undefined,
    likeCount: Number(item.like_count || 0),
    commentsCount: Number(item.comments_count || 0),
    metrics: (item.insights?.data || []).map((metric: any) => ({
      name: String(metric.name),
      value: numberFromMetric(metric.values)
    }))
  }));

  return NextResponse.json({ media });
}
