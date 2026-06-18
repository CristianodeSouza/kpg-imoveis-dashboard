"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock3,
  Database,
  ExternalLink,
  Flame,
  Inbox,
  KanbanSquare,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Tag,
  UserCheck,
  Users
} from "lucide-react";
import { AppShell, EmptyState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/app/components/ds";
import type { Lead, LeadStatus } from "@/lib/types";

const funnelStages: LeadStatus[] = ["novo", "em_atendimento", "corretor_acionado", "ganho", "perdido"];

const statusLabels: Record<LeadStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  corretor_acionado: "Corretor acionado",
  ganho: "Ganho",
  perdido: "Perdido"
};

const stageTone: Record<LeadStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  novo: "neutral",
  em_atendimento: "info",
  corretor_acionado: "warning",
  ganho: "success",
  perdido: "danger"
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

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function directionLabel(value: Lead["direction"]) {
  if (value === "cliente") return "Cliente";
  if (value === "automacao") return "Automacao";
  if (value === "humano") return "Humano";
  return "Origem indefinida";
}

function hasBrokerAssigned(lead: Lead) {
  const stage = lead.stage?.toLowerCase() || "";
  return (
    lead.status === "corretor_acionado" ||
    lead.status === "ganho" ||
    stage.includes("humano") ||
    stage.includes("corretor") ||
    stage.includes("especialista")
  );
}

function hoursSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 36e5));
}

function isOpenLead(lead: Lead) {
  return !["ganho", "perdido"].includes(lead.status);
}

function isHotLead(lead: Lead) {
  return lead.interactions >= 3 || hasBrokerAssigned(lead) || Boolean(lead.propertyCode);
}

function leadSummary(lead: Lead) {
  return lead.message || lead.originalMessage || "Sem mensagem registrada.";
}

