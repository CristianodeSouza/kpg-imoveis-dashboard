import { prisma } from "@/lib/db";

type JobStatus = "pending" | "processing" | "completed" | "failed";

export async function createJob(input: {
  tenantId: string;
  type: string;
  payload?: unknown;
  maxAttempts?: number;
  runAfter?: Date;
  priority?: number;
}) {
  return prisma.job.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      status: "pending",
      payload: input.payload === undefined ? undefined : (input.payload as any),
      maxAttempts: input.maxAttempts || 3,
      priority: input.priority || 100,
      runAfter: input.runAfter || new Date()
    }
  });
}

export async function startJob(jobId: string, workerId = "api") {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "processing",
      attempts: { increment: 1 },
      lockedAt: new Date(),
      lockedBy: workerId,
      startedAt: new Date(),
      error: ""
    }
  });
  await prisma.jobAttempt.upsert({
    where: { jobId_attempt: { jobId, attempt: job.attempts } },
    update: { status: "processing", startedAt: new Date(), error: "", finishedAt: null },
    create: { jobId, tenantId: job.tenantId, attempt: job.attempts, status: "processing" }
  });
  return job;
}

export async function completeJob(jobId: string, result?: unknown) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      result: result === undefined ? undefined : (result as any),
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: "",
      error: ""
    }
  });
  await prisma.jobAttempt.updateMany({
    where: { jobId, attempt: job.attempts },
    data: { status: "completed", result: result === undefined ? undefined : (result as any), finishedAt: new Date(), error: "" }
  });
  return job;
}

export async function failJob(jobId: string, error: unknown, result?: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Erro desconhecido.");
  const current = await prisma.job.findUnique({ where: { id: jobId } });
  if (!current) throw new Error("Job nao encontrado.");
  const shouldRetry = current.attempts < current.maxAttempts;
  const retryDelaySeconds = Math.min(900, Math.max(30, 2 ** Math.max(0, current.attempts - 1) * 30));
  const job = await prisma.job.update({
    where: { id: jobId },
    data: shouldRetry
      ? {
          status: "pending",
          error: message.slice(0, 2000),
          result: result === undefined ? undefined : (result as any),
          runAfter: new Date(Date.now() + retryDelaySeconds * 1000),
          lockedAt: null,
          lockedBy: "",
          finishedAt: null
        }
      : {
          status: "failed",
          error: message.slice(0, 2000),
          result: result === undefined ? undefined : (result as any),
          finishedAt: new Date(),
          lockedAt: null,
          lockedBy: ""
        }
  });
  await prisma.jobAttempt.updateMany({
    where: { jobId, attempt: current.attempts },
    data: {
      status: shouldRetry ? "retry_scheduled" : "failed",
      error: message.slice(0, 2000),
      result: result === undefined ? undefined : (result as any),
      finishedAt: new Date()
    }
  });
  return job;
}

export async function claimNextJob(workerId: string) {
  const stale = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.job.updateMany({
    where: { status: "processing", lockedAt: { lt: stale } },
    data: { status: "pending", lockedAt: null, lockedBy: "", error: "Job liberado por timeout de lock." }
  });

  const job = await prisma.job.findFirst({
    where: { status: "pending", runAfter: { lte: new Date() } },
    orderBy: [{ priority: "asc" }, { runAfter: "asc" }, { createdAt: "asc" }]
  });
  if (!job) return null;

  const claimed = await prisma.job.updateMany({
    where: { id: job.id, status: "pending" },
    data: { status: "processing", lockedAt: new Date(), lockedBy: workerId }
  });
  if (!claimed.count) return null;
  return startJob(job.id, workerId);
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
