import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function auditLog(input: {
  tenantId: string;
  userId?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        action: input.action,
        target: input.target || null,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue
      }
    });
  } catch {
    // Auditoria nao deve derrubar o fluxo principal.
  }
}
