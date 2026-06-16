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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { buildCaption, buildHashtags } from "@/lib/property";
import type { MediaInsight, Property } from "@/lib/types";

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

function metric(media: MediaInsight, name: string) {
  return media.metrics.find((item) => item.name === name)?.value ?? 0;
}

function hasPositiveValue(value: string) {
  const numeric = Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0;
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
    try {
      const response = await fetch("/api/publicar/direto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: Number(property?.code || code), caption, imageUrls: selectedPhotos })
      });
      const data = await response.json();
      if (!response.ok || data.sucesso === false) throw new Error(data.error || data.detail || "Falha ao publicar.");
      const url = data?.resultado?.url ? ` ${data.resultado.url}` : "";
      setMessage({ type: "ok", text: `Publicacao enviada para o Instagram.${url}` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao publicar." });
    } finally {
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
      setInsights(data.media || []);
    } catch (error) {
      setInsights(sampleInsights);
      setMessage({
        type: "error",
        text: error instanceof Error ? `${error.message} Mostrando dados demonstrativos.` : "Mostrando dados demonstrativos."
      });
    } finally {
      setInsightsLoading(false);
    }
  }

  const chartData = (insights.length ? insights : sampleInsights).map((item) => ({
    name: item.caption.split(/\s+/).slice(0, 3).join(" ") || item.id,
    alcance: metric(item, "reach"),
    visualizacoes: metric(item, "views"),
    curtidas: item.likeCount
  }));

  const totals = (insights.length ? insights : sampleInsights).reduce(
    (acc, item) => {
      acc.reach += metric(item, "reach");
      acc.views += metric(item, "views");
      acc.saved += metric(item, "saved");
      acc.comments += item.commentsCount;
      return acc;
    },
    { reach: 0, views: 0, saved: 0, comments: 0 }
  );
  const facts = property
    ? [
        { label: "Area", value: property.privateArea || "-" },
        { label: "Perfil", value: property.profile || "-" },
        { label: "Condominio", value: property.condoFee !== "Consulte" ? property.condoFee : "-" },
        { label: "IPTU", value: property.propertyTax !== "Consulte" ? property.propertyTax : "-" },
        ...(hasPositiveValue(property.bedrooms) ? [{ label: "Dorm.", value: property.bedrooms }] : []),
        ...(hasPositiveValue(property.suites) ? [{ label: "Suites", value: property.suites }] : []),
        ...(hasPositiveValue(property.parking) ? [{ label: "Vagas", value: property.parking }] : [])
      ]
    : [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>KPG IMOVEIS</strong>
          <span>Instagram Publisher</span>
        </div>
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
          </div>
          <div className="chart-wrap">
            {mounted ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#e4e9f1" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="alcance" fill="#2f6fed" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="visualizacoes" fill="#1fbf75" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="curtidas" fill="#c7972d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
