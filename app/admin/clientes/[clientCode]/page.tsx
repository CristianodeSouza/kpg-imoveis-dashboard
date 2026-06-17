"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Building2, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { LogoutButton } from "@/app/components/LogoutButton";

type AdminService = {
  slug: string;
  name: string;
  description?: string;
  status: string;
};

type TenantDetail = {
  id: string;
  clientCode?: string;
  name: string;
  slug: string;
  status: string;
  billingStatus: string;
  document: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  monthlyValueCents: number;
  acquiredAt?: string;
  notes: string;
  users: Array<{ id: string; name: string; username: string; role: string; createdAt: string }>;
  services: Array<{ slug: string; name: string; status: string; plan: string; priceCents: number; expiresAt?: string }>;
  integrations: { siga: boolean; instagram: boolean; whatsapp: boolean };
  settings: {
    companyName: string;
    sigaEndpoint: string;
    sigaTokenConfigured: boolean;
    metaAppId: string;
    metaAppSecretConfigured: boolean;
    instagramAccountId: string;
    instagramAccessTokenConfigured: boolean;
    whatsappNumber: string;
  };
  instagramUsage?: {
    planName: string;
    monthlyLimit: number;
    used: number;
    remaining: number;
    exceeded: boolean;
    cycleStart: string;
    cycleEnd: string;
  };
  publicationLogs: Array<{
    id: string;
    title: string;
    propertyCode: string;
    caption: string;
    instagramPostId: string;
    instagramUrl: string;
    mediaType: string;
    photosCount: number;
    status: string;
    createdAt: string;
  }>;
  paymentSummary?: {
    billingStatus: string;
    monthlyValueCents: number;
    cycleStart: string;
    cycleEnd: string;
    currentCyclePaid: boolean;
    paymentsCount: number;
    lastPaymentAt?: string | null;
  };
  paymentRecords: Array<{
    id: string;
    description: string;
    amountCents: number;
    paidAt?: string | null;
    dueAt?: string | null;
    status: string;
    method: string;
    receiptUrl: string;
    notes: string;
    createdAt: string;
  }>;
  activityLogs: Array<{ id: string; action: string; target?: string; username?: string; createdAt: string }>;
};

type SettingsDraft = {
  companyName: string;
  sigaEndpoint: string;
  sigaToken: string;
  metaAppId: string;
  metaAppSecret: string;
  instagramAccountId: string;
  instagramAccessToken: string;
  whatsappNumber: string;
};

type Draft = Partial<Omit<TenantDetail, "settings">> & { monthlyValueText?: string; settings?: SettingsDraft };

