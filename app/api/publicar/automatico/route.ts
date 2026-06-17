import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";
import { requireTenantService } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;

  const body = await request.json();
  const backend = await postToBackend("/api/publicar/automatico", body);

  if (backend) return NextResponse.json(backend);

  return NextResponse.json(
    { sucesso: false, error: "Publicacao automatica legada desativada. Use publicacao direta com credenciais do tenant." },
    { status: 503 }
  );
}
