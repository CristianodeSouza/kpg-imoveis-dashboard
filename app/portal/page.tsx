"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, Instagram, LayoutDashboard, Loader2, Settings, Shield, Users } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";

type PortalService = {
  slug: string;
  name: string;
  description?: string;
  href: string;
  icon: string;
  plan: string;
  status: string;
};

type PortalData = {
  user: {
    name: string;
    username: string;
    role: string;
    isPlatformAdmin: boolean;
  };
  tenant: {
    name: string;
    slug: string;
    status: string;
  };
  services: PortalService[];
};

const iconMap = {
  instagram: Instagram,
  users: Users,
  settings: Settings,
  layout: LayoutDashboard
};

function ServiceIcon({ icon }: { icon: string }) {
  const Icon = iconMap[icon as keyof typeof iconMap] || LayoutDashboard;
  return <Icon size={22} />;
}

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPortal() {
      try {
        const response = await fetch("/api/portal", { cache: "no-store" });
        const payload = await response.json();
        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/portal")}`;
          return;
        }
        if (!response.ok) throw new Error(payload.error || "Nao foi possivel carregar o portal.");
        setData(payload);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erro ao carregar portal.");
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, []);

  const services = data?.services.filter((service) => service.slug !== "portal") || [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>Portal SaaS</span>
        </div>
        <nav className="tool-nav" aria-label="Portal CSR">
          <a className="tool-link active" href="/portal">
            Portal
          </a>
          {data?.user.isPlatformAdmin ? (
            <a className="tool-link" href="/admin">
              Admin
            </a>
          ) : null}
          <LogoutButton />
        </nav>
      </header>

      <section className="workspace">
        <section className="portal-hero panel">
          <div>
            <span className="eyebrow">Cliente conectado</span>
            <h1>{data?.tenant.name || "Portal CSR Tecnologia"}</h1>
            <p>{data ? `Ola, ${data.user.name}. Acesse os servicos contratados para esta conta.` : "Carregando seus servicos contratados."}</p>
          </div>
          <div className="portal-account">
            <Building2 size={20} />
            <span>{data?.tenant.slug || "tenant"}</span>
          </div>
        </section>

        {loading ? (
          <section className="panel empty-state">
            <Loader2 className="spin" size={24} />
            <strong>Carregando portal</strong>
          </section>
        ) : null}

        {message ? <div className="message error">{message}</div> : null}

        {!loading && data ? (
          <section className="portal-grid">
            {services.length ? (
              services.map((service) => (
                <a className="portal-card" href={service.href} key={service.slug}>
                  <span className="portal-card-icon">
                    <ServiceIcon icon={service.icon} />
                  </span>
                  <span>
                    <strong>{service.name}</strong>
                    <small>{service.description || "Servico contratado"}</small>
                  </span>
                  <span className="portal-card-footer">
                    <span>{service.plan}</span>
                    <ArrowRight size={17} />
                  </span>
                </a>
              ))
            ) : (
              <section className="panel empty-state">
                <Shield size={24} />
                <strong>Nenhum servico ativo</strong>
                <span>Fale com a CSR Tecnologia para ativar o primeiro modulo deste cliente.</span>
              </section>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
