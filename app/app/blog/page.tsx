"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, BrainCircuit, Edit3, FileText, Globe2, HelpCircle, Loader2, RefreshCw, Save, Send, Sparkles } from "lucide-react";
import { AppShell, EmptyState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/app/components/ds";

type BlogProfile = {
  companyName: string;
  legalName: string;
  creci: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  email: string;
  siteUrl: string;
  blogUrl: string;
  googleBusinessUrl: string;
  instagramUrl: string;
  institutionalText: string;
  differentials: string;
  services: string;
  propertyTypes: string;
  regions: string;
  keywords: string;
  forbiddenTopics: string;
  tone: string;
  targetAudience: string;
  sigaImobiliariaSlug: string;
  sigaIdImob: number;
  sigaIdUsuario: number;
  sigaIdCategoria: number;
  defaultStatus: number;
  mostrarData: number;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string;
  html: string;
  topic: string;
  intent: string;
  region: string;
  propertyType: string;
  seoScore: number;
  geoScore: number;
  slugScore: number;
  editorialStatus: string;
  sigaStatus: string;
  publishedAt?: string | null;
  createdAt: string;
};

type SigaIntegration = {
  tokenConfigured: boolean;
  settingsEndpoint: string;
  publishEndpoint: string;
  detectedSlug: string;
  source: "blog-profile" | "siga-endpoint" | "tenant-slug" | "missing";
};

const emptyProfile: BlogProfile = {
  companyName: "",
  legalName: "",
  creci: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  whatsapp: "",
  email: "",
  siteUrl: "",
  blogUrl: "",
  googleBusinessUrl: "",
  instagramUrl: "",
  institutionalText: "",
  differentials: "",
  services: "",
  propertyTypes: "",
  regions: "",
  keywords: "",
  forbiddenTopics: "",
  tone: "consultivo",
  targetAudience: "",
  sigaImobiliariaSlug: "",
  sigaIdImob: 1,
  sigaIdUsuario: 1,
  sigaIdCategoria: 1,
  defaultStatus: 1,
  mostrarData: 0
};

function scoreTone(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

const stepItems = [
  {
    key: "empresa",
    title: "Etapa 1",
    label: "Empresa",
    description: "Dados da imobiliaria e autoridade local"
  },
  {
    key: "estrategia",
    title: "Etapa 2",
    label: "Estrategia",
    description: "Servicos, regioes e integracao SIGA"
  },
  {
    key: "gerador",
    title: "Etapa 3",
    label: "Gerador",
    description: "Tema, intencao, slug e conteudo"
  },
  {
    key: "historico",
    title: "Etapa 4",
    label: "Historico",
    description: "Revisao, scores e publicacao"
  }
] as const;

function stepStatus(activeTab: "empresa" | "estrategia" | "gerador" | "historico", key: string) {
  const activeIndex = stepItems.findIndex((item) => item.key === activeTab);
  const itemIndex = stepItems.findIndex((item) => item.key === key);
  if (itemIndex < activeIndex) return "done";
  if (itemIndex === activeIndex) return "active";
  return "";
}

function previewUrl(profile: BlogProfile, slug: string) {
  const base = profile.blogUrl || profile.siteUrl || "https://site-da-imobiliaria.com.br/blog";
  return `${base.replace(/\/$/, "")}/${slug}`;
}

export default function BlogPage() {
  const [profile, setProfile] = useState<BlogProfile>(emptyProfile);
  const [sigaIntegration, setSigaIntegration] = useState<SigaIntegration | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeTab, setActiveTab] = useState<"empresa" | "estrategia" | "gerador" | "historico">("empresa");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState("");
  const [savingPostId, setSavingPostId] = useState("");
  const [editingPostId, setEditingPostId] = useState("");
  const [editDraft, setEditDraft] = useState<Partial<BlogPost>>({});
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [topic, setTopic] = useState("");
  const [intent, setIntent] = useState("comprar");
  const [region, setRegion] = useState("");
  const [propertyType, setPropertyType] = useState("");

  async function loadAll() {
    setLoading(true);
    setMessage(null);
    try {
      const [profileResponse, postsResponse] = await Promise.all([
        fetch("/api/blog/profile", { cache: "no-store" }),
        fetch("/api/blog/posts", { cache: "no-store" })
      ]);
      if (profileResponse.status === 401 || postsResponse.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/blog")}`;
        return;
      }
      const profileData = await profileResponse.json();
      const postsData = await postsResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error || "Nao foi possivel carregar o perfil do blog.");
      if (!postsResponse.ok) throw new Error(postsData.error || "Nao foi possivel carregar os posts.");
      setProfile({ ...emptyProfile, ...profileData.profile });
      setSigaIntegration(profileData.integration || null);
      setPosts(postsData.posts || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar Blog Automatizado." });
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/blog/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar.");
      setProfile({ ...emptyProfile, ...data.profile });
      setSigaIntegration(data.integration || null);
      setMessage({ type: "ok", text: "Perfil SEO/GEO salvo para este cliente." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar perfil." });
    } finally {
      setSaving(false);
    }
  }

  async function generatePost() {
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, intent, region, propertyType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel gerar o post.");
      setPosts((current) => [data.post, ...current]);
      setActiveTab("historico");
      setEditingPostId(data.post.id);
      setEditDraft(data.post);
      setMessage({ type: "ok", text: "Post gerado. Revise e edite o texto antes de publicar no SIGA." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao gerar post." });
    } finally {
      setGenerating(false);
    }
  }

  async function savePost(postId: string, patch: Partial<BlogPost>, options: { silent?: boolean } = {}) {
    setSavingPostId(postId);
    setMessage(null);
    try {
      const response = await fetch(`/api/blog/posts/${encodeURIComponent(postId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar o post.");
      setPosts((current) => current.map((item) => (item.id === postId ? data.post : item)));
      setEditingPostId("");
      setEditDraft({});
      if (!options.silent) setMessage({ type: "ok", text: "Post revisado salvo. Agora ele pode ser publicado no SIGA." });
      return data.post as BlogPost;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar post." });
      return null;
    } finally {
      setSavingPostId("");
    }
  }

  async function publishPost(postId: string, status = 1) {
    setPublishingId(postId);
    setMessage(null);
    try {
      const response = await fetch(`/api/blog/posts/${encodeURIComponent(postId)}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel enviar para o SIGA.");
      setPosts((current) => current.map((item) => (item.id === postId ? data.post : item)));
      setMessage({ type: "ok", text: status === 1 ? "Post publicado no SIGA." : "Post enviado ao SIGA." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao enviar para o SIGA." });
    } finally {
      setPublishingId("");
    }
  }

  async function saveAndPublishPost(postId: string, patch: Partial<BlogPost>) {
    const saved = await savePost(postId, patch, { silent: true });
    if (saved) await publishPost(postId, 1);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const latestPost = posts[0];
  const averageSeo = useMemo(() => Math.round(posts.reduce((sum, item) => sum + item.seoScore, 0) / Math.max(1, posts.length)), [posts]);
  const averageGeo = useMemo(() => Math.round(posts.reduce((sum, item) => sum + item.geoScore, 0) / Math.max(1, posts.length)), [posts]);
  const averageSlug = useMemo(() => Math.round(posts.reduce((sum, item) => sum + item.slugScore, 0) / Math.max(1, posts.length)), [posts]);

  return (
    <AppShell
      subtitle="Blog Automatizado"
      navItems={[
        { href: "/portal", label: "Portal" },
        { href: "/app/instagram", label: "Instagram Publisher" },
        { href: "/app/leads", label: "Mini CRM" },
        { href: "/app/blog", label: "Blog Automatizado", active: true },
        { href: "/app/pagamentos", label: "Pagamentos" },
        { href: "/app/configuracoes", label: "Configuracoes" }
      ]}
      aside={
        <>
          <span>Produto ID 03</span>
          <StatusBadge status="info">SEO/GEO ativo</StatusBadge>
        </>
      }
    >
      <PageHeader
        eyebrow="Produto 03"
        title="Blog Automatizado SEO/GEO"
        description="Crie posts imobiliarios autorais, com slug estrategico, score de qualidade e payload pronto para publicacao no Blog SIGA."
        actions={
          <>
            <button className="btn secondary" disabled={loading} onClick={loadAll}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
            <button className="btn primary" disabled={saving} onClick={saveProfile}>
              {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
              Salvar perfil
            </button>
          </>
        }
      />

      <section className="ds-metrics-grid blog-metrics">
        <MetricCard label="Posts" value={posts.length.toLocaleString("pt-BR")} hint="posts gerados" />
        <MetricCard label="SEO medio" value={`${averageSeo}/100`} hint="qualidade organica" tone={scoreTone(averageSeo)} />
        <MetricCard label="GEO medio" value={`${averageGeo}/100`} hint="leitura por IA" tone={scoreTone(averageGeo)} />
        <MetricCard label="Slug medio" value={`${averageSlug}/100`} hint="URL estrategica" tone={scoreTone(averageSlug)} />
        <MetricCard label="Status padrao" value={profile.defaultStatus === 1 ? "Publicado" : "Rascunho"} hint="envio SIGA" tone={profile.defaultStatus === 1 ? "warning" : "info"} />
        <MetricCard label="Cidade" value={profile.city || "-"} hint="entidade local" />
      </section>

      {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}
      {loading ? (
        <section className="panel">
          <LoadingState title="Carregando Blog Automatizado" />
        </section>
      ) : null}

      {!loading ? (
        <section className="panel blog-panel">
          <div className="blog-stepper" aria-label="Fluxo do Blog Automatizado">
            {stepItems.map((item, index) => (
              <button
                className={`blog-step ${stepStatus(activeTab, item.key)}`}
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                type="button"
              >
                <span className="blog-step-index">{index + 1}</span>
                <span>
                  <strong>{item.title} - {item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="crm-view-tabs" aria-label="Abas do Blog Automatizado">
            <button className={activeTab === "empresa" ? "active" : ""} onClick={() => setActiveTab("empresa")} type="button">
              <Globe2 size={17} />
              Etapa 1 - Empresa
            </button>
            <button className={activeTab === "estrategia" ? "active" : ""} onClick={() => setActiveTab("estrategia")} type="button">
              <BrainCircuit size={17} />
              Etapa 2 - Estrategia
            </button>
            <button className={activeTab === "gerador" ? "active" : ""} onClick={() => setActiveTab("gerador")} type="button">
              <Sparkles size={17} />
              Etapa 3 - Gerador
            </button>
            <button className={activeTab === "historico" ? "active" : ""} onClick={() => setActiveTab("historico")} type="button">
              <FileText size={17} />
              Etapa 4 - Historico
            </button>
          </div>

          {activeTab === "empresa" ? <CompanyTab profile={profile} setProfile={setProfile} /> : null}
          {activeTab === "estrategia" ? <StrategyTab profile={profile} setProfile={setProfile} sigaIntegration={sigaIntegration} /> : null}
          {activeTab === "gerador" ? (
            <GeneratorTab
              generating={generating}
              intent={intent}
              latestPost={latestPost}
              profile={profile}
              propertyType={propertyType}
              region={region}
              setIntent={setIntent}
              setPropertyType={setPropertyType}
              setRegion={setRegion}
              setTopic={setTopic}
              topic={topic}
              onGenerate={generatePost}
            />
          ) : null}
          {activeTab === "historico" ? (
            <HistoryTab
              editDraft={editDraft}
              editingPostId={editingPostId}
              posts={posts}
              profile={profile}
              publishingId={publishingId}
              savingPostId={savingPostId}
              setEditDraft={setEditDraft}
              setEditingPostId={setEditingPostId}
              onPublish={publishPost}
              onSavePost={savePost}
              onSaveAndPublish={saveAndPublishPost}
            />
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}

function updateProfile<K extends keyof BlogProfile>(setProfile: (next: BlogProfile) => void, profile: BlogProfile, key: K, value: BlogProfile[K]) {
  setProfile({ ...profile, [key]: value });
}

function CompanyTab({ profile, setProfile }: { profile: BlogProfile; setProfile: (profile: BlogProfile) => void }) {
  return (
    <div className="blog-tab-grid">
      <Field required label="Nome da imobiliaria" help="Nome que aparecera nos posts, CTAs e sinais de entidade da marca para SEO/GEO." value={profile.companyName} onChange={(value) => updateProfile(setProfile, profile, "companyName", value)} />
      <Field label="Razao social" help="Ajuda a documentar a empresa no SaaS. Pode ser usada em futuras validacoes cadastrais." value={profile.legalName} onChange={(value) => updateProfile(setProfile, profile, "legalName", value)} />
      <Field required label="CRECI" help="Reforca credibilidade e confianca do conteudo imobiliario perante usuarios e motores de IA." value={profile.creci} onChange={(value) => updateProfile(setProfile, profile, "creci", value)} />
      <Field required label="Cidade principal" help="Entidade local mais importante. Sera usada em slugs, titulos, FAQs e contexto GEO." value={profile.city} onChange={(value) => updateProfile(setProfile, profile, "city", value)} />
      <Field required label="Estado" help="Complementa a localizacao e evita ambiguidades entre cidades com nomes semelhantes." value={profile.state} onChange={(value) => updateProfile(setProfile, profile, "state", value)} />
      <Field label="Telefone" help="Telefone institucional para contato e possivel exibicao em CTAs." value={profile.phone} onChange={(value) => updateProfile(setProfile, profile, "phone", value)} />
      <Field required label="WhatsApp" help="Canal principal de conversao. O sistema usa esse dado para gerar chamadas de contato." value={profile.whatsapp} onChange={(value) => updateProfile(setProfile, profile, "whatsapp", value)} />
      <Field label="E-mail" help="Contato institucional do cliente. Ajuda a manter o cadastro completo." value={profile.email} onChange={(value) => updateProfile(setProfile, profile, "email", value)} />
      <Field required label="URL do site" help="Site oficial da imobiliaria. Pode ser usado no schema, links internos e autoridade da marca." value={profile.siteUrl} onChange={(value) => updateProfile(setProfile, profile, "siteUrl", value)} />
      <Field required label="URL base do blog" help="Endereco onde as URLs finais dos posts serao previsualizadas, por exemplo https://site.com.br/blog." value={profile.blogUrl} onChange={(value) => updateProfile(setProfile, profile, "blogUrl", value)} />
      <Field label="Google Business Profile" help="Ajuda a conectar a marca a sinais locais. Em fases futuras podera alimentar auditoria de presenca local." value={profile.googleBusinessUrl} onChange={(value) => updateProfile(setProfile, profile, "googleBusinessUrl", value)} />
      <Field label="Instagram" help="Referencia social da imobiliaria. Pode apoiar CTAs e consistencia de marca." value={profile.instagramUrl} onChange={(value) => updateProfile(setProfile, profile, "instagramUrl", value)} />
      <Field required wide label="Endereco completo" help="Endereco usado para contexto local, schema e credibilidade institucional." value={profile.address} onChange={(value) => updateProfile(setProfile, profile, "address", value)} />
      <TextArea required wide label="Descricao institucional" help="Explique quem e a imobiliaria, onde atua e qual promessa entrega. Isso guia a IA na criacao dos posts." value={profile.institutionalText} onChange={(value) => updateProfile(setProfile, profile, "institutionalText", value)} />
      <TextArea required wide label="Diferenciais da imobiliaria" help="Liste pontos fortes reais: atendimento consultivo, experiencia local, alto padrao, investimento, documentacao, etc." value={profile.differentials} onChange={(value) => updateProfile(setProfile, profile, "differentials", value)} />
    </div>
  );
}

function integrationSourceLabel(source?: SigaIntegration["source"]) {
  if (source === "blog-profile") return "Perfil do Blog Automatizado";
  if (source === "siga-endpoint") return "Endpoint SIGA cadastrado";
  if (source === "tenant-slug") return "Slug do cliente no SaaS";
  return "Nao identificado";
}

function StrategyTab({
  profile,
  setProfile,
  sigaIntegration
}: {
  profile: BlogProfile;
  setProfile: (profile: BlogProfile) => void;
  sigaIntegration: SigaIntegration | null;
}) {
  return (
    <>
      <section className="blog-integration-banner">
        <div>
          <span className="eyebrow">Integracao SIGA detectada automaticamente</span>
          <strong>{sigaIntegration?.publishEndpoint || "Endpoint de publicacao ainda nao identificado"}</strong>
          <small>
            Origem: {integrationSourceLabel(sigaIntegration?.source)}. Token SIGA: {sigaIntegration?.tokenConfigured ? "configurado nas Configuracoes do cliente" : "pendente nas Configuracoes do cliente"}.
          </small>
        </div>
        <StatusBadge status={sigaIntegration?.tokenConfigured && sigaIntegration.detectedSlug ? "success" : "warning"}>
          {sigaIntegration?.tokenConfigured && sigaIntegration.detectedSlug ? "Pronto para publicar" : "Configurar SIGA"}
        </StatusBadge>
      </section>
      <div className="blog-tab-grid">
        <TextArea required label="Servicos prestados" help="Servicos que a IA pode promover: venda, locacao, avaliacao, administracao, consultoria para investidores." value={profile.services} onChange={(value) => updateProfile(setProfile, profile, "services", value)} />
        <TextArea required label="Tipos de imoveis" help="Tipos de imovel que devem aparecer nos temas, slugs e posts: apartamentos, casas, terrenos, coberturas." value={profile.propertyTypes} onChange={(value) => updateProfile(setProfile, profile, "propertyTypes", value)} />
        <TextArea required label="Cidades, bairros e regioes" help="Base da estrategia local. Informe cidades, bairros, condominios e regioes com prioridade comercial." value={profile.regions} onChange={(value) => updateProfile(setProfile, profile, "regions", value)} />
        <TextArea required label="Palavras-chave prioritarias" help="Termos que o cliente deseja fortalecer no Google e em motores de IA. Separe por virgulas ou linhas." value={profile.keywords} onChange={(value) => updateProfile(setProfile, profile, "keywords", value)} />
        <Field required label="Publico-alvo" help="Perfil de quem deve ser atraido: investidores, familias, alto padrao, compradores de primeira viagem, temporada." value={profile.targetAudience} onChange={(value) => updateProfile(setProfile, profile, "targetAudience", value)} />
        <div className="field">
          <FieldLabel required label="Tom de voz" help="Define o estilo dos textos gerados: consultivo, premium, educativo ou direto." />
          <select className="select" id="blog-tone" value={profile.tone} onChange={(event) => updateProfile(setProfile, profile, "tone", event.target.value)}>
            <option value="consultivo">Consultivo</option>
            <option value="premium">Premium</option>
            <option value="educativo">Educativo</option>
            <option value="direto">Direto</option>
          </select>
        </div>
        <Field required label="Slug da imobiliaria na API SIGA" help="Preenchido automaticamente pelo cadastro do cliente quando possivel. Edite apenas se o slug da API SIGA for diferente do slug do SaaS." value={profile.sigaImobiliariaSlug} onChange={(value) => updateProfile(setProfile, profile, "sigaImobiliariaSlug", value)} />
        <NumberField required label="ID Imob" help="ID da imobiliaria no SIGA CRM. Vai no campo idimob do payload de publicacao." value={profile.sigaIdImob} onChange={(value) => updateProfile(setProfile, profile, "sigaIdImob", value)} />
        <NumberField required label="ID Usuario" help="Autor padrao do post no SIGA CRM. Vai no campo idUsuario." value={profile.sigaIdUsuario} onChange={(value) => updateProfile(setProfile, profile, "sigaIdUsuario", value)} />
        <NumberField required label="ID Categoria" help="Categoria do blog no SIGA. Use o ID da categoria onde os posts serao cadastrados." value={profile.sigaIdCategoria} onChange={(value) => updateProfile(setProfile, profile, "sigaIdCategoria", value)} />
        <div className="field">
          <FieldLabel required label="Status padrao no SIGA" help="Recomendado: Publicado. O cliente revisa o texto no SaaS antes de publicar no Blog SIGA." />
          <select className="select" id="blog-default-status" value={profile.defaultStatus} onChange={(event) => updateProfile(setProfile, profile, "defaultStatus", Number(event.target.value))}>
            <option value={0}>Rascunho</option>
            <option value={1}>Publicado</option>
          </select>
        </div>
        <div className="field">
          <FieldLabel required label="Mostrar data" help="Define se a data aparecera no blog. Para conteudo evergreen, normalmente use Nao." />
          <select className="select" id="blog-show-date" value={profile.mostrarData} onChange={(event) => updateProfile(setProfile, profile, "mostrarData", Number(event.target.value))}>
            <option value={0}>Nao</option>
            <option value={1}>Sim</option>
          </select>
        </div>
        <TextArea wide label="Temas proibidos" help="Assuntos que a IA deve evitar: politica, promessas de rentabilidade, termos juridicos sensiveis ou regioes que o cliente nao atende." value={profile.forbiddenTopics} onChange={(value) => updateProfile(setProfile, profile, "forbiddenTopics", value)} />
      </div>
    </>
  );
}

function GeneratorTab(props: {
  generating: boolean;
  intent: string;
  latestPost?: BlogPost;
  profile: BlogProfile;
  propertyType: string;
  region: string;
  topic: string;
  setIntent: (value: string) => void;
  setPropertyType: (value: string) => void;
  setRegion: (value: string) => void;
  setTopic: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="blog-generator-layout">
      <section className="blog-generator-form">
        <Field required label="Tema do post" help="Informe o assunto principal. Quanto mais claro o tema, melhor sera o titulo, slug e conteudo." value={props.topic} onChange={props.setTopic} placeholder="Ex: vale a pena investir em apartamento em Gramado" />
        <div className="blog-inline-grid">
          <div className="field">
            <FieldLabel required label="Intencao" help="A intencao orienta o SEO: comprar, vender, alugar, investir, morar, avaliar ou financiar." />
            <select className="select" id="blog-intent" value={props.intent} onChange={(event) => props.setIntent(event.target.value)}>
              <option value="comprar">Comprar</option>
              <option value="vender">Vender</option>
              <option value="alugar">Alugar</option>
              <option value="investir">Investir</option>
              <option value="morar">Morar</option>
              <option value="avaliar">Avaliar</option>
              <option value="financiar">Financiar</option>
            </select>
          </div>
          <Field required label="Regiao" help="Cidade, bairro ou condominio que entrara no slug, titulo e contexto local do post." value={props.region} onChange={props.setRegion} placeholder={props.profile.city || "Gramado"} />
          <Field required label="Tipo de imovel" help="Tipo que deseja fortalecer no post: apartamento, casa, terreno, cobertura, imovel comercial." value={props.propertyType} onChange={props.setPropertyType} placeholder="apartamento, casa, terreno" />
        </div>
        <button className="btn primary blog-generate-button" disabled={props.generating} onClick={props.onGenerate}>
          {props.generating ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
          Gerar post SEO/GEO
        </button>
      </section>
      <section className="blog-preview-box">
        <span className="eyebrow">Ultimo post gerado</span>
        {props.latestPost ? (
          <>
            <h3>{props.latestPost.title}</h3>
            <p>{props.latestPost.description}</p>
            <div className="blog-score-row">
              <StatusBadge status={scoreTone(props.latestPost.seoScore)}>{props.latestPost.seoScore}/100 SEO</StatusBadge>
              <StatusBadge status={scoreTone(props.latestPost.geoScore)}>{props.latestPost.geoScore}/100 GEO</StatusBadge>
              <StatusBadge status={scoreTone(props.latestPost.slugScore)}>{props.latestPost.slugScore}/100 Slug</StatusBadge>
            </div>
            <code>{previewUrl(props.profile, props.latestPost.slug)}</code>
          </>
        ) : (
          <EmptyState icon={<BookOpenText size={22} />} title="Nenhum post ainda">
            Gere o primeiro post para visualizar titulo, slug, description e scores.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function HistoryTab({
  editDraft,
  editingPostId,
  posts,
  profile,
  publishingId,
  savingPostId,
  setEditDraft,
  setEditingPostId,
  onPublish,
  onSavePost,
  onSaveAndPublish
}: {
  editDraft: Partial<BlogPost>;
  editingPostId: string;
  posts: BlogPost[];
  profile: BlogProfile;
  publishingId: string;
  savingPostId: string;
  setEditDraft: (draft: Partial<BlogPost>) => void;
  setEditingPostId: (id: string) => void;
  onPublish: (postId: string, status?: number) => void;
  onSavePost: (postId: string, patch: Partial<BlogPost>) => void;
  onSaveAndPublish: (postId: string, patch: Partial<BlogPost>) => void;
}) {
  if (!posts.length) {
    return (
      <EmptyState icon={<FileText size={22} />} title="Nenhum post gerado">
        Os posts SEO/GEO aparecem aqui depois da primeira geracao.
      </EmptyState>
    );
  }

  return (
    <div className="blog-history-list">
      {posts.map((post) => {
        const editing = editingPostId === post.id;
        const draft = editing ? { ...post, ...editDraft } : post;
        const publishedInSiga = post.sigaStatus === "sent";
        return (
          <article className="blog-history-card" key={post.id}>
            <div>
              <span className="eyebrow">{new Date(post.createdAt).toLocaleString("pt-BR")}</span>
              {editing ? (
                <div className="blog-editor-grid">
                  <Field label="Titulo" value={draft.title || ""} onChange={(value) => setEditDraft({ ...draft, title: value })} />
                  <Field label="Slug" value={draft.slug || ""} onChange={(value) => setEditDraft({ ...draft, slug: value })} />
                  <TextArea wide label="Description" value={draft.description || ""} onChange={(value) => setEditDraft({ ...draft, description: value })} />
                  <TextArea wide label="Tags" value={draft.tags || ""} onChange={(value) => setEditDraft({ ...draft, tags: value })} />
                  <RichTextEditor value={draft.html || ""} onChange={(value) => setEditDraft({ ...draft, html: value })} />
                </div>
              ) : (
                <>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <code>{previewUrl(profile, post.slug)}</code>
                  <section className="blog-post-preview" dangerouslySetInnerHTML={{ __html: post.html }} />
                  <div className="hashtags blog-tags">
                    {post.tags.split(",").slice(0, 5).map((tag) => (
                      <span className="tag" key={`${post.id}-${tag}`}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="blog-history-actions">
              <StatusBadge status={scoreTone(post.seoScore)}>{post.seoScore}/100 SEO</StatusBadge>
              <StatusBadge status={scoreTone(post.geoScore)}>{post.geoScore}/100 GEO</StatusBadge>
              <StatusBadge status={scoreTone(post.slugScore)}>{post.slugScore}/100 Slug</StatusBadge>
              <StatusBadge status={publishedInSiga ? "success" : post.sigaStatus === "error" ? "danger" : post.sigaStatus === "sent" ? "info" : "neutral"}>
                {publishedInSiga ? "Publicado no SIGA" : post.sigaStatus === "error" ? "Erro SIGA" : "Nao publicado"}
              </StatusBadge>
              {editing ? (
                <>
                  <button className="btn primary" disabled={savingPostId === post.id} onClick={() => onSavePost(post.id, draft)}>
                    {savingPostId === post.id ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    Salvar revisao
                  </button>
                  <button className="btn success" disabled={savingPostId === post.id || publishingId === post.id} onClick={() => onSaveAndPublish(post.id, draft)} title="Salva a revisao e publica no SIGA agora">
                    {savingPostId === post.id || publishingId === post.id ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                    Publicar agora
                  </button>
                  <button className="btn secondary" onClick={() => { setEditingPostId(""); setEditDraft({}); }}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button className="btn secondary" onClick={() => { setEditingPostId(post.id); setEditDraft(post); }}>
                    <Edit3 size={16} />
                    Editar texto
                  </button>
                  <button className="btn success" disabled={publishingId === post.id || publishedInSiga} onClick={() => onPublish(post.id, 1)} title="Publica o post no SIGA com status publicado">
                    {publishingId === post.id ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                    Publicar no SIGA
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="blog-help-tip" tabIndex={0}>
      <HelpCircle size={14} />
      <span className="blog-help-popover">{text}</span>
    </span>
  );
}

function FieldLabel({ label, required, help }: { label: string; required?: boolean; help?: string }) {
  return (
    <span className="blog-field-label">
      <span>
        {label}
        {required ? <span className="required-mark"> *</span> : null}
      </span>
      {help ? <HelpTip text={help} /> : null}
    </span>
  );
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div className="field wide">
      <FieldLabel
        label="Texto completo do post"
        help="Edite o texto visualmente. Negritos, titulos, listas e links sao preservados para publicacao no Blog SIGA."
      />
      <div
        ref={editorRef}
        className="blog-rich-editor blog-post-preview"
        contentEditable
        role="textbox"
        aria-label="Texto completo do post"
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
  placeholder,
  required,
  help
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  placeholder?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>
        <FieldLabel label={label} required={required} help={help} />
      </label>
      <input className="input" placeholder={placeholder} required={required} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange, required, help }: { label: string; value: number; onChange: (value: number) => void; required?: boolean; help?: string }) {
  return (
    <div className="field">
      <label>
        <FieldLabel label={label} required={required} help={help} />
      </label>
      <input className="input" min={1} required={required} type="number" value={value || 1} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function TextArea({ label, value, onChange, wide, required, help }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean; required?: boolean; help?: string }) {
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label>
        <FieldLabel label={label} required={required} help={help} />
      </label>
      <textarea className="textarea blog-textarea" required={required} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
