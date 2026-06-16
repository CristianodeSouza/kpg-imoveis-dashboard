import { NextResponse } from "next/server";
import { getFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  const backend = await getFromBackend("/api/status");
  if (backend) return NextResponse.json({ ...backend, backend: "online" });

  return NextResponse.json({
    siga: process.env.SIGA_TOKEN ? "configurado" : "pendente",
    instagram: process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID ? "configurado" : "pendente",
    imgbb: process.env.IMGBB_API_KEY ? "configurado" : "pendente",
    ia_caption: "template (sem IA)",
    backend: "offline"
  });
}
