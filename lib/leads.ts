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

function cleanMessage(value: string) {
  return value
    .replace(/https?:\/\/[^\s]+/gi, (url) => {
      const match = url.match(/\/imovel\/([^/\s]+)\/(\d+)/i);
      if (match) return `Imovel KPG ${match[2]} (${match[1].replace(/-/g, " ")})`;
      if (url.includes("backblazeb2.com")) return "[arquivo temporario]";
      return "[link]";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function extractPropertyUrl(message: string) {
  return message.match(/https?:\/\/www\.kpgimoveis\.com\.br\/imovel\/[^\s]+/i)?.[0];
}

function extractPropertyCode(message: string) {
  const urlCode = message.match(/\/imovel\/[^/\s]+\/(\d+)/i)?.[1];
  if (urlCode) return urlCode;
  return message.match(/\b(?:codigo|cod|ref|v)\s*[:#-]?\s*(\d{3,6})\b/i)?.[1];
}

function inferDirection(source: LooseRecord, message: string): Lead["direction"] {
  const fromMe = firstText(source, ["fromMe"]).toLowerCase();
  const fromApi = firstText(source, ["fromApi"]).toLowerCase();
  if (fromMe === "false") return "cliente";
  if (fromMe === "true" && fromApi === "true") return "automacao";
  if (fromMe === "true" && fromApi === "false") return "humano";
  if (/cliente recebeu|encaminhado|agrupando|deu algum cliente/i.test(message)) return "automacao";
  return "desconhecido";
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

  const message = firstText(source, ["mensagem", "mensagem_buffer", "message", "text"]);
  const normalized = message.toLowerCase();
  const slug = extractPropertyUrl(message)?.match(/\/imovel\/([^/\s]+)\//i)?.[1]?.replace(/-/g, " ");
  if (slug) {
    if (slug.includes("sala")) return "Sala comercial";
    if (slug.includes("apartamento")) return "Apartamento";
    if (slug.includes("terreno")) return "Terreno";
    if (slug.includes("casa")) return "Casa";
  }
  if (normalized.includes("sala") || normalized.includes("comercial")) return "Sala comercial";
  if (normalized.includes("apartamento") || normalized.includes("apto")) return "Apartamento";
  if (normalized.includes("casa")) return "Casa";
  if (normalized.includes("terreno") || normalized.includes("lote")) return "Terreno";
  if (normalized.includes("alug")) return "Aluguel";
  if (message.includes("invest")) return "Investimento";
  return "Nao informado";
}

function normalizeStatus(value: string, message = ""): LeadStatus {
  const status = `${value} ${message}`.toLowerCase();
  if (status.includes("ganho") || status.includes("fechado")) return "ganho";
  if (status.includes("perdido") || status.includes("descartado")) return "perdido";
  if (status.includes("humano") || status.includes("corretor") || status.includes("acionado") || status.includes("encaminhado")) return "corretor_acionado";
  if (status.includes("atendimento") || status.includes("andamento")) return "em_atendimento";
  return "novo";
}

export function normalizeLead(payload: unknown): Lead {
  const source = payload && typeof payload === "object" ? (payload as LooseRecord) : {};
  const now = new Date().toISOString();
  const phone = firstText(source, ["phone", "telefone", "whatsapp", "numero", "number"]);
  const timestamp = firstText(source, ["timestamp", "data", "createdAt", "created_at"]) || now;
  const statusText = firstText(source, ["status", "atualizacao_atendimento", "stage"]);
  const originalMessage = firstText(source, ["mensagem", "mensagem_buffer", "message", "text", "observacao"]);
  const propertyUrl = extractPropertyUrl(originalMessage);

  return {
    id: crypto.randomUUID(),
    name: firstText(source, ["nome", "name", "cliente", "lead_name"]) || "Lead sem nome",
    phone,
    propertyInterest: inferInterest(source),
    propertyCode: extractPropertyCode(originalMessage),
    propertyUrl,
    message: cleanMessage(originalMessage),
    originalMessage,
    status: normalizeStatus(statusText, originalMessage),
    stage: firstText(source, ["atualizacao_atendimento", "stage", "status"]),
    source: firstText(source, ["source", "origem"]) || "Make",
    conversationId: firstText(source, ["conversation_id", "conversationId"]),
    chatLid: firstText(source, ["chatLid", "chat_lid", "Key"]),
    direction: inferDirection(source, originalMessage),
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
      propertyCode: incoming.propertyCode || existing.propertyCode,
      propertyUrl: incoming.propertyUrl || existing.propertyUrl,
      message: incoming.message || existing.message,
      originalMessage: incoming.originalMessage || existing.originalMessage,
      status: incoming.status !== "novo" ? incoming.status : existing.status,
      stage: incoming.stage || existing.stage,
      source: incoming.source || existing.source,
      conversationId: incoming.conversationId || existing.conversationId,
      chatLid: incoming.chatLid || existing.chatLid,
      direction: incoming.direction !== "desconhecido" ? incoming.direction : existing.direction,
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

export async function upsertLeads(payloads: unknown[]) {
  let leads = await readLeads();
  const imported: Lead[] = [];

  for (const payload of payloads) {
    const incoming = normalizeLead(payload);
    const existingIndex = leads.findIndex((lead) => sameLead(lead, incoming));

    if (existingIndex >= 0) {
      const existing = leads[existingIndex];
      const updated: Lead = {
        ...existing,
        name: incoming.name !== "Lead sem nome" ? incoming.name : existing.name,
        phone: incoming.phone || existing.phone,
        propertyInterest: incoming.propertyInterest !== "Nao informado" ? incoming.propertyInterest : existing.propertyInterest,
        propertyCode: incoming.propertyCode || existing.propertyCode,
        propertyUrl: incoming.propertyUrl || existing.propertyUrl,
        message: incoming.message || existing.message,
        originalMessage: incoming.originalMessage || existing.originalMessage,
        status: incoming.status !== "novo" ? incoming.status : existing.status,
        stage: incoming.stage || existing.stage,
        source: incoming.source || existing.source,
        conversationId: incoming.conversationId || existing.conversationId,
        chatLid: incoming.chatLid || existing.chatLid,
        direction: incoming.direction !== "desconhecido" ? incoming.direction : existing.direction,
        lastMessageAt: incoming.lastMessageAt,
        interactions: Math.max(existing.interactions, incoming.interactions),
        notes: incoming.notes || existing.notes,
        raw: incoming.raw
      };
      leads = [updated, ...leads.filter((_, index) => index !== existingIndex)];
      imported.push(updated);
    } else {
      leads = [incoming, ...leads];
      imported.push(incoming);
    }
  }

  await writeLeads(leads);
  return { imported, leads };
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
  const leads = await readLeads();
  const next = leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead));
  await writeLeads(next);
  return next.find((lead) => lead.id === id) || null;
}
