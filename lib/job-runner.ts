import { claimJobById, claimNextJob, completeJob, failJob } from "@/lib/jobs";
import { publishInstagramJob } from "@/lib/instagram-publisher";
import { analyzeSitemapJob } from "@/lib/seo-sitemap-job";

type JobPayload = Record<string, any>;

async function processJob(job: { id: string; tenantId: string; type: string; payload: unknown }) {
  const payload = (job.payload || {}) as JobPayload;

  if (job.type === "instagram.publish") {
    return publishInstagramJob({
      tenantId: job.tenantId,
      userId: payload.userId,
      caption: payload.caption,
      imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
      jobId: job.id
    });
  }

  if (job.type === "seo.sitemap.analyze") {
    return analyzeSitemapJob({
      tenantId: job.tenantId,
      userId: payload.userId,
      siteId: String(payload.siteId || "")
    });
  }

  throw new Error(`Tipo de job nao suportado: ${job.type}`);
}

export async function runJobBatch(options?: { limit?: number; workerId?: string }) {
  const workerId = options?.workerId || `worker-${Date.now()}`;
  const limit = Math.min(20, Math.max(1, options?.limit || 5));
  const processed = [];

  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob(workerId);
    if (!job) break;
    try {
      const result = await processJob(job);
      await completeJob(job.id, result);
      processed.push({ id: job.id, type: job.type, status: "completed" });
    } catch (error) {
      const failed = await failJob(job.id, error);
      processed.push({ id: job.id, type: job.type, status: failed.status, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { processed };
}

export async function runJobById(jobId: string, options?: { workerId?: string }) {
  const workerId = options?.workerId || `worker-${Date.now()}`;
  const job = await claimJobById(jobId, workerId);
  if (!job) return null;

  try {
    const result = await processJob(job);
    await completeJob(job.id, result);
    return { id: job.id, type: job.type, status: "completed", result };
  } catch (error) {
    const failed = await failJob(job.id, error);
    return {
      id: job.id,
      type: job.type,
      status: failed.status,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
