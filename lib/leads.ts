import type { Lead, LeadStatus } from "@/lib/types";
import { prisma } from "@/lib/db";

type LooseRecord = Record<string, unknown>;

const MAX_LEADS_PAGE_SIZE = 100;

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

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function leadFromDb(lead: any): Lead {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    propertyInterest: lead.propertyInterest,
    propertyCode: lead.propertyCode || undefined,
    propertyUrl: lead.propertyUrl || undefined,
    message: lead.message,
    originalMessage: lead.originalMessage,
    status: lead.status as LeadStatus,
    stage: lead.stage || undefined,
    source: lead.source,
    conversationId: lead.conversationId || undefined,
    chatLid: lead.chatLid || undefined,
    direction: lead.direction,
    createdAt: lead.createdAt.toISOString(),
    lastMessageAt: lead.lastMessageAt.toISOString(),
    interactions: lead.interactions,
    notes: lead.notes || undefined,
    raw: lead.raw || undefined
  };
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

async function resolveTenantId(tenantId?: string | null) {
  const resolvedTenantId = text(tenantId);
  if (!resolvedTenantId) throw new Error("tenantId obrigatorio para leads.");
  return resolvedTenantId;
}

function leadIdentityWhere(tenantId: string, lead: Lead) {
  const OR: Array<{ phone?: string; chatLid?: string; conversationId?: string }> = [];
  if (lead.phone) OR.push({ phone: lead.phone });
  if (lead.chatLid) OR.push({ chatLid: lead.chatLid });
  if (lead.conversationId) OR.push({ conversationId: lead.conversationId });

  return OR.length ? { tenantId, OR } : null;
}

export async function readLeads(tenantId?: string | null, options?: { page?: number; pageSize?: number; status?: string }) {
  const resolvedTenantId = await resolveTenantId(tenantId);
  const page = Math.max(1, Number(options?.page || 1));
  const pageSize = Math.min(MAX_LEADS_PAGE_SIZE, Math.max(1, Number(options?.pageSize || 100)));
  const status = text(options?.status);
  const where = {
    tenantId: resolvedTenantId,
    ...(status ? { status } : {})
  };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize
  });

  return leads.map(leadFromDb);
}

async function createInteraction(tenantId: string, leadId: string, lead: Lead) {
  await prisma.leadInteraction.create({
    data: {
      tenantId,
      leadId,
      message: lead.originalMessage || lead.message,
      direction: lead.direction,
      raw: lead.raw as any
    }
  });
}

async function persistLead(payload: unknown, tenantId: string) {
  const resolvedTenantId = await resolveTenantId(tenantId);
  const incoming = normalizeLead(payload);
  const identityWhere = leadIdentityWhere(resolvedTenantId, incoming);
  const existing = identityWhere ? await prisma.lead.findFirst({ where: identityWhere }) : null;
  const lastMessageAt = parseDate(incoming.lastMessageAt);

  if (existing) {
    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
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
        lastMessageAt,
        interactions: { increment: 1 },
        notes: incoming.notes || existing.notes,
        raw: incoming.raw as any
      }
    });
    await createInteraction(resolvedTenantId, updated.id, incoming);
    return leadFromDb(updated);
  }

  const created = await prisma.lead.create({
    data: {
      tenantId: resolvedTenantId,
      name: incoming.name,
      phone: incoming.phone,
      propertyInterest: incoming.propertyInterest,
      propertyCode: incoming.propertyCode || "",
      propertyUrl: incoming.propertyUrl || "",
      message: incoming.message,
      originalMessage: incoming.originalMessage,
      status: incoming.status,
      stage: incoming.stage || "",
      source: incoming.source,
      conversationId: incoming.conversationId || "",
      chatLid: incoming.chatLid || "",
      direction: incoming.direction,
      createdAt: parseDate(incoming.createdAt),
      lastMessageAt,
      interactions: incoming.interactions,
      notes: incoming.notes || "",
      raw: incoming.raw as any
    }
  });
  await createInteraction(resolvedTenantId, created.id, incoming);
  return leadFromDb(created);
}

export async function upsertLead(payload: unknown, tenantId?: string | null) {
  const resolvedTenantId = await resolveTenantId(tenantId);
  const lead = await persistLead(payload, resolvedTenantId);
  const leads = await readLeads(resolvedTenantId);
  return { lead, leads };
}

export async function upsertLeads(payloads: unknown[], tenantId?: string | null) {
  const resolvedTenantId = await resolveTenantId(tenantId);
  const imported: Lead[] = [];

  for (const payload of payloads) {
    imported.push(await persistLead(payload, resolvedTenantId));
  }

  const leads = await readLeads(resolvedTenantId);
  return { imported, leads };
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>, tenantId?: string | null) {
  const resolvedTenantId = await resolveTenantId(tenantId);
  const existing = await prisma.lead.findFirst({ where: { id, tenantId: resolvedTenantId } });
  if (!existing) return null;

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "notes") ? { notes: text(patch.notes) } : {})
    }
  });
  return leadFromDb(lead);
}