type PaymentDraft = {
  description: string;
  amount: string;
  paidAt: string;
  dueAt: string;
  status: string;
  method: string;
  receiptUrl: string;
  notes: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function dateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function billingLabel(status: string) {
  if (status === "active") return "Em dia";
  if (status === "trial") return "Teste";
  if (status === "overdue") return "Em atraso";
  if (status === "suspended") return "Suspenso";
  return status;
}

function activeServicesCount(tenant: TenantDetail) {
  return tenant.services.filter((service) => service.status === "active" && !["portal", "settings"].includes(service.slug)).length;
}

function usagePercent(tenant: TenantDetail) {
  if (!tenant.instagramUsage) return 0;
  return Math.min(100, Math.round((tenant.instagramUsage.used / Math.max(1, tenant.instagramUsage.monthlyLimit)) * 100));
}

function settingsDraftFromTenant(tenant: TenantDetail): SettingsDraft {
  return {
    companyName: tenant.settings?.companyName || tenant.name,
    sigaEndpoint: tenant.settings?.sigaEndpoint || "",
    sigaToken: "",
    metaAppId: tenant.settings?.metaAppId || "",
    metaAppSecret: "",
    instagramAccountId: tenant.settings?.instagramAccountId || "",
    instagramAccessToken: "",
    whatsappNumber: tenant.settings?.whatsappNumber || ""
  };
}

function paymentDraftFromTenant(tenant: TenantDetail): PaymentDraft {
  return {
    description: `Mensalidade ${tenant.name}`,
    amount: String((tenant.monthlyValueCents || 0) / 100),
    paidAt: new Date().toISOString().slice(0, 10),
    dueAt: "",
    status: "paid",
    method: "",
    receiptUrl: "",
    notes: ""
  };
}

export default function ClientDetailPage() {
  const params = useParams<{ clientCode: string }>();
  const clientCode = String(params.clientCode || "").toUpperCase();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [services, setServices] = useState<AdminService[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function loadClient() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/tenants/${encodeURIComponent(clientCode)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        window.location.href = `/login?next=${encodeURIComponent(`/admin/clientes/${clientCode}`)}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar cliente.");
      setTenant(data.tenant);
      setServices(data.services || []);
      setDraft({ monthlyValueText: String((data.tenant.monthlyValueCents || 0) / 100), settings: settingsDraftFromTenant(data.tenant) });
      setPaymentDraft(paymentDraftFromTenant(data.tenant));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar cliente." });
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(patch: Draft) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateSettings(field: keyof SettingsDraft, value: string) {
    setDraft((current) => ({ ...current, settings: { ...(current.settings || settingsDraftFromTenant(tenant as TenantDetail)), [field]: value } }));
  }

  function updatePaymentDraft(field: keyof PaymentDraft, value: string) {
    setPaymentDraft((current) => ({ ...(current || paymentDraftFromTenant(tenant as TenantDetail)), [field]: value }));
  }

  function toggleService(slug: string) {
    if (!tenant) return;
    const draftServices = (draft.services as TenantDetail["services"] | undefined) || tenant.services;
    const exists = draftServices.find((service) => service.slug === slug);
    const next = exists
      ? draftServices.map((service) => (service.slug === slug ? { ...service, status: service.status === "active" ? "blocked" : "active" } : service))
      : [...draftServices, { slug, name: services.find((service) => service.slug === slug)?.name || slug, status: "active", plan: "starter", priceCents: 0 }];
    updateDraft({ services: next });
  }

  function serviceEnabled(slug: string) {
    if (!tenant) return false;
    return ((draft.services as TenantDetail["services"] | undefined) || tenant.services).some((item) => item.slug === slug && item.status === "active");
  }

  function updateServicePlan(slug: string, plan: string) {
    if (!tenant) return;
    const draftServices = (draft.services as TenantDetail["services"] | undefined) || tenant.services;
    const next = draftServices.map((service) => (service.slug === slug ? { ...service, plan } : service));
    updateDraft({ services: next });
  }

  async function saveClient() {
    if (!tenant) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/tenants/${encodeURIComponent(clientCode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name ?? tenant.name,
          status: draft.status ?? tenant.status,
          billingStatus: draft.billingStatus ?? tenant.billingStatus,
          document: draft.document ?? tenant.document,
          contactName: draft.contactName ?? tenant.contactName,
          contactEmail: draft.contactEmail ?? tenant.contactEmail,
          contactPhone: draft.contactPhone ?? tenant.contactPhone,
          monthlyValue: draft.monthlyValueText ?? String(tenant.monthlyValueCents / 100),
          acquiredAt: draft.acquiredAt ?? dateInput(tenant.acquiredAt),
          notes: draft.notes ?? tenant.notes,
          settings: draft.settings,
          services: services.map((service) => {
            const current = ((draft.services as TenantDetail["services"] | undefined) || tenant.services).find((item) => item.slug === service.slug);
            return { slug: service.slug, enabled: serviceEnabled(service.slug), plan: current?.plan || "starter" };
          })
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar cliente.");
      setTenant(data.tenant);
      setDraft({ monthlyValueText: String((data.tenant.monthlyValueCents || 0) / 100), settings: settingsDraftFromTenant(data.tenant) });
      setMessage({ type: "ok", text: "Ficha do cliente atualizada." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar cliente." });
    } finally {
      setSaving(false);
    }
  }

  async function createPayment() {
    if (!tenant || !paymentDraft) return;
    setSavingPayment(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/tenants/${encodeURIComponent(clientCode)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDraft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel registrar pagamento.");
      setMessage({ type: "ok", text: "Pagamento registrado e liberado no painel do cliente." });
      await loadClient();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao registrar pagamento." });
    } finally {
      setSavingPayment(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [clientCode]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>Ficha do cliente</span>
        </div>
        <nav className="tool-nav" aria-label="Ficha do cliente">
          <a className="tool-link" href="/admin">
            Admin
          </a>
          <LogoutButton />
        </nav>
      </header>

      <section className="workspace admin-workspace">
        <a className="back-link" href="/admin">
          <ArrowLeft size={17} />
          Voltar ao painel
        </a>

        {loading ? (
          <section className="panel empty-state">
            <Loader2 className="spin" size={24} />
            <strong>Carregando ficha do cliente</strong>
          </section>
        ) : null}

        {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}

        {tenant ? (
          <>
            <section className="panel client-detail-hero">
              <div className="tenant-card-main">
                <span className="portal-card-icon">
                  <Building2 size={21} />
                </span>
                <div>
                  <span className="eyebrow">Cliente</span>
                  <h1>{tenant.name}</h1>
                  <small>
                    ID {tenant.clientCode} | {tenant.slug} | {tenant.users.length} usuario(s)
                  </small>
                </div>
              </div>
              <button className="btn secondary" disabled={loading} onClick={loadClient} type="button">
                <RefreshCw size={17} />
                Atualizar
              </button>
            </section>

            <section className="admin-summary-strip">
              <div>
                <span className="eyebrow">Valor mensal</span>
                <strong>{money(tenant.monthlyValueCents)}</strong>
              </div>
              <div>
                <span className="eyebrow">Financeiro</span>
                <strong>{billingLabel(tenant.billingStatus)}</strong>
              </div>
              <div>
                <span className="eyebrow">Servicos ativos</span>
                <strong>{activeServicesCount(tenant)}</strong>
              </div>
              <div>
                <span className="eyebrow">Aquisicao</span>
                <strong>{tenant.acquiredAt ? new Date(tenant.acquiredAt).toLocaleDateString("pt-BR") : "Pendente"}</strong>
              </div>
              <div>
                <span className="eyebrow">Posts Instagram</span>
                <strong>{tenant.instagramUsage ? `${tenant.instagramUsage.used}/${tenant.instagramUsage.monthlyLimit}` : "0/0"}</strong>
              </div>
            </section>

            {tenant.instagramUsage ? (
              <section className="usage-panel">
                <div className="usage-header">
                  <div>
                    <span className="eyebrow">Assinatura de publicacoes</span>
                    <h3>Pacote {tenant.instagramUsage.planName}</h3>
                  </div>
                  <strong>{tenant.instagramUsage.remaining} restantes</strong>
                </div>
                <div className="usage-bar">
                  <span style={{ width: `${usagePercent(tenant)}%` }} />
                </div>
                <div className="usage-details">
                  <span>
                    Ciclo: {new Date(tenant.instagramUsage.cycleStart).toLocaleDateString("pt-BR")} ate{" "}
                    {new Date(tenant.instagramUsage.cycleEnd).toLocaleDateString("pt-BR")}
                  </span>
                  <span>{tenant.instagramUsage.exceeded ? "Limite ultrapassado" : "Dentro do pacote contratado"}</span>
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <ShieldCheck size={22} />
                  <h2>Dados e financeiro</h2>
                </div>
                <button className="btn success" disabled={saving} onClick={saveClient} type="button">
                  {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  Salvar ficha
                </button>
              </div>

              <div className="tenant-edit-grid">
                <div className="field">
                  <label>Status</label>
                  <select className="select" value={String(draft.status ?? tenant.status)} onChange={(event) => updateDraft({ status: event.target.value })}>
                    <option value="active">Ativo</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Financeiro</label>
                  <select className="select" value={String(draft.billingStatus ?? tenant.billingStatus)} onChange={(event) => updateDraft({ billingStatus: event.target.value })}>
                    <option value="active">Em dia</option>
                    <option value="trial">Teste</option>
                    <option value="overdue">Em atraso</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cliente</label>
                  <input className="input" value={String(draft.name ?? tenant.name)} onChange={(event) => updateDraft({ name: event.target.value })} />
                </div>
                <div className="field">
                  <label>CPF/CNPJ</label>
                  <input className="input" value={String(draft.document ?? tenant.document)} onChange={(event) => updateDraft({ document: event.target.value })} />
                </div>
                <div className="field">
                  <label>Responsavel</label>
                  <input className="input" value={String(draft.contactName ?? tenant.contactName)} onChange={(event) => updateDraft({ contactName: event.target.value })} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input className="input" value={String(draft.contactEmail ?? tenant.contactEmail)} onChange={(event) => updateDraft({ contactEmail: event.target.value })} />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input className="input" value={String(draft.contactPhone ?? tenant.contactPhone)} onChange={(event) => updateDraft({ contactPhone: event.target.value })} />
                </div>
                <div className="field">
                  <label>Valor mensal</label>
                  <input className="input" value={String(draft.monthlyValueText ?? tenant.monthlyValueCents / 100)} onChange={(event) => updateDraft({ monthlyValueText: event.target.value })} />
                </div>
                <div className="field">
                  <label>Aquisicao</label>
                  <input className="input" type="date" value={String(draft.acquiredAt ?? dateInput(tenant.acquiredAt))} onChange={(event) => updateDraft({ acquiredAt: event.target.value })} />
                </div>
                <div className="field wide">
                  <label>Observacoes</label>
                  <input className="input" value={String(draft.notes ?? tenant.notes)} onChange={(event) => updateDraft({ notes: event.target.value })} />
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Activity size={22} />
                  <h2>Servicos e integracoes</h2>
                </div>
              </div>
              <div className="hashtags">
                {services.map((service) => (
                  <label className="tag service-toggle" key={service.slug}>
                    <input checked={serviceEnabled(service.slug)} onChange={() => toggleService(service.slug)} type="checkbox" />
                    {service.name}
                  </label>
                ))}
              </div>
              {serviceEnabled("instagram-publisher") ? (
                <div className="tenant-edit-grid service-plan-grid">
                  <div className="field">
                    <label>Pacote de postagens Instagram</label>
                    <select
                      className="select"
                      value={
                        (((draft.services as TenantDetail["services"] | undefined) || tenant.services).find((item) => item.slug === "instagram-publisher")?.plan ||
                          "starter")
                      }
                      onChange={(event) => updateServicePlan("instagram-publisher", event.target.value)}
                    >
                      <option value="starter">Essencial - 30 posts / 30 dias</option>
                      <option value="growth">Crescimento - 60 posts / 30 dias</option>
                      <option value="scale">Escala - 90 posts / 30 dias</option>
                    </select>
                  </div>
                </div>
              ) : null}
              <div className="tenant-integrations">
                <span>SIGA: {tenant.integrations.siga ? "ok" : "pendente"}</span>
                <span>Instagram: {tenant.integrations.instagram ? "ok" : "pendente"}</span>
                <span>WhatsApp: {tenant.integrations.whatsapp ? "ok" : "pendente"}</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <ShieldCheck size={22} />
                  <h2>Onboarding e configuracoes do cliente</h2>
                </div>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label>Nome da empresa <span className="required-mark">*</span></label>
                  <input className="input" required value={draft.settings?.companyName || ""} onChange={(event) => updateSettings("companyName", event.target.value)} />
                </div>
                <div className="field">
                  <label>WhatsApp principal</label>
                  <input className="input" value={draft.settings?.whatsappNumber || ""} onChange={(event) => updateSettings("whatsappNumber", event.target.value)} />
                </div>
                <div className="field wide">
                  <label>Endpoint CRM SIGA <span className="required-mark">*</span></label>
                  <input className="input" required value={draft.settings?.sigaEndpoint || ""} onChange={(event) => updateSettings("sigaEndpoint", event.target.value)} />
                </div>
                <div className="field wide">
                  <label>Token CRM SIGA <span className="required-mark">*</span></label>
                  <input
                    autoComplete="off"
                    className="input"
                    placeholder={tenant.settings.sigaTokenConfigured ? "Token salvo. Preencha apenas para trocar." : "Cole o token do SIGA"}
                    required={!tenant.settings.sigaTokenConfigured}
                    type="password"
                    value={draft.settings?.sigaToken || ""}
                    onChange={(event) => updateSettings("sigaToken", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Meta App ID</label>
                  <input className="input" value={draft.settings?.metaAppId || ""} onChange={(event) => updateSettings("metaAppId", event.target.value)} />
                </div>
                <div className="field">
                  <label>Meta App Secret</label>
                  <input
                    autoComplete="off"
                    className="input"
                    placeholder={tenant.settings.metaAppSecretConfigured ? "Secret salvo. Preencha apenas para trocar." : "App Secret"}
                    type="password"
                    value={draft.settings?.metaAppSecret || ""}
                    onChange={(event) => updateSettings("metaAppSecret", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Instagram Account ID <span className="required-mark">*</span></label>
                  <input className="input" required value={draft.settings?.instagramAccountId || ""} onChange={(event) => updateSettings("instagramAccountId", event.target.value)} />
                </div>
                <div className="field">
                  <label>Instagram Access Token <span className="required-mark">*</span></label>
                  <input
                    autoComplete="off"
                    className="input"
                    placeholder={tenant.settings.instagramAccessTokenConfigured ? "Token salvo. Preencha apenas para trocar." : "Token da Graph API"}
                    required={!tenant.settings.instagramAccessTokenConfigured}
                    type="password"
                    value={draft.settings?.instagramAccessToken || ""}
                    onChange={(event) => updateSettings("instagramAccessToken", event.target.value)}
                  />
                </div>
              </div>
              <div className="actions">
                <span className="step-caption">Campos secretos ficam criptografados e nao aparecem em texto aberto.</span>
                <button className="btn success" disabled={saving} onClick={saveClient} type="button">
                  {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  Salvar onboarding
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Building2 size={22} />
                  <h2>Usuarios</h2>
                </div>
              </div>
              <div className="compact-table">
                {tenant.users.map((user) => (
                  <div className="table-row" key={user.id}>
                    <span>{user.username}</span>
                    <strong>{user.name}</strong>
                    <small>
                      {user.role} | criado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <ShieldCheck size={22} />
                  <h2>Pagamentos</h2>
                </div>
              </div>
              {tenant.paymentSummary ? (
                <div className="admin-summary-strip">
                  <div>
                    <span className="eyebrow">Status</span>
                    <strong>{billingLabel(tenant.paymentSummary.billingStatus)}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Valor mensal</span>
                    <strong>{money(tenant.paymentSummary.monthlyValueCents)}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Ciclo</span>
                    <strong>{new Date(tenant.paymentSummary.cycleEnd).toLocaleDateString("pt-BR")}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Pagamento do ciclo</span>
                    <strong>{tenant.paymentSummary.currentCyclePaid ? "Confirmado" : "Pendente"}</strong>
                  </div>
                </div>
              ) : null}
              {paymentDraft ? (
                <div className="tenant-edit-grid payment-entry-grid">
                  <div className="field">
                    <label>Descricao</label>
                    <input className="input" value={paymentDraft.description} onChange={(event) => updatePaymentDraft("description", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Valor pago</label>
                    <input className="input" value={paymentDraft.amount} onChange={(event) => updatePaymentDraft("amount", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Pago em</label>
                    <input className="input" type="date" value={paymentDraft.paidAt} onChange={(event) => updatePaymentDraft("paidAt", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Vencimento</label>
                    <input className="input" type="date" value={paymentDraft.dueAt} onChange={(event) => updatePaymentDraft("dueAt", event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Status da cobranca</label>
                    <select className="select" value={paymentDraft.status} onChange={(event) => updatePaymentDraft("status", event.target.value)}>
                      <option value="paid">Sucesso</option>
                      <option value="pending">Pendente</option>
                      <option value="failed">Falhou</option>
                      <option value="refunded">Estornado</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Metodo</label>
                    <input className="input" placeholder="Pix, cartao, boleto..." value={paymentDraft.method} onChange={(event) => updatePaymentDraft("method", event.target.value)} />
                  </div>
                  <div className="field wide">
                    <label>Link do comprovante</label>
                    <input className="input" value={paymentDraft.receiptUrl} onChange={(event) => updatePaymentDraft("receiptUrl", event.target.value)} />
                  </div>
                  <div className="field wide">
                    <label>Observacoes</label>
                    <input className="input" value={paymentDraft.notes} onChange={(event) => updatePaymentDraft("notes", event.target.value)} />
                  </div>
                  <div className="actions payment-entry-actions">
                    <span className="step-caption">Este registro aparecera no historico financeiro do cliente.</span>
                    <button className="btn success" disabled={savingPayment} onClick={createPayment} type="button">
                      {savingPayment ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                      Registrar pagamento
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="payment-table">
                <div className="payment-table-head">
                  <span>Descricao</span>
                  <span>Valor</span>
                  <span>Pago em</span>
                  <span>Status</span>
                  <span>Comprovante</span>
                </div>
                {tenant.paymentRecords.length ? (
                  tenant.paymentRecords.map((payment) => (
                    <div className="payment-table-row" key={payment.id}>
                      <strong>{payment.description}</strong>
                      <span>{money(payment.amountCents)}</span>
                      <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("pt-BR") : "Pendente"}</span>
                      <span className={`payment-status ${payment.status}`}>{payment.status === "paid" ? "Sucesso" : payment.status}</span>
                      {payment.receiptUrl ? (
                        <a href={payment.receiptUrl} rel="noreferrer" target="_blank">
                          Abrir
                        </a>
                      ) : (
                        <span>Sem anexo</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state payment-empty">
                    <strong>Nenhum pagamento registrado.</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Activity size={22} />
                  <h2>Publicacoes enviadas</h2>
                </div>
              </div>
              <div className="compact-table">
                {tenant.publicationLogs.length ? (
                  tenant.publicationLogs.map((item) => (
                    <div className="table-row publication-row" key={item.id}>
                      <span>
                        {item.title || "Publicacao no Instagram"}
                        <small>{item.propertyCode ? `Codigo do imovel: ${item.propertyCode}` : "Codigo do imovel nao registrado"}</small>
                      </span>
                      <strong>{new Date(item.createdAt).toLocaleString("pt-BR")}</strong>
                      <small>
                        {item.photosCount} foto{item.photosCount === 1 ? "" : "s"} | {item.status}
                      </small>
                      {item.instagramUrl ? (
                        <a href={item.instagramUrl} rel="noreferrer" target="_blank">
                          Conferir no Instagram
                        </a>
                      ) : (
                        <small>Sem link retornado</small>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <strong>Nenhuma publicacao enviada via SaaS.</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div className="panel-title">
                  <Activity size={22} />
                  <h2>Atividades</h2>
                </div>
              </div>
              <div className="compact-table">
                {tenant.activityLogs.length ? (
                  tenant.activityLogs.map((log) => (
                    <div className="table-row" key={log.id}>
                      <span>{log.action}</span>
                      <small>
                        {log.username || "sistema"} | {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </small>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <strong>Nenhuma atividade registrada</strong>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
