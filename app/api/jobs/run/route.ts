import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { runJobBatch } from "@/lib/job-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.JOBS_RUN_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const provided = request.headers.get("x-jobs-secret") || (auth.startsWith("Bearer ") ? auth.slice(7) : "") || new URL(request.url).searchParams.get("secret");
  return provided === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    const { response } = await requirePlatformAdmin(request);
    if (response) return response;
  }
  const body = await request.json().catch(() => ({}));
  const result = await runJobBatch({
    limit: Number(body.limit || new URL(request.url).searchParams.get("limit") || 5),
    workerId: String(body.workerId || `api-${Date.now()}`)
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const result = await runJobBatch({
    limit: Number(new URL(request.url).searchParams.get("limit") || 5),
    workerId: `cron-${Date.now()}`
  });
  return NextResponse.json({ ok: true, ...result });
}
