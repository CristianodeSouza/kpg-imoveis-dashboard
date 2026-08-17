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

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [message, setMessage] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 100, total: 0, totalPages: 1 });

  async function loadLeads(page = pagination.page) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize)
      });
      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/leads")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar leads.");
      setLeads(data.leads || []);
      setPagination(data.pagination || { page, pageSize: pagination.pageSize, total: data.leads?.length || 0, totalPages: 1 });
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
      const response = await fetch("/api/leads/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nao foi possivel sincronizar as leads.");
      setMessage(`${data.imported} registros sincronizados. Total no CRM: ${data.total}.`);
      await loadLeads(1);
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
  const contactedCount = leads.filter((lead) => lead.status !== "novo").length;
  const advancedCount = leads.filter((lead) => ["corretor_acionado", "ganho"].includes(lead.status)).length;
  const wonCount = leads.filter((lead) => lead.status === "ganho").length;
  const conversionRate = pagination.total ? Math.round((wonCount / pagination.total) * 100) : 0;
  const statusDistribution = funnelStages.map((stage) => ({
    stage,
    label: statusLabels[stage],
    count: leads.filter((lead) => lead.status === stage).length
  }));

  return (
    <AppShell
      subtitle="CRM WhatsApp"
      navItems={[
        { href: "/portal", label: "Portal" },
        { href: "/app/instagram", label: "Publicador no Instagram" },
        { href: "/app/leads", label: "CRM WhatsApp", active: true },
        { href: "/app/blog", label: "Blog Automatizado" },
        { href: "/app/configuracoes", label: "Configuracoes" }
      ]}
      aside={
        <>
          <span>{pagination.total.toLocaleString("pt-BR")} leads no CRM</span>
          <StatusBadge status={waitingCount ? "warning" : "success"}>{waitingCount ? `${waitingCount} sem acao` : "Operacao em dia"}</StatusBadge>
        </>
      }
    >
      <div className="v2-page v2-leads-page">
      <PageHeader
        eyebrow="Operacao comercial"
        title="CRM WhatsApp"
        description="Acompanhe volume, atendimento e conversao dos leads no periodo selecionado."
        actions={
          <>
            <button className="btn secondary" disabled={syncing} onClick={syncLeads}>
              {syncing ? <Loader2 className="spin" size={17} /> : <Database size={17} />}
              Sincronizar leads
            </button>
            <button className="btn secondary" disabled={loading} onClick={() => loadLeads()}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </>
        }
      />

      <section className="crm-strategic-header">
        <div>
          <span className="eyebrow">Visao estrategica</span>
          <h2>Performance da operacao</h2>
          <p>Volume, alcance e conversao dos leads no periodo selecionado.</p>
        </div>
        <div className="crm-period-tabs" aria-label="Periodo da visao estrategica">
          {([['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['all', 'Todo periodo']] as const).map(([value, label]) => (
            <button className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value)} type="button">
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="crm-performance-grid">
        <MetricCard label="Novos leads" value={pagination.total.toLocaleString("pt-BR")} hint={`${todayCount} entraram hoje`} />
        <MetricCard label="Taxa de contato" value={`${pagination.total ? Math.round((contactedCount / pagination.total) * 100) : 0}%`} hint={`${contactedCount} leads ja atendidos`} tone="info" />
        <MetricCard label="Avanco no funil" value={`${pagination.total ? Math.round((advancedCount / pagination.total) * 100) : 0}%`} hint={`${advancedCount} em interacao ou alem`} tone="warning" />
        <MetricCard label="Encaminhados" value={brokerCount.toLocaleString("pt-BR")} hint="para corretor" tone="success" />
        <MetricCard label="Conversao" value={`${conversionRate}%`} hint={`${wonCount} vendas concluidas`} tone="dark" />
      </section>

      <section className="crm-analytics-grid">
        <article className="panel crm-chart-panel">
          <div className="crm-panel-heading"><div><span className="eyebrow">Demanda</span><h3>Entradas por periodo</h3></div><span className="crm-count-pill">{pagination.total} leads</span></div>
          <div className="crm-bars" aria-label="Entradas de leads por periodo">
            {statusDistribution.map(({ stage, count, label }) => <div className="crm-bar-item" key={stage}><span>{label}</span><div className="crm-bar-track"><i className={`crm-bar ${stage}`} style={{ height: `${Math.max(8, pagination.total ? (count / pagination.total) * 100 : 8)}%` }} /></div><strong>{count}</strong></div>)}
          </div>
        </article>
        <article className="panel crm-chart-panel">
          <div className="crm-panel-heading"><div><span className="eyebrow">Pipeline</span><h3>Avanco do funil</h3></div><span className="crm-count-pill">{leads.filter(isOpenLead).length} ativos</span></div>
          <div className="crm-funnel-list">
            {statusDistribution.map(({ stage, count, label }) => <div className="crm-funnel-row" key={stage}><div><span>{label}</span><small>{pagination.total ? Math.round((count / pagination.total) * 100) : 0}% dos leads</small></div><strong>{count}</strong><div className="crm-funnel-track"><i className={`crm-funnel-fill ${stage}`} style={{ width: `${pagination.total ? (count / pagination.total) * 100 : 0}%` }} /></div></div>)}
          </div>
        </article>
      </section>

      <section className="crm-analytics-grid crm-analytics-secondary">
        <article className="panel crm-chart-panel crm-distribution-panel">
          <div className="crm-panel-heading"><div><span className="eyebrow">Distribuicao</span><h3>Leads por status</h3></div></div>
          <div className="crm-donut-layout"><div className="crm-donut" style={{ background: `conic-gradient(#f1b64b 0 ${pagination.total ? (newCount / pagination.total) * 100 : 0}%, #5f8ec4 ${pagination.total ? (newCount / pagination.total) * 100 : 0}% ${pagination.total ? ((newCount + contactedCount) / pagination.total) * 100 : 0}%, #9a69ba ${pagination.total ? ((newCount + contactedCount) / pagination.total) * 100 : 0}% 100%)` }}><strong>{pagination.total}</strong><small>leads</small></div><div className="crm-legend">{statusDistribution.map(({ stage, count, label }) => <span key={stage}><i className={`crm-dot ${stage}`} />{label}<strong>{count} · {pagination.total ? Math.round((count / pagination.total) * 100) : 0}%</strong></span>)}</div></div>
        </article>
        <article className="panel crm-chart-panel"><div className="crm-panel-heading"><div><span className="eyebrow">Resultado operacional</span><h3>Comparativo do funil</h3></div><span className="crm-count-pill">base: {pagination.total}</span></div><div className="crm-comparison">{[["Recebidos", pagination.total], ["Contatados", contactedCount], ["Encaminhados", brokerCount], ["Vendas", wonCount]].map(([label, count], index) => <div className="crm-comparison-row" key={String(label)}><span>{label}</span><div><i className={`comparison-${index}`} style={{ width: `${pagination.total ? (Number(count) / pagination.total) * 100 : 0}%` }} /></div><strong>{count}</strong></div>)}</div></article>
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

        {!loading && filteredLeads.length ? <section className="crm-table-section"><div className="crm-panel-heading"><div><span className="eyebrow">Carteira comercial</span><h3>Leads em atendimento</h3><p>Consulte contatos e atualize o estagio de cada oportunidade.</p></div><span className="crm-count-pill">{filteredLeads.length} leads</span></div><div className="crm-table-wrap"><table className="crm-leads-table"><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Data de entrada</th><th>Status</th><th>Acao</th></tr></thead><tbody>{filteredLeads.slice(0, 20).map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong></td><td>{digits(lead.phone) || "-"}</td><td>{formatDate(lead.lastMessageAt)}</td><td><select className={`status-select ${lead.status}`} value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><button className="btn tertiary crm-view-button" onClick={() => { setSelectedLeadId(lead.id); setViewMode("inbox"); }} type="button">Ver <ExternalLink size={14} /></button></td></tr>)}</tbody></table></div></section> : null}

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
        {!loading && pagination.totalPages > 1 ? (
          <div className="actions crm-pagination">
            <span className="step-caption">
              Pagina {pagination.page} de {pagination.totalPages} | {pagination.total} leads
            </span>
            <button className="btn secondary" disabled={pagination.page <= 1} onClick={() => loadLeads(pagination.page - 1)} type="button">
              Anterior
            </button>
            <button className="btn secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => loadLeads(pagination.page + 1)} type="button">
              Proxima
            </button>
          </div>
        ) : null}
      </section>
      </div>
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
