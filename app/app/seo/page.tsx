"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Globe2, KeyRound, Loader2, RefreshCw, Save, SearchCheck, Sparkles } from "lucide-react";
import { AppShell, EmptyState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/app/components/ds";

type SeoSite = {
  id: string;
  name: string;
  domain: string;
  propertyUrl: string;
  sitemapUrl: string;
  seoScore: number;
  indexationScore: number;
  geoScore: number;
  sitemapScore: number;
  lastSitemapCheckAt?: string | null;
  metrics: {
    totalUrls: number;
    validUrls: number;
    warningUrls: number;
    errorUrls: number;
    openRecommendations: number;
  };
  recommendations: Array<{ id: string; title: string; description: string; impact: string; priority: string; source: string }>;
  sitemapUrls: Array<{ id: string; url: string; status: string; qualityScore: number; issues?: string[]; lastmod?: string | null }>;
};

type SeoData = {
  credentials: {
    configured: boolean;
    googleAccountEmail: string;
    googleSearchConsoleProperty: string;
    scopes: string;
    updatedAt?: string | null;
  };
  summary: {
    sites: number;
    urls: number;
    recommendations: number;
    seoScore: number;
    sitemapScore: number;
  };
  sites: SeoSite[];
};

const emptyData: SeoData = {
  credentials: {
    configured: false,
    googleAccountEmail: "",
    googleSearchConsoleProperty: "",
    scopes: ""
  },
  summary: {
    sites: 0,
    urls: 0,
    recommendations: 0,
    seoScore: 0,
    sitemapScore: 0
  },
  sites: []
};

function tone(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function statusTone(status: string) {
  if (status === "valid") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "danger";
  return "neutral";
}

function todayDateTimeLocal() {
  const date = new Date(Date.now() + 3600000);
  return date.toISOString().slice(0, 16);
}

export default function SeoIntelligencePage() {
  const [data, setData] = useState<SeoData>(emptyData);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSite, setSavingSite] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [analyzingSiteId, setAnalyzingSiteId] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [siteForm, setSiteForm] = useState({ name: "", domain: "", propertyUrl: "", sitemapUrl: "" });
  const [credentialsForm, setCredentialsForm] = useState({
    googleAccountEmail: "",
    googleSearchConsoleProperty: "",
    googleAccessToken: "",
    googleRefreshToken: "",
    googleTokenExpiresAt: todayDateTimeLocal(),
    scopes: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing"
  });

  async function loadSeo() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/seo/sites", { cache: "no-store" });
      const payload = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/seo")}`;
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Nao foi possivel carregar SEO Intelligence.");
      setData(payload);
      setCredentialsForm((current) => ({
        ...current,
        googleAccountEmail: payload.credentials?.googleAccountEmail || "",
        googleSearchConsoleProperty: payload.credentials?.googleSearchConsoleProperty || "",
        scopes: payload.credentials?.scopes || current.scopes
      }));
      setSelectedSiteId((current) => current || payload.sites?.[0]?.id || "");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar SEO Intelligence." });
    } finally {
      setLoading(false);
    }
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSite(true);
    setMessage(null);
    try {
      const response = await fetch("/api/seo/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteForm)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nao foi possivel salvar o site.");
      setSiteForm({ name: "", domain: "", propertyUrl: "", sitemapUrl: "" });
      setMessage({ type: "ok", text: "Site SEO salvo para este cliente." });
      await loadSeo();
      setSelectedSiteId(payload.site.id);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar site." });
    } finally {
      setSavingSite(false);
    }
  }

  async function saveCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCredentials(true);
    setMessage(null);
    try {
      const response = await fetch("/api/seo/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialsForm)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nao foi possivel salvar credenciais.");
      setCredentialsForm((current) => ({ ...current, googleAccessToken: "", googleRefreshToken: "" }));
      setMessage({ type: "ok", text: "Credenciais Google salvas com criptografia para este cliente." });
      await loadSeo();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar credenciais." });
    } finally {
      setSavingCredentials(false);
    }
  }

  async function analyzeSitemap(siteId: string) {
    setAnalyzingSiteId(siteId);
    setMessage(null);
    try {
      const response = await fetch("/api/seo/sitemap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nao foi possivel analisar o sitemap.");
      setMessage({ type: "ok", text: `Sitemap analisado: ${payload.result.unique} URLs unicas e score ${payload.result.sitemapScore}/100.` });
      await loadSeo();
      setSelectedSiteId(siteId);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao analisar sitemap." });
    } finally {
      setAnalyzingSiteId("");
    }
  }

  useEffect(() => {
    loadSeo();
  }, []);

  const selectedSite = useMemo(() => data.sites.find((site) => site.id === selectedSiteId) || data.sites[0], [data.sites, selectedSiteId]);

  return (
    <AppShell
      subtitle="SEO Intelligence"
      navItems={[
        { href: "/portal", label: "Portal" },
        { href: "/app/instagram", label: "Instagram Publisher" },
        { href: "/app/leads", label: "Mini CRM" },
        { href: "/app/blog", label: "Blog Automatizado" },
        { href: "/app/seo", label: "SEO Intelligence", active: true },
        { href: "/app/pagamentos", label: "Pagamentos" },
        { href: "/app/configuracoes", label: "Configuracoes" }
      ]}
      aside={
        <>
          <span>Produto ID 04</span>
          <StatusBadge status={data.credentials.configured ? "success" : "warning"}>
            {data.credentials.configured ? "Google configurado" : "Google pendente"}
          </StatusBadge>
        </>
      }
    >
      <section className="v2-page seo-page">
        <PageHeader
          eyebrow="Monitor de Visibilidade Google"
          title="SEO Intelligence & Indexacao"
          description="Acompanhe sites, sitemap, qualidade SEO/GEO e credenciais Google separadas por cliente SaaS."
          actions={
            <button className="btn secondary" disabled={loading} onClick={loadSeo}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          }
        />

        <section className="ds-metrics-grid seo-metrics">
          <MetricCard label="SEO Score" value={`${data.summary.seoScore}/100`} hint="media dos sites" tone={data.summary.seoScore ? tone(data.summary.seoScore) : "neutral"} />
          <MetricCard label="Sitemap Score" value={`${data.summary.sitemapScore}/100`} hint="qualidade das URLs" tone={data.summary.sitemapScore ? tone(data.summary.sitemapScore) : "neutral"} />
          <MetricCard label="Sites" value={data.summary.sites} hint="dominios monitorados" />
          <MetricCard label="URLs" value={data.summary.urls.toLocaleString("pt-BR")} hint="lidas no sitemap" />
          <MetricCard label="Oportunidades" value={data.summary.recommendations} hint="recomendacoes abertas" tone={data.summary.recommendations ? "warning" : "success"} />
          <MetricCard label="Google" value={data.credentials.configured ? "Conectado" : "Pendente"} hint="credencial por tenant" tone={data.credentials.configured ? "success" : "warning"} />
        </section>

        {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}

        {loading ? (
          <section className="panel">
            <LoadingState title="Carregando SEO Intelligence" />
          </section>
        ) : null}

        {!loading ? (
          <section className="seo-workspace">
            <section className="panel seo-setup-panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Globe2 size={21} />
                  <h2>Site do cliente</h2>
                </div>
              </div>
              <form className="seo-form-grid" onSubmit={saveSite}>
                <Field label="Nome" value={siteForm.name} onChange={(value) => setSiteForm({ ...siteForm, name: value })} placeholder="KPG Imoveis" />
                <Field required label="Dominio" value={siteForm.domain} onChange={(value) => setSiteForm({ ...siteForm, domain: value })} placeholder="kpgimoveis.com.br" />
                <Field label="Propriedade GSC" value={siteForm.propertyUrl} onChange={(value) => setSiteForm({ ...siteForm, propertyUrl: value })} placeholder="sc-domain:kpgimoveis.com.br" />
                <Field required label="Sitemap XML" value={siteForm.sitemapUrl} onChange={(value) => setSiteForm({ ...siteForm, sitemapUrl: value })} placeholder="https://dominio.com/sitemap.xml" />
                <button className="btn primary" disabled={savingSite} type="submit">
                  {savingSite ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  Salvar site
                </button>
              </form>
            </section>

            <section className="panel seo-setup-panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <KeyRound size={21} />
                  <h2>Credenciais Google por cliente</h2>
                </div>
                <StatusBadge status={data.credentials.configured ? "success" : "warning"}>
                  {data.credentials.configured ? "Token salvo" : "Token pendente"}
                </StatusBadge>
              </div>
              <form className="seo-form-grid" onSubmit={saveCredentials}>
                <Field label="E-mail Google" value={credentialsForm.googleAccountEmail} onChange={(value) => setCredentialsForm({ ...credentialsForm, googleAccountEmail: value })} placeholder="cliente@gmail.com" />
                <Field label="Propriedade Search Console" value={credentialsForm.googleSearchConsoleProperty} onChange={(value) => setCredentialsForm({ ...credentialsForm, googleSearchConsoleProperty: value })} placeholder="https://dominio.com/" />
                <Field label="Access token" value={credentialsForm.googleAccessToken} onChange={(value) => setCredentialsForm({ ...credentialsForm, googleAccessToken: value })} placeholder={data.credentials.configured ? "Ja salvo. Preencha apenas para substituir." : ""} />
                <Field label="Refresh token" value={credentialsForm.googleRefreshToken} onChange={(value) => setCredentialsForm({ ...credentialsForm, googleRefreshToken: value })} placeholder={data.credentials.configured ? "Ja salvo. Preencha apenas para substituir." : ""} />
                <Field label="Expira em" type="datetime-local" value={credentialsForm.googleTokenExpiresAt} onChange={(value) => setCredentialsForm({ ...credentialsForm, googleTokenExpiresAt: value })} />
                <Field label="Scopes" value={credentialsForm.scopes} onChange={(value) => setCredentialsForm({ ...credentialsForm, scopes: value })} />
                <button className="btn primary" disabled={savingCredentials} type="submit">
                  {savingCredentials ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  Salvar credenciais
                </button>
              </form>
            </section>
          </section>
        ) : null}

        {!loading ? (
          <section className="panel seo-dashboard-panel">
            <div className="panel-heading">
              <div className="panel-title">
                <SearchCheck size={21} />
                <h2>Sites monitorados</h2>
              </div>
              {selectedSite ? (
                <button className="btn success" disabled={analyzingSiteId === selectedSite.id} onClick={() => analyzeSitemap(selectedSite.id)}>
                  {analyzingSiteId === selectedSite.id ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
                  Analisar sitemap
                </button>
              ) : null}
            </div>

            {data.sites.length ? (
              <div className="seo-dashboard-layout">
                <aside className="seo-site-list">
                  {data.sites.map((site) => (
                    <button className={selectedSite?.id === site.id ? "active" : ""} key={site.id} onClick={() => setSelectedSiteId(site.id)} type="button">
                      <strong>{site.name}</strong>
                      <span>{site.domain}</span>
                      <small>{site.metrics.totalUrls} URLs | {site.sitemapScore}/100</small>
                    </button>
                  ))}
                </aside>

                {selectedSite ? (
                  <section className="seo-site-detail">
                    <div className="seo-site-hero">
                      <div>
                        <span className="eyebrow">Dominio</span>
                        <h2>{selectedSite.domain}</h2>
                        <p>{selectedSite.sitemapUrl}</p>
                      </div>
                      <StatusBadge status={tone(selectedSite.seoScore)}>{selectedSite.seoScore}/100 SEO</StatusBadge>
                    </div>

                    <div className="seo-score-grid">
                      <MetricCard label="Indexacao" value={`${selectedSite.indexationScore}/100`} tone={selectedSite.indexationScore ? tone(selectedSite.indexationScore) : "neutral"} />
                      <MetricCard label="GEO" value={`${selectedSite.geoScore}/100`} tone={selectedSite.geoScore ? tone(selectedSite.geoScore) : "neutral"} />
                      <MetricCard label="Validas" value={selectedSite.metrics.validUrls} tone="success" />
                      <MetricCard label="Alertas" value={selectedSite.metrics.warningUrls} tone={selectedSite.metrics.warningUrls ? "warning" : "success"} />
                      <MetricCard label="Erros" value={selectedSite.metrics.errorUrls} tone={selectedSite.metrics.errorUrls ? "danger" : "success"} />
                    </div>

                    <div className="seo-detail-grid">
                      <section className="seo-insight-box">
                        <h3>Oportunidades</h3>
                        {selectedSite.recommendations.length ? (
                          <div className="compact-table">
                            {selectedSite.recommendations.map((item) => (
                              <div className="table-row" key={item.id}>
                                <span>{item.title}</span>
                                <StatusBadge status={item.priority === "high" ? "warning" : item.priority === "low" ? "neutral" : "info"}>{item.priority}</StatusBadge>
                                <small>{item.description}</small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState icon={<CheckCircle2 size={22} />} title="Sem oportunidades abertas">
                            Analise o sitemap para gerar recomendacoes automaticas.
                          </EmptyState>
                        )}
                      </section>

                      <section className="seo-insight-box">
                        <h3>URLs com menor score</h3>
                        {selectedSite.sitemapUrls.length ? (
                          <div className="compact-table">
                            {selectedSite.sitemapUrls.map((item) => (
                              <div className="table-row seo-url-row" key={item.id}>
                                <span>{item.url}</span>
                                <StatusBadge status={statusTone(item.status)}>{item.qualityScore}/100</StatusBadge>
                                <small>{Array.isArray(item.issues) && item.issues.length ? item.issues.join(", ") : "Sem problemas criticos"}</small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState icon={<AlertTriangle size={22} />} title="Sitemap ainda nao analisado">
                            Clique em analisar sitemap para preencher as URLs deste cliente.
                          </EmptyState>
                        )}
                      </section>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <EmptyState icon={<Globe2 size={22} />} title="Nenhum site cadastrado">
                Cadastre o primeiro dominio para iniciar o monitoramento de indexacao.
              </EmptyState>
            )}
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required ? <span className="required-mark"> *</span> : null}
      </label>
      <input className="input" placeholder={placeholder} required={required} type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
