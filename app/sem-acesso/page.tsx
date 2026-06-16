import { ShieldAlert } from "lucide-react";

export default function SemAcessoPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>Portal SaaS</span>
        </div>
        <nav className="tool-nav" aria-label="Portal CSR">
          <a className="tool-link" href="/portal">
            Portal
          </a>
        </nav>
      </header>
      <section className="workspace">
        <section className="panel empty-state">
          <ShieldAlert size={28} />
          <strong>Servico nao contratado</strong>
          <span>Este modulo nao esta ativo para a sua empresa. Fale com a CSR Tecnologia para liberar o acesso.</span>
        </section>
      </section>
    </main>
  );
}
