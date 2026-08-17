"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Phone } from "lucide-react";
import { AppShell, LoadingState, StatusBadge } from "@/app/components/ds";
import type { LeadStatus } from "@/lib/types";

const labels: Record<LeadStatus, string> = { novo: "Novo Lead / Nao Atendido", em_atendimento: "Em Atendimento / Contato Inicial", corretor_acionado: "Visita Agendada", ganho: "Venda Fechada / Concluida", perdido: "Perdido / Arquivado" };
const tones: Record<LeadStatus, "neutral" | "info" | "warning" | "success" | "danger"> = { novo: "warning", em_atendimento: "info", corretor_acionado: "info", ganho: "success", perdido: "neutral" };
const statuses = Object.keys(labels) as LeadStatus[];

function date(value: string) { return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-"; }
function direction(value: string) { return value === "cliente" ? "Cliente" : value === "automacao" ? "Resposta do agente" : value === "humano" ? "Corretor" : "Mensagem"; }

type Detail = { id: string; name: string; phone: string; status: LeadStatus; brokerStatus: string; propertyInterest: string; propertyCode: string; source: string; createdAt: string; lastMessageAt: string; interactions: number; notes: string; history: Array<{ id: string; message: string; direction: string; createdAt: string }> };

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [lead, setLead] = useState<Detail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { params.then(({ id }) => { fetch(`/api/leads/${id}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar o atendimento."); setLead(data.lead); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Erro ao carregar atendimento.")).finally(() => setLoading(false)); }); }, [params]);
  async function updateStatus(status: LeadStatus) { if (!lead) return; const response = await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, status }) }); if (response.ok) setLead({ ...lead, status }); }

  return <AppShell subtitle="CRM WhatsApp" navItems={[{ href: "/portal", label: "Portal" }, { href: "/app/instagram", label: "Publicador no Instagram" }, { href: "/app/leads", label: "CRM WhatsApp", active: true }, { href: "/app/blog", label: "Blog Automatizado" }, { href: "/app/configuracoes", label: "Configuracoes" }]}>
    <div className="v2-page v2-lead-detail-page"><a className="crm-detail-back" href="/app/leads"><ArrowLeft size={16} /> Voltar para leads</a>{loading ? <LoadingState title="Carregando atendimento" /> : error ? <div className="message error">{error}</div> : lead ? <>
      <section className="crm-fvs-detail-header"><div><span className="eyebrow">Detalhes do atendimento</span><h1>{lead.name}</h1></div><select className={`status-select ${lead.status}`} value={lead.status} onChange={(event) => updateStatus(event.target.value as LeadStatus)}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></section>
      <section className="crm-detail-summary-grid"><article><span>WhatsApp</span><strong><Phone size={16} />{lead.phone || "Nao informado"}</strong></article><article><span>Data da 1 conversa</span><strong><CalendarDays size={16} />{date(lead.createdAt)}</strong></article><article><span>Status do corretor</span><strong>{lead.brokerStatus || "Aguardando atualizacao"}</strong></article></section>
      <section className="panel crm-broker-report"><div className="crm-panel-heading"><div><span className="eyebrow">Acompanhamento comercial</span><h2>Relatorio do corretor</h2><p>Registro compartilhado com todos os usuarios do CRM.</p></div><span className="crm-count-pill">{lead.source || "CRM"}</span></div><div className="crm-report-empty">{lead.brokerStatus ? `Status atual: ${lead.brokerStatus}` : "Os corretores ainda nao registraram uma atualizacao para este lead."}</div></section>
      <section className="crm-compiled-conversation"><div className="crm-panel-heading"><div><h2>Conversa compilada</h2><p>{lead.interactions} interacoes registradas no Supabase.</p></div><span className="crm-count-pill">{date(lead.lastMessageAt)}</span></div><div className="crm-history-list">{lead.history.length ? lead.history.map((item) => <article className={`crm-history-block ${item.direction}`} key={item.id}><span>{direction(item.direction)} · {date(item.createdAt)}</span><p>{item.message || "Mensagem sem texto"}</p></article>) : <div className="crm-report-empty">Nenhuma mensagem registrada.</div>}</div></section>
    </> : null}</div>
  </AppShell>;
}
