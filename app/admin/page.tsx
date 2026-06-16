"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, Building2, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";

type AdminView = "overview" | "clients" | "finance" | "management";

type AdminService = {
  slug: string;
  name: string;
  description?: string;
  status: string;
};

type AdminTenant = {
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
  usersCount: number;
  services: Array<{ slug: string; name: string; status: string; plan: string; priceCents: number; expiresAt?: string }>;
  integrations: { siga: boolean; instagram: boolean; whatsapp: boolean };
  activityLogs: Array<{ id: string; action: string; target?: string; username?: string; createdAt: string }>;
};

export default function AdminPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [view, setView] = useState<AdminView>("overview");
  const [selectedServices, setSelectedServices] = useState<string[]>(["instagram-publisher", "mini-crm"]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerName: "",
    username: "",
    password: "",
    document: "",
    contactEmail: "",
    contactPhone: "",
    monthlyValue: "",
    acquiredAt: "",
    notes: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function loadTenants() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        window.location.href = `/login?next=${encodeURIComponent("/admin")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar clientes.");
      setTenants(data.tenants || []);
      setServices((data.services || []).filter((service: AdminService) => !["portal", "settings"].includes(service.slug)));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar clientes." });
    } finally {
      setLoading(false);
    }
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, services: selectedServices })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel criar cliente.");
      setForm({
        name: "",
        slug: "",
        ownerName: "",
        username: "",
        password: "",
        document: "",
        contactEmail: "",
        contactPhone: "",
        monthlyValue: "",
        acquiredAt: "",
        notes: ""
      });
      setMessage({ type: "ok", text: "Cliente criado com acesso inicial." });
      await loadTenants();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao criar cliente." });
    } finally {
      setSaving(false);
    }
  }

  function toggleService(slug: string) {
    setSelectedServices((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
  }

  function money(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
  }

  function activeServicesCount(tenant: AdminTenant) {
    return tenant.services.filter((service) => service.status === "active" && !["portal", "settings"].includes(service.slug)).length;
  }

  function hasPendingIntegrations(tenant: AdminTenant) {
    return !tenant.integrations.siga || !tenant.integrations.instagram || !tenant.integrations.whatsapp;
  }

  const activeTenants = tenants.filter((tenant) => tenant.status === "active");
  const blockedTenants = tenants.filter((tenant) => tenant.status !== "active");
  const overdueTenants = tenants.filter((tenant) => ["overdue", "suspended"].includes(tenant.billingStatus));
  const monthlyRevenue = tenants.reduce((total, tenant) => total + tenant.monthlyValueCents, 0);
  const missingCommercialData = tenants.filter((tenant) => !tenant.contactName || !tenant.contactEmail || !tenant.contactPhone || !tenant.document);
  const missingContractData = tenants.filter((tenant) => !tenant.acquiredAt || tenant.monthlyValueCents <= 0);
  const pendingIntegrations = tenants.filter(hasPendingIntegrations);

  function statusLabel(status: string) {
    if (status === "active") return "Ativo";
    if (status === "canceled") return "Cancelado";
    return "Bloqueado";
  }

  function billingLabel(status: string) {
    if (status === "active") return "Em dia";
    if (status === "trial") return "Teste";
    if (status === "overdue") return "Em atraso";
    if (status === "suspended") return "Suspenso";
    return status;
  }

  useEffect(() => {
    loadTenants();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>Admin SaaS</span>
        </div>
        <nav className="tool-nav" aria-label="Admin CSR">
          <a className="tool-link" href="/portal">
            Portal
          </a>
          <a className="tool-link active" href="/admin">
            Admin
          </a>
          <LogoutButton />
        </nav>
      </header>

      <section className="workspace admin-workspace">
        <section className="admin-section-nav" aria-label="Areas do admin">
          <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")} type="button">
            Dados gerais
          </button>
          <button className={view === "clients" ? "active" : ""} onClick={() => setView("clients")} type="button">
            Clientes
          </button>
          <button className={view === "finance" ? "active" : ""} onClick={() => setView("finance")} type="button">
            Financeiro
          </button>
          <button className={view === "management" ? "active" : ""} onClick={() => setView("management")} type="button">
            Gestao
          </button>
        </section>

        {view === "overview" ? (
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <ShieldCheck size={22} />
              <h2>Dados gerais da plataforma</h2>
            </div>
            <button className="btn secondary" disabled={loading} onClick={loadTenants}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>

          {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}

          <div className="admin-summary-strip">
            <div>
              <span className="eyebrow">Clientes ativos</span>
              <strong>{activeTenants.length}</strong>
            </div>
            <div>
              <span className="eyebrow">Receita mensal</span>
              <strong>{money(monthlyRevenue)}</strong>
            </div>
            <div>
              <span className="eyebrow">Contratos em atraso</span>
              <strong>{overdueTenants.length}</strong>
            </div>
            <div>
              <span className="eyebrow">Servicos no catalogo</span>
              <strong>{services.length}</strong>
            </div>
          </div>

          <div className="admin-audit-grid">
            <article className={blockedTenants.length ? "audit-card warning" : "audit-card ok"}>
              <span className="eyebrow">Acesso</span>
              <strong>{blockedTenants.length}</strong>
              <small>clientes bloqueados ou cancelados</small>
            </article>
            <article className={missingCommercialData.length ? "audit-card warning" : "audit-card ok"}>
              <span className="eyebrow">Cadastro</span>
              <strong>{missingCommercialData.length}</strong>
              <small>clientes com dados comerciais incompletos</small>
            </article>
            <article className={missingContractData.length ? "audit-card warning" : "audit-card ok"}>
              <span className="eyebrow">Contrato</span>
              <strong>{missingContractData.length}</strong>
              <small>clientes sem valor mensal ou data de aquisicao</small>
            </article>
            <article className={pendingIntegrations.length ? "audit-card warning" : "audit-card ok"}>
              <span className="eyebrow">Integracoes</span>
              <strong>{pendingIntegrations.length}</strong>
              <small>clientes com SIGA, Instagram ou WhatsApp pendente</small>
            </article>
          </div>
        </section>
        ) : null}

        {view === "clients" ? (
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Building2 size={22} />
              <h2>Clientes</h2>
            </div>
          </div>
          <form className="admin-create-form" onSubmit={createTenant}>
            <div className="field">
              <label htmlFor="tenantName">Cliente</label>
              <input className="input" id="tenantName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tenantSlug">Slug</label>
              <input className="input" id="tenantSlug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ownerName">Responsavel</label>
              <input className="input" id="ownerName" value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input className="input" id="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="password">Senha inicial</label>
              <input className="input" id="password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="document">CPF/CNPJ</label>
              <input className="input" id="document" value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="contactEmail">Email</label>
              <input className="input" id="contactEmail" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="contactPhone">Telefone</label>
              <input className="input" id="contactPhone" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="monthlyValue">Valor mensal</label>
              <input className="input" id="monthlyValue" placeholder="197,00" value={form.monthlyValue} onChange={(event) => setForm({ ...form, monthlyValue: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="acquiredAt">Data aquisicao</label>
              <input className="input" id="acquiredAt" type="date" value={form.acquiredAt} onChange={(event) => setForm({ ...form, acquiredAt: event.target.value })} />
            </div>
            <div className="field wide">
              <label htmlFor="notes">Observacoes</label>
              <input className="input" id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <div className="admin-service-picker">
              {services.map((service) => (
                <label className="toggle-row" key={service.slug}>
                  <input checked={selectedServices.includes(service.slug)} onChange={() => toggleService(service.slug)} type="checkbox" />
                  {service.name}
                </label>
              ))}
            </div>
            <button className="btn success" disabled={saving} type="submit">
              {saving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
              Criar cliente
            </button>
          </form>

          <div className="client-directory">
            {tenants.map((tenant) => (
              <article className="client-directory-card" key={tenant.id}>
                <div className="client-directory-head">
                  <span className="portal-card-icon">
                    <Building2 size={21} />
                  </span>
                  <div>
                    <strong>{tenant.name}</strong>
                    <small>ID {tenant.clientCode || "pendente"} | {tenant.slug}</small>
                  </div>
                  <span className={`tenant-status-pill ${tenant.status}`}>{statusLabel(tenant.status)}</span>
                </div>
                <div className="client-directory-grid">
                  <span>Responsavel: {tenant.contactName || "pendente"}</span>
                  <span>Email: {tenant.contactEmail || "pendente"}</span>
                  <span>Telefone: {tenant.contactPhone || "pendente"}</span>
                  <span>CPF/CNPJ: {tenant.document || "pendente"}</span>
                </div>
                <div className="actions compact-actions">
                  <a className="btn secondary" href={`/admin/clientes/${tenant.clientCode}`}>
                    Abrir ficha
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {view === "finance" ? (
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <ShieldCheck size={22} />
              <h2>Financeiro</h2>
            </div>
          </div>
          <div className="finance-table">
            {tenants.map((tenant) => (
              <article className="finance-row" key={tenant.id}>
                <div>
                  <span className="eyebrow">Cliente</span>
                  <strong>{tenant.clientCode || "pendente"} | {tenant.name}</strong>
                </div>
                <div>
                  <span className="eyebrow">Valor mensal</span>
                  <strong>{money(tenant.monthlyValueCents)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Financeiro</span>
                  <strong>{billingLabel(tenant.billingStatus)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Aquisicao</span>
                  <strong>{tenant.acquiredAt ? new Date(tenant.acquiredAt).toLocaleDateString("pt-BR") : "Pendente"}</strong>
                </div>
                <a className="btn secondary" href={`/admin/clientes/${tenant.clientCode}`}>
                  Abrir ficha
                </a>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {view === "management" ? (
        <>
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Activity size={22} />
              <h2>Gestao</h2>
            </div>
          </div>
          <p className="section-kicker">Controle de status, liberacao de servicos, integracoes e historico operacional de cada cliente.</p>
        </section>

        <section className="tenant-list">
          {tenants.map((tenant) => (
            <article className="tenant-card" key={tenant.id}>
              <div className="tenant-card-main">
                <span className="portal-card-icon">
                  <Building2 size={21} />
                </span>
                <div>
                  <strong>{tenant.name}</strong>
                  <small>
                    ID {tenant.clientCode || "pendente"} | {tenant.slug} | {tenant.usersCount} usuario(s) | {money(tenant.monthlyValueCents)}
                  </small>
                </div>
                <span className={`tenant-status-pill ${tenant.status}`}>{statusLabel(tenant.status)}</span>
              </div>
              <div className="tenant-kpis">
                <div>
                  <span className="eyebrow">Servicos ativos</span>
                  <strong>{activeServicesCount(tenant)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Financeiro</span>
                  <strong>{tenant.billingStatus === "active" ? "Em dia" : tenant.billingStatus}</strong>
                </div>
                <div>
                  <span className="eyebrow">Aquisicao</span>
                  <strong>{tenant.acquiredAt ? new Date(tenant.acquiredAt).toLocaleDateString("pt-BR") : "Pendente"}</strong>
                </div>
              </div>
              <div className="hashtags">
                {tenant.services
                  .filter((service) => !["portal", "settings"].includes(service.slug))
                  .map((service) => (
                    <span className="tag" key={service.slug}>
                      {service.name}: {service.status === "active" ? "ativo" : "bloqueado"}
                    </span>
                  ))}
              </div>
              <div className="tenant-integrations">
                <span>SIGA: {tenant.integrations.siga ? "ok" : "pendente"}</span>
                <span>Instagram: {tenant.integrations.instagram ? "ok" : "pendente"}</span>
                <span>WhatsApp: {tenant.integrations.whatsapp ? "ok" : "pendente"}</span>
              </div>
              <div className="tenant-activity">
                <div className="tenant-activity-title">
                  <Activity size={17} />
                  <strong>Atividades do cliente</strong>
                </div>
                {tenant.activityLogs?.length ? (
                  <div className="compact-table">
                    {tenant.activityLogs.map((log) => (
                      <div className="table-row" key={log.id}>
                        <span>{log.action}</span>
                        <small>
                          {log.username || "sistema"} | {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className="step-caption">Nenhuma atividade registrada para este cliente.</small>
                )}
              </div>
              <div className="actions">
                <span className="step-caption">{tenant.notes || "Sem observacoes comerciais."}</span>
                <a className="btn secondary" href={`/admin/clientes/${tenant.clientCode}`}>
                  Abrir ficha completa
                </a>
              </div>
            </article>
          ))}
        </section>
        </>
        ) : null}
      </section>
    </main>
  );
}