function statusBadgeStatus(status: LeadStatus) {
  return stageTone[status];
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "todos">("todos");
  const [brokerFilter, setBrokerFilter] = useState<"todos" | "com_corretor" | "sem_corretor">("todos");
  const [viewMode, setViewMode] = useState<"inbox" | "funil">("inbox");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/leads")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar leads.");
      setLeads(data.leads || []);
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

  async function syncLeads() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/leads/sync-make", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel sincronizar as leads.");
      setMessage(`${data.imported} registros sincronizados. Total no CRM: ${data.total}.`);
      await loadLeads();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao sincronizar leads.");
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
      const brokerAssigned = hasBrokerAssigned(lead);
      const matchesBroker =
        brokerFilter === "todos" ||
        (brokerFilter === "com_corretor" && brokerAssigned) ||
        (brokerFilter === "sem_corretor" && !brokerAssigned);
      const haystack = normalize(`${lead.name} ${lead.phone} ${lead.propertyInterest} ${lead.propertyCode || ""} ${lead.stage || ""} ${lead.message}`);
      return matchesStatus && matchesBroker && (!term || haystack.includes(term));
    });
  }, [brokerFilter, leads, search, status]);

  useEffect(() => {
    if (!filteredLeads.length) {
      setSelectedLeadId("");
      return;
    }
    if (!filteredLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || null,
    [filteredLeads, selectedLeadId]
  );

  const leadsByStatus = useMemo(
    () =>
      funnelStages.reduce(
        (acc, stage) => {
          acc[stage] = filteredLeads.filter((lead) => lead.status === stage);
          return acc;
        },
        {} as Record<LeadStatus, Lead[]>
      ),
    [filteredLeads]
  );

  const todayCount = leads.filter((lead) => new Date(lead.lastMessageAt).toDateString() === new Date().toDateString()).length;
  const newCount = leads.filter((lead) => lead.status === "novo").length;
  const brokerCount = leads.filter(hasBrokerAssigned).length;
  const waitingCount = leads.filter((lead) => isOpenLead(lead) && !hasBrokerAssigned(lead) && hoursSince(lead.lastMessageAt) >= 24).length;
  const hotCount = leads.filter((lead) => isOpenLead(lead) && isHotLead(lead)).length;

  return (
    <AppShell
      subtitle="Mini CRM"
      navItems={[
        { href: "/portal", label: "Portal" },
        { href: "/app/instagram", label: "Instagram Publisher" },
        { href: "/app/leads", label: "Mini CRM", active: true },
        { href: "/app/blog", label: "Blog Automatizado" },
        { href: "/app/pagamentos", label: "Pagamentos" },
        { href: "/app/configuracoes", label: "Configuracoes" }
      ]}
      aside={
        <>
          <span>{leads.length.toLocaleString("pt-BR")} leads no CRM</span>
          <StatusBadge status={waitingCount ? "warning" : "success"}>{waitingCount ? `${waitingCount} sem acao` : "Operacao em dia"}</StatusBadge>
        </>
      }
    >
      <PageHeader
        eyebrow="CRM conversacional"
        title="Mini CRM de Leads"
        description="Atenda leads vindas do WhatsApp com contexto do imovel, etapa comercial, responsavel e historico em uma unica tela."
        actions={
          <>
            <button className="btn secondary" disabled={syncing} onClick={syncLeads}>
              {syncing ? <Loader2 className="spin" size={17} /> : <Database size={17} />}
              Sincronizar leads
            </button>
            <button className="btn secondary" disabled={loading} onClick={loadLeads}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </>
        }
      />

      <section className="crm-metrics ds-metrics-grid">
        <MetricCard label="Total" value={leads.length.toLocaleString("pt-BR")} hint="leads no CRM" />
        <MetricCard label="Hoje" value={todayCount.toLocaleString("pt-BR")} hint="novas conversas" tone="info" />
        <MetricCard label="Novos" value={newCount.toLocaleString("pt-BR")} hint="em triagem" />
        <MetricCard label="Corretor" value={brokerCount.toLocaleString("pt-BR")} hint="acionado" tone="warning" />
        <MetricCard label="Sem acao" value={waitingCount.toLocaleString("pt-BR")} hint="24h+" tone={waitingCount ? "danger" : "success"} />
        <MetricCard label="Quentes" value={hotCount.toLocaleString("pt-BR")} hint="alta intencao" tone="success" />
      </section>

      <section className="panel crm-control-panel">
        <div className="crm-view-tabs" aria-label="Modo de visualizacao">
          <button className={viewMode === "inbox" ? "active" : ""} onClick={() => setViewMode("inbox")} type="button">
            <Inbox size={17} />
            Inbox
          </button>
          <button className={viewMode === "funil" ? "active" : ""} onClick={() => setViewMode("funil")} type="button">
            <KanbanSquare size={17} />
            Funil
          </button>
        </div>

        <div className="lead-toolbar crm-toolbar">
          <div className="field">
            <label htmlFor="lead-search">Buscar lead</label>
            <div className="input-icon">
              <Search size={16} />
              <input
                id="lead-search"
                placeholder="Nome, telefone, codigo do imovel ou mensagem"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="lead-status">Etapa</label>
            <select className="select" id="lead-status" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "todos")}>
              <option value="todos">Todas</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="broker-filter">Corretor</label>
            <select className="select" id="broker-filter" value={brokerFilter} onChange={(event) => setBrokerFilter(event.target.value as "todos" | "com_corretor" | "sem_corretor")}>
              <option value="todos">Todos</option>
              <option value="com_corretor">Com corretor acionado</option>
              <option value="sem_corretor">Sem corretor acionado</option>
            </select>
          </div>
        </div>

        {message ? <div className={`message ${message.includes("sincronizados") ? "ok" : "error"}`}>{message}</div> : null}

        {loading ? <LoadingState title="Carregando leads" /> : null}

        {!loading && !filteredLeads.length ? (
          <EmptyState icon={<Users size={22} />} title="Nenhuma lead encontrada">
            Quando novas conversas chegarem pela integracao de WhatsApp, elas aparecem aqui.
          </EmptyState>
        ) : null}

        {!loading && filteredLeads.length && viewMode === "inbox" ? (
          <section className="crm-inbox-layout">
            <div className="crm-conversation-list" aria-label="Lista de leads">
              {filteredLeads.map((lead) => {
                const selected = selectedLead?.id === lead.id;
                const phone = digits(lead.phone);
                return (
                  <button className={`crm-conversation-item ${selected ? "active" : ""}`} key={lead.id} onClick={() => setSelectedLeadId(lead.id)} type="button">
                    <span className="crm-contact-avatar">{lead.name.slice(0, 1).toUpperCase() || "L"}</span>
                    <span className="crm-conversation-content">
                      <span className="crm-conversation-row">
                        <strong>{lead.name}</strong>
                        <small>{formatDate(lead.lastMessageAt)}</small>
                      </span>
                      <span className="crm-conversation-subtitle">
                        {lead.propertyInterest}
                        {lead.propertyCode ? ` - Codigo ${lead.propertyCode}` : ""}
                      </span>
                      <span className="crm-conversation-message">{leadSummary(lead)}</span>
                      <span className="crm-chip-row">
                        {phone ? <span>{phone}</span> : null}
                        <span>{statusLabels[lead.status]}</span>
                        {isHotLead(lead) ? <span className="hot">Quente</span> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <LeadDetailPanel lead={selectedLead} onStatusChange={updateStatus} />
          </section>
        ) : null}

        {!loading && filteredLeads.length && viewMode === "funil" ? (
          <div className="kanban-board" aria-label="Funil de atendimento">
            {funnelStages.map((stage) => (
              <section className={`kanban-column ${stage}`} key={stage}>
                <div className="kanban-column-header">
                  <strong>{statusLabels[stage]}</strong>
                  <span>{leadsByStatus[stage].length}</span>
                </div>
                <div className="kanban-cards">
                  {leadsByStatus[stage].map((lead) => (
                    <article className="lead-card kanban-card" key={lead.id}>
                      <div className="lead-main">
                        <div>
                          <span className="eyebrow">Lead</span>
                          <h3>{lead.name}</h3>
                          <p>
                            {lead.propertyInterest}
                            {lead.propertyCode ? ` - Codigo ${lead.propertyCode}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="lead-details">
                        <span>
                          <Phone size={15} />
                          {lead.phone || "Sem telefone"}
                        </span>
                        <span>
                          <CalendarDays size={15} />
                          {formatDate(lead.lastMessageAt)}
                        </span>
                        <span>
                          <MessageSquare size={15} />
                          {lead.interactions}
                        </span>
                        {isHotLead(lead) ? (
                          <span>
                            <Flame size={15} />
                            Quente
                          </span>
                        ) : null}
                      </div>
                      <p className="lead-message">{leadSummary(lead)}</p>
                      <select className={`status-select ${lead.status}`} value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function LeadDetailPanel({ lead, onStatusChange }: { lead: Lead | null; onStatusChange: (id: string, status: LeadStatus) => void }) {
  if (!lead) {
    return (
      <aside className="crm-detail-panel">
        <EmptyState icon={<Inbox size={22} />} title="Selecione um contato">
          A ficha do lead e o historico de atendimento aparecem aqui.
        </EmptyState>
      </aside>
    );
  }

  const phone = digits(lead.phone);
  const whatsappUrl = phone ? `https://wa.me/${phone}` : "";

  return (
    <aside className="crm-detail-panel" aria-label="Ficha do contato">
      <div className="crm-detail-header">
        <div>
          <span className="eyebrow">Ficha do contato</span>
          <h2>{lead.name}</h2>
          <p>{lead.phone || "Telefone nao informado"}</p>
        </div>
        <StatusBadge status={statusBadgeStatus(lead.status)}>{statusLabels[lead.status]}</StatusBadge>
      </div>

      <div className="crm-detail-actions">
        {whatsappUrl ? (
          <a className="btn primary" href={whatsappUrl} rel="noreferrer" target="_blank">
            <MessageCircle size={17} />
            Abrir WhatsApp
          </a>
        ) : null}
        {lead.propertyUrl ? (
          <a className="btn secondary" href={lead.propertyUrl} rel="noreferrer" target="_blank">
            <ExternalLink size={17} />
            Ver imovel
          </a>
        ) : null}
      </div>

      <section className="crm-detail-grid">
        <InfoItem icon={<Tag size={16} />} label="Interesse" value={lead.propertyInterest || "Nao informado"} />
        <InfoItem icon={<ExternalLink size={16} />} label="Codigo do imovel" value={lead.propertyCode || "Nao vinculado"} />
        <InfoItem icon={<UserCheck size={16} />} label="Corretor" value={hasBrokerAssigned(lead) ? "Acionado" : "Nao acionado"} />
        <InfoItem icon={<Clock3 size={16} />} label="Ultima interacao" value={formatDate(lead.lastMessageAt)} />
        <InfoItem icon={<MessageSquare size={16} />} label="Interacoes" value={String(lead.interactions || 0)} />
        <InfoItem icon={<Inbox size={16} />} label="Origem" value={lead.source || directionLabel(lead.direction)} />
      </section>

      <section className="crm-stage-box">
        <label htmlFor="detail-status">Etapa comercial</label>
        <select className={`status-select ${lead.status}`} id="detail-status" value={lead.status} onChange={(event) => onStatusChange(lead.id, event.target.value as LeadStatus)}>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>

      <section className="crm-tags-section">
        <span className="eyebrow">Sinais do lead</span>
        <div className="crm-chip-row">
          {isHotLead(lead) ? <span className="hot">Lead quente</span> : <span>Triagem</span>}
          <span>{directionLabel(lead.direction)}</span>
          {lead.stage ? <span>{lead.stage}</span> : null}
          {hoursSince(lead.lastMessageAt) >= 24 && isOpenLead(lead) ? <span className="risk">Sem acao ha 24h</span> : null}
        </div>
      </section>

      <section className="crm-timeline">
        <div className="crm-section-title">
          <MessageSquare size={18} />
          <h3>Historico da conversa</h3>
        </div>
        <div className="crm-message-bubble customer">
          <span>{directionLabel(lead.direction)}</span>
          <p>{leadSummary(lead)}</p>
          <small>{formatDate(lead.lastMessageAt)}</small>
        </div>
        {lead.notes ? (
          <div className="crm-message-bubble internal">
            <span>Nota interna</span>
            <p>{lead.notes}</p>
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="crm-info-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
