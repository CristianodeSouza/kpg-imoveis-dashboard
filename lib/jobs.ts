import { prisma } from "@/lib/db";

type JobStatus = "pending" | "processing" | "completed" | "failed";

export async function createJob(input: {
  tenantId: string;
  type: string;
  payload?: unknown;
  maxAttempts?: number;
  runAfter?: Date;
}) {
  return prisma.job.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      status: "pending",
      payload: input.payload === undefined ? undefined : (input.payload as any),
      maxAttempts: input.maxAttempts || 3,
      runAfter: input.runAfter || new Date()
    }
  });
}

export async function startJob(jobId: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "processing",
      attempts: { increment: 1 },
      startedAt: new Date(),
      error: ""
    }
  });
}

export async function completeJob(jobId: string, result?: unknown) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      result: result === undefined ? undefined : (result as any),
      finishedAt: new Date(),
      error: ""
    }
  });
}

export async function failJob(jobId: string, error: unknown, result?: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Erro desconhecido.");
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: "failed",
      error: message.slice(0, 2000),
      result: result === undefined ? undefined : (result as any),
      finishedAt: new Date()
    }
  });
}

export function jobStatusLabel(status: string) {
  const labels: Record<JobStatus, string> = {
    pending: "Pendente",
    processing: "Processando",
    completed: "Concluido",
    failed: "Falhou"
  };
  return labels[status as JobStatus] || status;
}
