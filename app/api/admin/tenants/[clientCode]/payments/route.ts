import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { moneyFromValue, parsePaymentDate } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ clientCode: string }> }) {
  const { user, response } = await requirePlatformAdmin(request);
  if (response) return response;

  const { clientCode } = await context.params;
  const tenant = await prisma.tenant.findFirst({
    where: { clientCode: String(clientCode || "").toUpperCase() },
    select: { id: true, name: true }
  });
  if (!tenant) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const payment = await prisma.paymentRecord.create({
    data: {
      tenantId: tenant.id,
      description: String(body.description || tenant.name).trim(),
      amountCents: moneyFromValue(body.amount),
      paidAt: parsePaymentDate(body.paidAt) || new Date(),
      dueAt: parsePaymentDate(body.dueAt),
      status: String(body.status || "paid"),
      method: String(body.method || "").trim(),
      receiptUrl: String(body.receiptUrl || "").trim(),
      notes: String(body.notes || "").trim()
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user?.id,
      action: "payment.created",
      target: payment.id,
      metadata: { amountCents: payment.amountCents, status: payment.status }
    }
  });

  return NextResponse.json({ ok: true, payment });
}
