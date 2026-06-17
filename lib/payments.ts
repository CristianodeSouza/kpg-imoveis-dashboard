import { prisma } from "@/lib/db";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function cycleFromAnchor(anchor?: Date | string | null, now = new Date()) {
  const start = anchor ? new Date(anchor) : new Date(now);
  if (Number.isNaN(start.getTime())) {
    start.setTime(now.getTime());
  }
  start.setUTCHours(0, 0, 0, 0);
  while (addDays(start, 30) <= now) {
    start.setUTCDate(start.getUTCDate() + 30);
  }
  return { cycleStart: new Date(start), cycleEnd: addDays(start, 30) };
}

export function moneyFromValue(value: unknown) {
  const text = String(value ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const number = Number(text || 0);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function parsePaymentDate(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getTenantPaymentOverview(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      billingStatus: true,
      monthlyValueCents: true,
      acquiredAt: true,
      createdAt: true
    }
  });
  if (!tenant) throw new Error("Cliente nao encontrado.");

  const { cycleStart, cycleEnd } = cycleFromAnchor(tenant.acquiredAt || tenant.createdAt);
  const payments = await prisma.paymentRecord.findMany({
    where: { tenantId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 80
  });
  const currentCyclePaid = payments.some((payment) => {
    const paidAt = payment.paidAt || payment.createdAt;
    return payment.status === "paid" && paidAt >= cycleStart && paidAt < cycleEnd;
  });

  return {
    summary: {
      tenantName: tenant.name,
      billingStatus: tenant.billingStatus,
      monthlyValueCents: tenant.monthlyValueCents,
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
      currentCyclePaid,
      paymentsCount: payments.length,
      lastPaymentAt: payments[0]?.paidAt?.toISOString() || payments[0]?.createdAt.toISOString() || null
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      description: payment.description || tenant.name,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt?.toISOString() || null,
      dueAt: payment.dueAt?.toISOString() || null,
      status: payment.status,
      method: payment.method,
      receiptUrl: payment.receiptUrl,
      notes: payment.notes,
      createdAt: payment.createdAt.toISOString()
    }))
  };
}
