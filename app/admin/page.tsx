"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, Building2, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";

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
  const [selectedServices, setSelectedServices] = useState<string[]>(["instagram-publisher", "mini-crm"]);
  const [editing, setEditing] = useState<Record<string, Partial<AdminTenant>>>({});
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

  function dateInput(value?: string) {
    return value ? new Date(value).toISOString().slice(0, 10) : "";
  }

  function tenantServiceEnabled(tenant: AdminTenant, slug: string) {
    return tenant.services.some((service) => service.slug === slug && service.status === "active");
  }

  function activeServicesCount(tenant: AdminTenant) {
    return tenant.services.filter((service) => service.status === "active" && !["portal", "settings"].includes(service.slug)).length;
  }

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

  async function saveTenant(tenant: AdminTenant) {
    const draft = editing[tenant.id] || {};
    const monthlyValueCents = draft.monthlyValueCents ?? tenant.monthlyValueCents;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          name: draft.name ?? tenant.name,
          status: draft.status ?? tenant.status,
          billingStatus: draft.billingStatus ?? tenant.billingStatus,
          document: draft.document ?? tenant.document,
          contactName: draft.contactName ?? tenant.contactName,
          contactEmail: draft.contactEmail ?? tenant.contactEmail,
          contactPhone: draft.contactPhone ?? tenant.contactPhone,
          monthlyValue: String(monthlyValueCents / 100),
          acquiredAt: draft.acquiredAt ?? dateInput(tenant.acquiredAt),
          notes: draft.notes ?? tenant.notes,
          services: services.map((service) => ({
            slug: service.slug,
            enabled:
              (draft.services as AdminTenant["services"] | undefined)?.some((item) => item.slug === service.slug && item.status === "active") ??
              tenantServiceEnabled(tenant, service.slug)
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar cliente.");
      setMessage({ type: "ok", text: "Cliente atualizado." });
      await loadTenants();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar cliente." });
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(id: string, patch: Partial<AdminTenant>) {
    setEditing((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function toggleTenantService(tenant: AdminTenant, slug: string) {
    const draftServices = (editing[tenant.id]?.services as AdminTenant["services"] | undefined) || tenant.services;
    const exists = draftServices.find((service) => service.slug === slug);
    const next = exists
      ? draftServices.map((service) => (service.slug === slug ? { ...service, status: service.status === "active" ? "blocked" : "active" } : service))
      : [...draftServices, { slug, name: services.find((service) => service.slug === slug)?.name || slug, status: "active", plan: "starter", priceCents: 0 }];
    updateDraft(tenant.id, { services: next });
  }

  function updateTenantMonthlyValue(tenant: AdminTenant, value: string) {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    updateDraft(tenant.id, { monthlyValueCents: Number.isFinite(parsed) ? Math.round(parsed * 100) : 0 });
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
              <strong>{tenants.filter((tenant) => tenant.status === "active").length}</strong>
            </div>
            <div>
              <span className="eyebrow">Receita mensal</span>
              <strong>{money(tenants.reduce((total, tenant) => total + tenant.monthlyValueCents, 0))}</strong>
            </div>
            <div>
              <span className="eyebrow">Contratos em atraso</span>
              <strong>{tenants.filter((tenant) => ["overdue", "suspended"].includes(tenant.billingStatus)).length}</strong>
            </div>
            <div>
              <span className="eyebrow">Servicos no catalogo</span>
              <strong>{services.length}</strong>
            </div>
          </div>
        </section>

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
              </article>
            ))}
          </div>
        </section>

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
              </article>
            ))}
          </div>
        </section>

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
              <div className="tenant-edit-grid">
                <div className="field">
                  <label>Status</label>
                  <select
                    className="select"
                    value={String(editing[tenant.id]?.status ?? tenant.status)}
                    onChange={(event) => updateDraft(tenant.id, { status: event.target.value })}
                  >
                    <option value="active">Ativo</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Financeiro</label>
                  <select
                    className="select"
                    value={String(editing[tenant.id]?.billingStatus ?? tenant.billingStatus)}
                    onChange={(event) => updateDraft(tenant.id, { billingStatus: event.target.value })}
                  >
                    <option value="active">Em dia</option>
                    <option value="trial">Teste</option>
                    <option value="overdue">Em atraso</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>
                <div className="field">
                  <label>CPF/CNPJ</label>
                  <input className="input" value={String(editing[tenant.id]?.document ?? tenant.document)} onChange={(event) => updateDraft(tenant.id, { document: event.target.value })} />
                </div>
                <div className="field">
                  <label>Responsavel</label>
                  <input className="input" value={String(editing[tenant.id]?.contactName ?? tenant.contactName)} onChange={(event) => updateDraft(tenant.id, { contactName: event.target.value })} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input className="input" value={String(editing[tenant.id]?.contactEmail ?? tenant.contactEmail)} onChange={(event) => updateDraft(tenant.id, { contactEmail: event.target.value })} />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input className="input" value={String(editing[tenant.id]?.contactPhone ?? tenant.contactPhone)} onChange={(event) => updateDraft(tenant.id, { contactPhone: event.target.value })} />
                </div>
                <div className="field">
                  <label>Valor mensal</label>
                  <input
                    className="input"
                    value={String(((editing[tenant.id]?.monthlyValueCents ?? tenant.monthlyValueCents) || 0) / 100)}
                    onChange={(event) => updateTenantMonthlyValue(tenant, event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Aquisicao</label>
                  <input className="input" type="date" value={String(editing[tenant.id]?.acquiredAt ?? dateInput(tenant.acquiredAt))} onChange={(event) => updateDraft(tenant.id, { acquiredAt: event.target.value })} />
                </div>
                <div className="field wide">
                  <label>Observacoes</label>
                  <input className="input" value={String(editing[tenant.id]?.notes ?? tenant.notes)} onChange={(event) => updateDraft(tenant.id, { notes: event.target.value })} />
                </div>
              </div>
              <div className="hashtags">
                {services.map((service) => (
                  <label className="tag service-toggle" key={service.slug}>
                    <input
                      checked={
                        ((editing[tenant.id]?.services as AdminTenant["services"] | undefined) || tenant.services).some(
                          (item) => item.slug === service.slug && item.status === "active"
                        )
                      }
                      onChange={() => toggleTenantService(tenant, service.slug)}
                      type="checkbox"
                    />
                    {service.name}
                  </label>
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
                <button className="btn secondary" disabled={saving} onClick={() => saveTenant(tenant)} type="button">
                  Salvar cliente
                </button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
