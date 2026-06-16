"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Database, ExternalLink, Loader2, MessageSquare, Phone, RefreshCw, Search, Users } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types";

const statusLabels: Record<LeadStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  corretor_acionado: "Corretor acionado",
  ganho: "Ganho",
  perdido: "Perdido"
};

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function directionLabel(value: Lead["direction"]) {
  if (value === "cliente") return "Cliente";
  if (value === "automacao") return "Automacao";
  if (value === "humano") return "Humano";
  return "Origem indefinida";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [storage, setStorage] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "todos">("todos");
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar leads.");
      setLeads(data.leads || []);
      setStorage(data.storage || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, nextStatus: LeadStatus) {
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, status: nextStatus } : lead)));
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel atualizar a lead.");
    } catch (error) {
      setLeads(previous);
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar lead.");
    }
  }

  async function syncMake() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads/sync-make", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel sincronizar o Make.");
      setMessage(`${data.imported} registros sincronizados do Make. Total no CRM: ${data.total}.`);
      await loadLeads();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao sincronizar Make.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const term = normalize(search);
    return leads.filter((lead) => {
      const matchesStatus = status === "todos" || lead.status === status;
      const haystack = normalize(`${lead.name} ${lead.phone} ${lead.propertyInterest} ${lead.propertyCode || ""} ${lead.stage || ""} ${lead.message}`);
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [leads, search, status]);

  const todayCount = leads.filter((lead) => new Date(lead.lastMessageAt).toDateString() === new Date().toDateString()).length;
  const hotCount = leads.filter((lead) => lead.status === "corretor_acionado").length;
  const newCount = leads.filter((lead) => lead.status === "novo").length;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>KPG IMOVEIS</strong>
          <span>Portal de ferramentas</span>
        </div>
        <nav className="tool-nav" aria-label="Ferramentas KPG">
          <a className="tool-link" href="/">
            Instagram Publisher
          </a>
          <a className="tool-link active" href="/leads">
            Mini CRM
          </a>
        </nav>
        <div className="status-row">
          <span className="status-pill">Make</span>
          <span className="status-pill">Leads</span>
          <span className="status-pill">Corretores</span>
        </div>
      </header>

      <section className="workspace">
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <Users size={22} />
              <h2>Mini CRM de Leads</h2>
            </div>
            <div className="status-row">
              <button className="btn secondary" disabled={syncing} onClick={syncMake}>
                {syncing ? <Loader2 className="spin" size={17} /> : <Database size={17} />}
                Sincronizar Make
              </button>
              <button className="btn secondary" disabled={loading} onClick={loadLeads}>
                {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
                Atualizar
              </button>
            </div>
          </div>

          <div className="crm-hero">
            <div>
              <span className="eyebrow">Webhook para o Make</span>
              <strong>/api/leads/webhook</strong>
              <small>Envie nome, phone, tipo_imovel, mensagem, timestamp, conversation_id e chatLid.</small>
            </div>
            <div>
              <span className="eyebrow">Armazenamento</span>
              <strong>{storage === "kv" ? "Persistente" : storage === "make-live" ? "Make ao vivo" : "Temporario"}</strong>
              <small>
                {storage === "kv"
                  ? "Vercel KV/Upstash ativo"
                  : storage === "make-live"
                    ? "Dados lidos diretamente do Data Store do Make"
                    : "Configure KV_REST_API_URL e KV_REST_API_TOKEN para producao"}
              </small>
            </div>
          </div>

          <div className="crm-metrics">
            <div className="metric">
              <span>Total de leads</span>
              <strong>{leads.length.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Entraram hoje</span>
              <strong>{todayCount.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Novos</span>
              <strong>{newCount.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="metric">
              <span>Corretor acionado</span>
              <strong>{hotCount.toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div className="lead-toolbar">
            <div className="field">
              <label htmlFor="lead-search">Buscar lead</label>
              <div className="input-icon">
                <Search size={16} />
                <input
                  id="lead-search"
                  placeholder="Nome, telefone, tipo de imovel ou mensagem"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="lead-status">Status</label>
              <select className="select" id="lead-status" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "todos")}>
                <option value="todos">Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message ? <div className={`message ${message.includes("sincronizados") ? "ok" : "error"}`}>{message}</div> : null}

          <div className="lead-list">
            {filteredLeads.map((lead) => (
              <article className="lead-card" key={lead.id}>
                <div className="lead-main">
                  <div>
                    <span className="eyebrow">Lead</span>
                    <h3>{lead.name}</h3>
                    <p>
                      {lead.propertyInterest}
                      {lead.propertyCode ? ` • Codigo ${lead.propertyCode}` : ""}
                    </p>
                  </div>
                  <select className={`status-select ${lead.status}`} value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lead-details">
                  <span>
                    <Phone size={15} />
                    {lead.phone || "Telefone nao informado"}
                  </span>
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(lead.lastMessageAt)}
                  </span>
                  <span>
                    <MessageSquare size={15} />
                    {lead.interactions} interacoes
                  </span>
                  <span>{directionLabel(lead.direction)}</span>
                  {lead.stage ? <span>{lead.stage}</span> : null}
                  {lead.propertyUrl ? (
                    <a className="lead-link" href={lead.propertyUrl} rel="noreferrer" target="_blank">
                      <ExternalLink size={15} />
                      Abrir imovel
                    </a>
                  ) : null}
                </div>
                <p className="lead-message">{lead.message || "Sem mensagem registrada."}</p>
              </article>
            ))}

            {!loading && !filteredLeads.length ? (
              <div className="empty-state">
                <Users size={28} />
                <strong>Nenhuma lead encontrada</strong>
                <span>Quando o Make enviar dados para o webhook, elas aparecem aqui.</span>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
