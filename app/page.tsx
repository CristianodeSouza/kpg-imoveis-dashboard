"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Check,
  Copy,
  Home,
  ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { buildCaption, buildHashtags } from "@/lib/property";
import type { InstagramAccountSummary, MediaInsight, Property } from "@/lib/types";

type Creatives = {
  feed: string[];
  stories: string[];
  carousel: string[];
};

const steps = [
  ["Buscar Imovel", "Codigo no CRM SIGA"],
  ["Dados & Fotos", "Revise as informacoes"],
  ["Gerar Criativos", "Legenda e hashtags"],
  ["Publicar", "Feed, Stories e Reels"]
];

const sampleInsights: MediaInsight[] = [
  {
    id: "sample-1",
    caption: "Apartamento em Gramado",
    permalink: "#",
    timestamp: new Date().toISOString(),
    mediaType: "IMAGE",
    likeCount: 124,
    commentsCount: 9,
    metrics: [
      { name: "reach", value: 1840 },
      { name: "views", value: 3210 },
      { name: "saved", value: 38 },
      { name: "shares", value: 14 }
    ]
  },
  {
    id: "sample-2",
    caption: "Casa em Canela",
    permalink: "#",
    timestamp: new Date().toISOString(),
    mediaType: "CAROUSEL_ALBUM",
    childrenCount: 6,
    likeCount: 98,
    commentsCount: 7,
    metrics: [
      { name: "reach", value: 1320 },
      { name: "views", value: 2410 },
      { name: "saved", value: 22 },
      { name: "shares", value: 11 }
    ]
  }
];

const sampleAccount: InstagramAccountSummary = {
  id: "sample",
  username: "kpgimoveis",
  name: "KPG Imoveis",
  followersCount: 7500,
  mediaCount: 593,
  metrics: []
};

function metric(media: MediaInsight, name: string) {
  return media.metrics.find((item) => item.name === name)?.value ?? 0;
}

function accountMetric(account: InstagramAccountSummary | null, name: string) {
  return account?.metrics.find((item) => item.name === name)?.value ?? 0;
}

function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function shortCaption(caption: string, fallback: string) {
  const clean = caption.replace(/\s+/g, " ").trim();
  return clean ? clean.split(/\s+/).slice(0, 8).join(" ") : fallback;
}

function mediaTypeLabel(type: string) {
  if (type === "CAROUSEL_ALBUM") return "Carrossel";
  if (type === "VIDEO" || type === "REELS") return "Video/Reels";
  if (type === "IMAGE") return "Imagem";
  return type || "Post";
}

function weekdayLabel(timestamp: string) {
  if (!timestamp) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(timestamp));
}

function hourLabel(timestamp: string) {
  if (!timestamp) return "Sem hora";
  return `${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false }).format(new Date(timestamp))}h`;
}

function groupBy<TItem, TValue>(items: TItem[], labeler: (item: TItem) => string, mapper: (item: TItem) => TValue) {
  const grouped = new Map<string, TValue[]>();
  items.forEach((item) => {
    const label = labeler(item);
    grouped.set(label, [...(grouped.get(label) || []), mapper(item)]);
  });
  return Array.from(grouped.entries());
}

