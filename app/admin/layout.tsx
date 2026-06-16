import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login?next=/admin");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.tenantId !== session.tenantId || !user.isPlatformAdmin) {
    redirect("/portal");
  }

  return children;
}
