import { NextResponse } from "next/server";
import { requireTenantService } from "@/lib/services";
import { getInstagramUsage, listInstagramPublications } from "@/lib/publications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, response } = await requireTenantService(request, "instagram-publisher");
  if (response) return response;
  if (!session) return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });

  const [usage, publications] = await Promise.all([
    getInstagramUsage(session.tenantId),
    listInstagramPublications(session.tenantId, 80)
  ]);

  return NextResponse.json({
    usage,
    publications: publications.map((item) => ({
      id: item.id,
      propertyCode: item.propertyCode,
      caption: item.caption,
      instagramPostId: item.instagramPostId,
      instagramUrl: item.instagramUrl,
      mediaType: item.mediaType,
      photosCount: item.photosCount,
      status: item.status,
      createdAt: item.createdAt,
      cycleStart: item.cycleStart,
      cycleEnd: item.cycleEnd
    }))
  });
}
