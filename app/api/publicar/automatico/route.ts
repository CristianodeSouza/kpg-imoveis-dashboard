import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const backend = await postToBackend("/api/publicar/automatico", body);

  if (backend) return NextResponse.json(backend);

  return NextResponse.json(
    { sucesso: false, error: "Publicacao automatica depende do backend FastAPI em BACKEND_URL." },
    { status: 503 }
  );
}
