"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";

type AdminService = {
  slug: string;
  name: string;
  description?: string;
};

type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  usersCount: number;
  services: Array<{ slug: string; name: string; status: string; plan: string }>;
  integrations: { siga: boolean; instagram: boolean; whatsapp: boolean };
};

type AuditLog = {
  id: string;
  action: string;
  target?: string;
  tenantName: string;
  username?: string;
  createdAt: string;
};

export default function AdminPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(["instagram-publisher", "mini-crm"]);
  const [form, setForm] = useState({ name: "", slug: "", ownerName: "", username: "", password: "" });
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
      setAuditLogs(data.auditLogs || []);
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
      setForm({ name: "", slug: "", ownerName: "", username: "", password: "" });
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

      <section className="workspace">
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <ShieldCheck size={22} />
              <h2>Clientes SaaS</h2>
            </div>
            <button className="btn secondary" disabled={loading} onClick={loadTenants}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>

          {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}

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
                  <small>{tenant.slug} | {tenant.usersCount} usuario(s)</small>
                </div>
              </div>
              <div className="hashtags">
                {tenant.services.map((service) => (
                  <span className="tag" key={service.slug}>
                    {service.name}
                  </span>
                ))}
              </div>
              <div className="tenant-integrations">
                <span>SIGA: {tenant.integrations.siga ? "ok" : "pendente"}</span>
                <span>Instagram: {tenant.integrations.instagram ? "ok" : "pendente"}</span>
                <span>WhatsApp: {tenant.integrations.whatsapp ? "ok" : "pendente"}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="panel audit-panel">
          <div className="panel-heading">
            <div className="panel-title">
              <ShieldCheck size={21} />
              <h2>Eventos recentes</h2>
            </div>
          </div>
          <div className="compact-table">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div className="table-row" key={log.id}>
                  <span>{log.action}</span>
                  <strong>{log.tenantName}</strong>
                  <small>
                    {log.username || "sistema"} | {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </small>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhum evento registrado</strong>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
