import type { SeoSitemapUrl } from "@prisma/client";

export type ParsedSitemapUrl = {
  url: string;
  lastmod?: Date | null;
  changefreq?: string;
  priority?: string;
  metadata: {
    images: number;
    videos: number;
    news: number;
  };
};

export type SitemapQuality = {
  score: number;
  status: "valid" | "warning" | "error";
  issues: string[];
};

const LOCAL_ENTITIES = [
  "gramado",
  "canela",
  "porto-alegre",
  "sao-paulo",
  "serra-gaucha",
  "centro",
  "bavaria",
  "planalto",
  "carniel",
  "tristeza",
  "moinhos-de-vento"
];

export function text(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeDomain(value: string) {
  const clean = text(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  return clean.replace(/[^a-z0-9.-]/g, "");
}

export function normalizeSitemapUrl(value: string, domain: string) {
  const clean = text(value);
  if (clean) return clean;
  const normalizedDomain = normalizeDomain(domain);
  return normalizedDomain ? `https://${normalizedDomain}/sitemap.xml` : "";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function matchTag(block: string, tag: string) {
  const found = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return found ? decodeXml(found[1].trim()) : "";
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseSitemapXml(xml: string): ParsedSitemapUrl[] {
  const blocks = [...xml.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)].map((match) => match[1]);
  return blocks
    .map((block) => ({
      url: matchTag(block, "loc"),
      lastmod: parseDate(matchTag(block, "lastmod")),
      changefreq: matchTag(block, "changefreq"),
      priority: matchTag(block, "priority"),
      metadata: {
        images: (block.match(/<image:image/gi) || []).length,
        videos: (block.match(/<video:video/gi) || []).length,
        news: (block.match(/<news:news/gi) || []).length
      }
    }))
    .filter((item) => item.url.startsWith("http"));
}

export function qualityForUrl(item: ParsedSitemapUrl, now = new Date()): SitemapQuality {
  const issues: string[] = [];
  const pathname = new URL(item.url).pathname.toLowerCase();
  const slugParts = pathname.split("/").filter(Boolean);
  const slugText = slugParts.at(-1) || "";
  const slugWords = slugText.split(/[-_]+/).filter(Boolean);

  if (/[?=&]/.test(item.url) || pathname.includes(".php")) issues.push("URL pouco amigavel");
  if (!LOCAL_ENTITIES.some((entity) => pathname.includes(entity))) issues.push("URL sem localidade clara");
  if (slugWords.length < 3) issues.push("Slug curto para SEO");
  if (!item.lastmod) issues.push("Sem lastmod no sitemap");
  if (item.lastmod) {
    const ageDays = Math.floor((now.getTime() - item.lastmod.getTime()) / 86400000);
    if (ageDays > 180) issues.push("URL sem atualizacao recente");
  }
  if (item.metadata.images === 0) issues.push("Sem imagem declarada no sitemap");

  const score = Math.max(0, 100 - issues.length * 14);
  return {
    score,
    status: issues.length >= 4 ? "error" : issues.length ? "warning" : "valid",
    issues
  };
}

export function aggregateSitemapScore(urls: Array<Pick<SeoSitemapUrl, "qualityScore">>) {
  if (!urls.length) return 0;
  return Math.round(urls.reduce((sum, item) => sum + item.qualityScore, 0) / urls.length);
}

export function scoreTone(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export function buildSitemapRecommendations(args: {
  tenantId: string;
  siteId: string;
  total: number;
  duplicateCount: number;
  missingLocation: number;
  oldUrls: number;
  shortSlugs: number;
  withoutImages: number;
}) {
  const items: Array<{ tenantId: string; siteId: string; title: string; description: string; impact: string; priority: string; source: string }> = [];
  if (args.duplicateCount) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: `${args.duplicateCount} URLs duplicadas no sitemap`,
      description: "Revise a geracao do sitemap para evitar sinais repetidos e desperdicio de rastreamento.",
      impact: "medium",
      priority: "high",
      source: "sitemap"
    });
  }
  if (args.missingLocation) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: `${args.missingLocation} URLs sem cidade ou regiao`,
      description: "Inclua entidades locais nos slugs para fortalecer SEO local e leitura por IA generativa.",
      impact: "high",
      priority: "high",
      source: "geo"
    });
  }
  if (args.oldUrls) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: `${args.oldUrls} URLs sem atualizacao recente`,
      description: "Atualize paginas antigas com dados, fotos, bairros e perguntas frequentes relevantes.",
      impact: "medium",
      priority: "medium",
      source: "sitemap"
    });
  }
  if (args.shortSlugs) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: `${args.shortSlugs} slugs curtos para SEO`,
      description: "Use slugs descritivos com tipo de pagina, localidade e termo principal.",
      impact: "medium",
      priority: "medium",
      source: "seo"
    });
  }
  if (args.withoutImages) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: `${args.withoutImages} URLs sem imagem no sitemap`,
      description: "Adicionar imagens ajuda paginas de imoveis e conteudos locais a ficarem mais completas para busca.",
      impact: "low",
      priority: "low",
      source: "content"
    });
  }
  if (!items.length && args.total) {
    items.push({
      tenantId: args.tenantId,
      siteId: args.siteId,
      title: "Sitemap saudavel",
      description: "Nao encontramos problemas criticos nesta leitura. O proximo passo e conectar Search Console e inspecao de URLs.",
      impact: "positive",
      priority: "low",
      source: "sitemap"
    });
  }
  return items;
}
