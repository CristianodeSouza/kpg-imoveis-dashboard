import type { Lead, LeadStatus } from "@/lib/types";

type LooseRecord = Record<string, unknown>;

const STORAGE_KEY = "kpg:leads:v1";
const MAX_LEADS = 500;
const memoryStore = globalThis as typeof globalThis & { __kpgLeads?: Lead[] };

function text(value: unknown) {
  return String(value ?? "").trim();
}

function firstText(source: LooseRecord, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(source).find((item) => item.toLowerCase() === key.toLowerCase());
    const value = found ? text(source[found]) : "";
    if (value) return value;
  }
  return "";
}

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand(command: unknown[]) {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Falha ao acessar armazenamento de leads.");
  return data.result;
}

export async function readLeads() {
  const stored = await redisCommand(["GET", STORAGE_KEY]);
  if (typeof stored === "string") {
    return JSON.parse(stored) as Lead[];
  }

  memoryStore.__kpgLeads ||= [];
  return memoryStore.__kpgLeads;
}

async function writeLeads(leads: Lead[]) {
  const limited = leads.slice(0, MAX_LEADS);
  const result = await redisCommand(["SET", STORAGE_KEY, JSON.stringify(limited)]);
  if (result === null) {
    memoryStore.__kpgLeads = limited;
  }
  return limited;
}

function inferInterest(source: LooseRecord) {
  const explicit = firstText(source, [
    "tipo_imovel",
    "tipoImovel",
    "interesse",
    "imovel",
    "propertyInterest",
    "property_interest",
    "filtro",
    "perfil_busca"
  ]);
  if (explicit) return explicit;

  const message = firstText(source, ["mensagem", "mensagem_buffer", "message", "text"]).toLowerCase();
  if (message.includes("sala") || message.includes("comercial")) return "Sala comercial";
  if (message.includes("apartamento") || message.includes("apto")) return "Apartamento";
  if (message.includes("casa")) return "Casa";
  if (message.includes("terreno") || message.includes("lote")) return "Terreno";
  if (message.includes("invest")) return "Investimento";
  return "Nao informado";
}

function normalizeStatus(value: string): LeadStatus {
  const status = value.toLowerCase();
  if (status.includes("ganho") || status.includes("fechado")) return "ganho";
  if (status.includes("perdido") || status.includes("descartado")) return "perdido";
  if (status.includes("humano") || status.includes("corretor") || status.includes("acionado")) return "corretor_acionado";
  if (status.includes("atendimento") || status.includes("andamento")) return "em_atendimento";
  return "novo";
}

export function normalizeLead(payload: unknown): Lead {
  const source = payload && typeof payload === "object" ? (payload as LooseRecord) : {};
  const now = new Date().toISOString();
  const phone = firstText(source, ["phone", "telefone", "whatsapp", "numero", "number"]);
  const timestamp = firstText(source, ["timestamp", "data", "createdAt", "created_at"]) || now;
  const statusText = firstText(source, ["status", "atualizacao_atendimento", "stage"]);

  return {
    id: crypto.randomUUID(),
    name: firstText(source, ["nome", "name", "cliente", "lead_name"]) || "Lead sem nome",
    phone,
    propertyInterest: inferInterest(source),
    message: firstText(source, ["mensagem", "mensagem_buffer", "message", "text", "observacao"]),
    status: normalizeStatus(statusText),
    source: firstText(source, ["source", "origem"]) || "Make",
    conversationId: firstText(source, ["conversation_id", "conversationId"]),
    chatLid: firstText(source, ["chatLid", "chat_lid", "Key"]),
    createdAt: timestamp,
    lastMessageAt: timestamp,
    interactions: 1,
    notes: firstText(source, ["notes", "observacoes", "observacao"]),
    raw: payload
  };
}

function sameLead(a: Lead, b: Lead) {
  return Boolean(
    (a.phone && b.phone && a.phone === b.phone) ||
      (a.chatLid && b.chatLid && a.chatLid === b.chatLid) ||
      (a.conversationId && b.conversationId && a.conversationId === b.conversationId)
  );
}

export async function upsertLead(payload: unknown) {
  const incoming = normalizeLead(payload);
  const leads = await readLeads();
  const existingIndex = leads.findIndex((lead) => sameLead(lead, incoming));

  if (existingIndex >= 0) {
    const existing = leads[existingIndex];
    const updated: Lead = {
      ...existing,
      name: incoming.name !== "Lead sem nome" ? incoming.name : existing.name,
      phone: incoming.phone || existing.phone,
      propertyInterest: incoming.propertyInterest !== "Nao informado" ? incoming.propertyInterest : existing.propertyInterest,
      message: incoming.message || existing.message,
      status: incoming.status !== "novo" ? incoming.status : existing.status,
      source: incoming.source || existing.source,
      conversationId: incoming.conversationId || existing.conversationId,
      chatLid: incoming.chatLid || existing.chatLid,
      lastMessageAt: incoming.lastMessageAt,
      interactions: existing.interactions + 1,
      notes: incoming.notes || existing.notes,
      raw: incoming.raw
    };
    leads.splice(existingIndex, 1);
    return { lead: updated, leads: await writeLeads([updated, ...leads]) };
  }

  return { lead: incoming, leads: await writeLeads([incoming, ...leads]) };
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
  const leads = await readLeads();
  const next = leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead));
  await writeLeads(next);
  return next.find((lead) => lead.id === id) || null;
}
