import { ShieldAlert } from "lucide-react";
import { AppShell, EmptyState } from "@/app/components/ds";

export default function SemAcessoPage() {
  return (
    <AppShell
      subtitle="Portal SaaS"
      navItems={[
        { href: "/portal", label: "Portal", active: true }
      ]}
    >
      <section className="v2-page">
        <section className="panel">
          <EmptyState icon={<ShieldAlert size={28} />} title="Servico nao contratado">
            Este modulo nao esta ativo para a sua empresa. Fale com a CSR Tecnologia para liberar o acesso.
          </EmptyState>
        </section>
      </section>
    </AppShell>
  );
}