export default function HomePage() {
  const [code, setCode] = useState("");
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [creatives, setCreatives] = useState<Creatives | null>(null);
  const [creativeLoading, setCreativeLoading] = useState(false);
  const [tone, setTone] = useState("consultivo");
  const [channel, setChannel] = useState("whatsapp");
  const [includePrice, setIncludePrice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [account, setAccount] = useState<InstagramAccountSummary | null>(null);
  const [insights, setInsights] = useState<MediaInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const currentStep = property ? (caption ? 3 : 2) : 1;
  const hashtags = useMemo(() => (property ? buildHashtags(property) : []), [property]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchProperty() {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setMessage({ type: "error", text: "Digite o codigo do imovel." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: Number(cleanCode) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel buscar o imovel.");
      setProperty(data.property);
      setSelectedPhotos((data.property.photos || []).slice(0, 10));
      setCreatives(null);
      const nextCaption = buildCaption(data.property, { tone, channel, includePrice });
      setCaption(nextCaption);
      setMessage({ type: "ok", text: "Imovel carregado. Revise os dados antes de publicar." });
    } catch (error) {
      setProperty(null);
      setCaption("");
      setSelectedPhotos([]);
      setCreatives(null);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao buscar imovel." });
    } finally {
      setLoading(false);
    }
  }

  function regenerateCaption() {
    if (!property) return;
    setCaption(buildCaption(property, { tone, channel, includePrice }));
  }

  function togglePhoto(url: string) {
    setSelectedPhotos((current) =>
      current.includes(url) ? current.filter((item) => item !== url) : [...current, url].slice(0, 10)
    );
  }

  async function generateCreatives() {
    if (!property) return;

    setCreativeLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/criativos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: Number(property.code), id_imovel: Number(property.code) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel gerar criativos.");
      setCreatives(data.criativos);
      if (data.caption) setCaption(data.caption);
      if (data.criativos?.carousel?.length) setSelectedPhotos(data.criativos.carousel.slice(0, 10));
      setMessage({ type: "ok", text: "Criativos gerados no padrao Instagram." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao gerar criativos." });
    } finally {
      setCreativeLoading(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setMessage(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch("/api/publicar/direto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: Number(property?.code || code), caption, imageUrls: selectedPhotos }),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok || data.sucesso === false) throw new Error(data.error || data.detail || "Falha ao publicar.");
      const url = data?.resultado?.url ? ` ${data.resultado.url}` : "";
      const publishedCount = data?.resultado?.fotos_publicadas;
      const publishType = data?.resultado?.tipo;
      const details = publishedCount ? ` ${publishType || "post"} com ${publishedCount} foto${publishedCount > 1 ? "s" : ""}.` : "";
      setMessage({ type: "ok", text: `Publicacao enviada para o Instagram.${details}${url}` });
    } catch (error) {
      const text =
        error instanceof DOMException && error.name === "AbortError"
          ? "A publicacao demorou demais e foi interrompida. Tente novamente com menos fotos ou gere os criativos antes."
          : error instanceof Error
            ? error.message
            : "Erro ao publicar.";
      setMessage({ type: "error", text });
    } finally {
      window.clearTimeout(timeout);
      setPublishing(false);
    }
  }

  async function loadInsights() {
    setInsightsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/instagram/insights");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao buscar indicadores.");
      setAccount(data.account || null);
      setInsights(data.media || []);
    } catch (error) {
      setAccount(sampleAccount);
      setInsights(sampleInsights);
      setMessage({
        type: "error",
        text: error instanceof Error ? `${error.message} Mostrando dados demonstrativos.` : "Mostrando dados demonstrativos."
      });
    } finally {
      setInsightsLoading(false);
    }
  }

  const activeInsights = insights.length ? insights : sampleInsights;
  const activeAccount = account || sampleAccount;
  const enrichedInsights = activeInsights.map((item) => {
    const reach = metric(item, "reach");
    const views = metric(item, "views");
    const saved = metric(item, "saved");
    const shares = metric(item, "shares");
    const totalInteractions = metric(item, "total_interactions") || item.likeCount + item.commentsCount + saved + shares;
    return {
      ...item,
      reach,
      views,
      saved,
      shares,
      totalInteractions,
      engagementRate: reach ? (totalInteractions / reach) * 100 : 0,
      saveRate: reach ? (saved / reach) * 100 : 0,
      shareRate: reach ? (shares / reach) * 100 : 0
    };
  });

  const chartData = enrichedInsights.slice(0, 8).map((item) => ({
    name: shortCaption(item.caption, item.id),
    alcance: item.reach,
    visualizacoes: item.views,
    interacoes: item.totalInteractions
  }));

  const totals = enrichedInsights.reduce(
    (acc, item) => {
      acc.reach += item.reach;
      acc.views += item.views;
      acc.saved += item.saved;
      acc.shares += item.shares;
      acc.likes += item.likeCount;
      acc.comments += item.commentsCount;
      acc.interactions += item.totalInteractions;
      return acc;
    },
    { reach: 0, views: 0, saved: 0, shares: 0, likes: 0, comments: 0, interactions: 0 }
  );
  const averageReach = enrichedInsights.length ? Math.round(totals.reach / enrichedInsights.length) : 0;
  const averageViews = enrichedInsights.length ? Math.round(totals.views / enrichedInsights.length) : 0;
  const engagementRate = totals.reach ? (totals.interactions / totals.reach) * 100 : 0;
  const saveRate = totals.reach ? (totals.saved / totals.reach) * 100 : 0;
  const topPosts = [...enrichedInsights].sort((a, b) => b.totalInteractions - a.totalInteractions).slice(0, 5);
  const typeData = groupBy(
    enrichedInsights,
    (item) => mediaTypeLabel(item.mediaType),
    (item) => item
  ).map(([name, items]) => ({
    name,
    posts: items.length,
    alcance: items.reduce((sum, item) => sum + item.reach, 0),
    interacoes: items.reduce((sum, item) => sum + item.totalInteractions, 0)
  }));
  const bestDays = groupBy(
    enrichedInsights,
    (item) => weekdayLabel(item.timestamp),
    (item) => item
  )
    .map(([name, items]) => ({
      name,
      alcance: Math.round(items.reduce((sum, item) => sum + item.reach, 0) / items.length),
      posts: items.length
    }))
    .sort((a, b) => b.alcance - a.alcance)
    .slice(0, 4);
  const bestHours = groupBy(
    enrichedInsights,
    (item) => hourLabel(item.timestamp),
    (item) => item
  )
    .map(([name, items]) => ({
      name,
      alcance: Math.round(items.reduce((sum, item) => sum + item.reach, 0) / items.length),
      posts: items.length
    }))
    .sort((a, b) => b.alcance - a.alcance)
    .slice(0, 4);
  const bestPost = topPosts[0];
  const bestFormat = [...typeData].sort((a, b) => b.alcance - a.alcance)[0];
  const bestDay = bestDays[0];
  const bestHour = bestHours[0];
  const facts = property?.facts ?? [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>KPG IMOVEIS</strong>
          <span>Portal de ferramentas</span>
        </div>
        <nav className="tool-nav" aria-label="Ferramentas KPG">
          <a className="tool-link active" href="/">
            Instagram Publisher
          </a>
          <a className="tool-link" href="/leads">
            Mini CRM
          </a>
        </nav>
        <div className="status-row">
          <span className="status-pill">SIGA</span>
          <span className="status-pill">Instagram</span>
          <span className="status-pill">ImgBB</span>
          <span className="status-pill">IA</span>
        </div>
      </header>

      <section className="workspace">
        <div className="stepper" aria-label="Fluxo de publicacao">
          {steps.map(([title, captionText], index) => (
            <div className={`step ${currentStep === index + 1 ? "active" : currentStep > index + 1 ? "done" : ""}`} key={title}>
              <span className="step-index">{currentStep > index + 1 ? <Check size={15} /> : index + 1}</span>
              <span>
                <span className="step-title">{title}</span>
                <span className="step-caption">{captionText}</span>
              </span>
            </div>
          ))}
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Search size={22} />
              <h2>
                Buscar <span className="gold">Imovel</span>
              </h2>
            </div>
          </div>
          <div className="search-row">
            <div className="field">
              <label htmlFor="code">Codigo do imovel no SIGA</label>
              <input
                className="input"
                id="code"
                placeholder="Ex: 1234"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") fetchProperty();
                }}
              />
            </div>
            <button className="btn primary" disabled={loading} onClick={fetchProperty}>
              {loading ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
              Buscar
            </button>
          </div>
          {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}
        </section>

        {property ? (
          <div className="grid-two panel">
            <section>
              <div className="panel-heading">
                <div className="panel-title">
                  <Building2 size={21} />
                  <h2>Dados do Imovel</h2>
                </div>
              </div>
              <div className="property-summary">
                {property.photos[0] ? (
                  <img className="cover" src={property.photos[0]} alt={property.title} />
                ) : (
                  <div className="cover" />
                )}
                <div className="summary-text">
                  <h1>{property.title}</h1>
                  <div className="summary-meta">
                    <span>{property.category}</span>
                    <span>{property.purpose}</span>
                    <span>{[property.neighborhood, property.city].filter(Boolean).join(", ")}</span>
                  </div>
                  <div className="price">{property.price}</div>
                </div>
              </div>
              <div className="fact-grid">
                {facts.map((fact) => (
                  <div className="fact" key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
              </div>
              <p>{property.description || "Descricao nao informada no retorno da API."}</p>
              <div className="hashtags">
                {property.features.map((feature) => (
                  <span className="tag" key={feature}>
                    {feature}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <div className="panel-heading">
                <div className="panel-title">
                  <ImageIcon size={21} />
                  <h2>{creatives ? "Criativos Selecionados" : "Fotos Selecionadas"}</h2>
                </div>
                <span className="step-caption">{selectedPhotos.length}/10</span>
              </div>
              <div className="photo-grid">
                {(creatives?.carousel?.length ? creatives.carousel : property.photos).length ? (
                  (creatives?.carousel?.length ? creatives.carousel : property.photos).slice(0, 24).map((url) => (
                    <label className={`photo-choice ${selectedPhotos.includes(url) ? "selected" : ""}`} key={url}>
                      <input checked={selectedPhotos.includes(url)} onChange={() => togglePhoto(url)} type="checkbox" />
                      <img src={url} alt="Foto do imovel" />
                    </label>
                  ))
                ) : (
                  <p>Nenhuma foto foi retornada pela API.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {property ? (
          <section className="panel">
            <div className="panel-heading">
              <div className="panel-title">
                <Sparkles size={21} />
                <h2>Legenda e SEO Social</h2>
              </div>
              <div className="status-row">
                <button className="btn secondary" disabled={creativeLoading} onClick={generateCreatives}>
                  {creativeLoading ? <Loader2 size={17} /> : <ImageIcon size={17} />}
                  Criativos
                </button>
                <button className="btn secondary" onClick={regenerateCaption}>
                  <RefreshCw size={17} />
                  Legenda
                </button>
              </div>
            </div>
            <div className="tools">
              <div className="field">
                <label htmlFor="tone">Tom</label>
                <select className="select" id="tone" value={tone} onChange={(event) => setTone(event.target.value)}>
                  <option value="consultivo">Consultivo</option>
                  <option value="direto">Direto</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="channel">CTA</label>
                <select className="select" id="channel" value={channel} onChange={(event) => setChannel(event.target.value)}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="contato">Contato KPG</option>
                </select>
              </div>
              <label className="toggle-row">
                <input checked={includePrice} onChange={(event) => setIncludePrice(event.target.checked)} type="checkbox" />
                Exibir valor na legenda
              </label>
            </div>
            <div className="field">
              <label htmlFor="caption">Legenda editavel</label>
              <textarea className="textarea" id="caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
            </div>
            <div className="actions">
              <div className="hashtags">
                {hashtags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className="btn secondary"
                onClick={() => {
                  navigator.clipboard.writeText(caption);
                  setMessage({ type: "ok", text: "Legenda copiada." });
                }}
              >
                <Copy size={17} />
                Copiar
              </button>
            </div>
            <div className="actions">
              <span className="step-caption">
                Use Criativos para gerar 1080x1350/Stories pelo backend antes de publicar.
              </span>
              <button className="btn success" disabled={publishing || !selectedPhotos.length} onClick={publish}>
                {publishing ? <Loader2 size={17} /> : <Send size={17} />}
                Publicar no Instagram
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <BarChart3 size={21} />
              <h2>Indicadores Instagram</h2>
            </div>
            <button className="btn secondary" disabled={insightsLoading} onClick={loadInsights}>
              {insightsLoading ? <Loader2 size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>
          <div className="analytics-hero">
            <div className="account-card">
              <span className="eyebrow">Conta analisada</span>
              <strong>@{activeAccount.username || "kpgimoveis"}</strong>
              <small>{activeAccount.name || "KPG Imoveis"}</small>
            </div>
            <div className="decision-card">
              <span className="eyebrow">Melhor post recente</span>
              <strong>{bestPost ? shortCaption(bestPost.caption, bestPost.id) : "Sem dados suficientes"}</strong>
              <small>{bestPost ? `${bestPost.reach.toLocaleString("pt-BR")} alcance • ${percent(bestPost.engagementRate)} engajamento` : "Atualize para analisar"}</small>
            </div>
            <div className="decision-card">
              <span className="eyebrow">Melhor janela</span>
              <strong>{bestDay && bestHour ? `${bestDay.name} às ${bestHour.name}` : "Sem historico"}</strong>
              <small>{bestFormat ? `${bestFormat.name} tem melhor alcance acumulado` : "Dados ainda indisponiveis"}</small>
            </div>
          </div>

          <div className="account-strip">
            <div>
              <span className="eyebrow">Seguidores</span>
              <strong>{activeAccount.followersCount.toLocaleString("pt-BR")}</strong>
            </div>
            <div>
              <span className="eyebrow">Posts no perfil</span>
              <strong>{activeAccount.mediaCount.toLocaleString("pt-BR")}</strong>
            </div>
            <div>
              <span className="eyebrow">Posts analisados</span>
              <strong>{enrichedInsights.length.toLocaleString("pt-BR")}</strong>
            </div>
            <div>
              <span className="eyebrow">Visitas ao perfil</span>
              <strong>{accountMetric(activeAccount, "profile_views").toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div className="insight-grid">
            <div className="metric">
              <span>Alcance</span>
              <strong>{totals.reach.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Visualizacoes</span>
              <strong>{totals.views.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Salvos</span>
              <strong>{totals.saved.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Comentarios</span>
              <strong>{totals.comments.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Compartilhamentos</span>
              <strong>{totals.shares.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Curtidas</span>
              <strong>{totals.likes.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Taxa de engajamento</span>
              <strong>{percent(engagementRate)}</strong>
            </div>
            <div className="metric">
              <span>Taxa de salvamento</span>
              <strong>{percent(saveRate)}</strong>
            </div>
            <div className="metric">
              <span>Alcance medio/post</span>
              <strong>{averageReach.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Views medias/post</span>
              <strong>{averageViews.toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div className="chart-section">
            <div className="chart-header">
              <div>
                <span className="eyebrow">Comparativo por publicacao</span>
                <h3>Alcance, visualizacoes e interacoes</h3>
              </div>
              <small>Ultimos {chartData.length} posts com dados disponiveis</small>
            </div>
            <div className="chart-wrap">
              {mounted ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 12, left: -12, bottom: 44 }}>
                    <CartesianGrid stroke="#e4e9f1" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={64} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="alcance" fill="#2f6fed" name="Alcance" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="visualizacoes" fill="#1fbf75" name="Visualizacoes" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="interacoes" fill="#c7972d" name="Interacoes" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="analytics-grid">
            <section className="analytics-block">
              <h3>Posts com maior resposta</h3>
              <div className="ranking-list">
                {topPosts.map((item, index) => (
                  <a className="ranking-item" href={item.permalink || "#"} key={item.id} rel="noreferrer" target="_blank">
                    <span className="rank">{index + 1}</span>
                    {item.thumbnailUrl || item.mediaUrl ? (
                      <img src={item.thumbnailUrl || item.mediaUrl} alt="Midia do Instagram" />
                    ) : (
                      <span className="ranking-thumb" aria-hidden="true" />
                    )}
                    <span>
                      <strong>{shortCaption(item.caption, item.id)}</strong>
                      <small>
                        {mediaTypeLabel(item.mediaType)} • {item.reach.toLocaleString("pt-BR")} alcance
                      </small>
                      <span className="mini-metrics">
                        <span>{percent(item.engagementRate)} engaj.</span>
                        <span>{item.saved.toLocaleString("pt-BR")} salvos</span>
                        <span>{item.shares.toLocaleString("pt-BR")} shares</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
            <section className="analytics-block">
              <h3>Formatos que mais ajudam</h3>
              <div className="compact-table">
                {typeData.map((item) => (
                  <div className="table-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{item.alcance.toLocaleString("pt-BR")}</strong>
                    <small>{item.posts} posts</small>
                  </div>
                ))}
              </div>
            </section>
            <section className="analytics-block">
              <h3>Melhores dias</h3>
              <div className="compact-table">
                {bestDays.map((item) => (
                  <div className="table-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{item.alcance.toLocaleString("pt-BR")}</strong>
                    <small>{item.posts} posts</small>
                  </div>
                ))}
              </div>
            </section>
            <section className="analytics-block">
              <h3>Melhores horarios</h3>
              <div className="compact-table">
                {bestHours.map((item) => (
                  <div className="table-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{item.alcance.toLocaleString("pt-BR")}</strong>
                    <small>{item.posts} posts</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
