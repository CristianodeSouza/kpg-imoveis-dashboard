import { prisma } from "@/lib/db";

export const instagramPostPlans = {
  starter: { name: "Essencial", monthlyLimit: 30 },
  growth: { name: "Crescimento", monthlyLimit: 60 },
  scale: { name: "Escala", monthlyLimit: 90 }
} as const;

type PlanSlug = keyof typeof instagramPostPlans;

function asPlanSlug(value?: string | null): PlanSlug {
  return value && value in instagramPostPlans ? (value as PlanSlug) : "starter";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function cycleForDate(anchor?: Date | string | null, now = new Date()) {
  const start = anchor ? new Date(anchor) : new Date(now);
  if (Number.isNaN(start.getTime())) return cycleForDate(null, now);
  start.setUTCHours(0, 0, 0, 0);

  while (addDays(start, 30) <= now) {
    start.setUTCDate(start.getUTCDate() + 30);
  }

  return {
    cycleStart: new Date(start),
    cycleEnd: addDays(start, 30)
  };
}

export async function getInstagramUsage(tenantId: string) {
  const tenantService = await prisma.tenantService.findFirst({
    where: { tenantId, service: { slug: "instagram-publisher" } },
    include: {
      service: true,
      tenant: { select: { acquiredAt: true, createdAt: true } }
    }
  });

  const planSlug = asPlanSlug(tenantService?.plan);
  const plan = instagramPostPlans[planSlug];
  const { cycleStart, cycleEnd } = cycleForDate(tenantService?.tenant.acquiredAt || tenantService?.tenant.createdAt);
  const used = await prisma.publicationLog.count({
    where: {
      tenantId,
      status: "published",
      cycleStart,
      cycleEnd
    }
  });

  return {
    plan: planSlug,
    planName: plan.name,
    monthlyLimit: plan.monthlyLimit,
    used,
    remaining: Math.max(0, plan.monthlyLimit - used),
    exceeded: used > plan.monthlyLimit,
    cycleStart: cycleStart.toISOString(),
    cycleEnd: cycleEnd.toISOString()
  };
}

export async function ensureInstagramQuota(tenantId: string) {
  const usage = await getInstagramUsage(tenantId);
  if (usage.used >= usage.monthlyLimit) {
    throw new Error(
      `Limite mensal atingido: ${usage.used}/${usage.monthlyLimit} posts no pacote ${usage.planName}. O ciclo renova em ${new Date(
        usage.cycleEnd
      ).toLocaleDateString("pt-BR")}.`
    );
  }
  return usage;
}

export async function recordInstagramPublication(input: {
  tenantId: string;
  userId?: string | null;
  propertyCode?: string | number | null;
  caption?: string | null;
  instagramPostId?: string | number | null;
  instagramUrl?: string | null;
  mediaType?: string | null;
  photosCount?: number | null;
  metadata?: unknown;
}) {
  const usage = await getInstagramUsage(input.tenantId);
  const log = await prisma.publicationLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId || null,
      propertyCode: String(input.propertyCode || ""),
      caption: String(input.caption || "").slice(0, 2000),
      instagramPostId: String(input.instagramPostId || ""),
      instagramUrl: String(input.instagramUrl || ""),
      mediaType: String(input.mediaType || "post"),
      photosCount: Number(input.photosCount || 0),
      cycleStart: new Date(usage.cycleStart),
      cycleEnd: new Date(usage.cycleEnd),
      metadata: input.metadata === undefined ? undefined : (input.metadata as any)
    }
  });
  return { log, usage: await getInstagramUsage(input.tenantId) };
}

export async function listInstagramPublications(tenantId: string, take = 50) {
  return prisma.publicationLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take
  });
}

export function publicationTitleFromCaption(caption?: string | null, fallback = "Publicacao no Instagram") {
  const lines = String(caption || "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s✨⭐🌟📍📌🏡🔸•\-–—:]+/u, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const locationLine = lines.find((line) => /excelente|apartamento|casa|resid[eê]ncia|lan[cç]amento|sofistica[cç][aã]o|im[oó]vel/i.test(line));
  return (locationLine || lines[0] || fallback).slice(0, 120);
}
