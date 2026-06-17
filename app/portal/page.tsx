"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, CreditCard, Instagram, LayoutDashboard, Loader2, Settings, Shield, Users } from "lucide-react";
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
  layout: LayoutDashboard,
  payment: CreditCard
};

function ServiceIcon({ icon }: { icon: string }) {
  const Icon = iconMap[icon as keyof typeof iconMap] || LayoutDashboard;
  return <Icon size={22} />;
}

function productClass(slug: string) {
  if (slug === "instagram-publisher") return "portal-product-instagram";
  if (slug === "mini-crm") return "portal-product-crm";
  return "portal-product-default";
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

  const services = data?.services || [];
  const productServices = services.filter((service) => !["portal", "settings", "payments"].includes(service.slug));
  const settingsService = services.find((service) => service.slug === "settings") || {
    slug: "settings",
    name: "Configuracoes",
    description: "Credenciais SIGA, Meta, Instagram e WhatsApp.",
    href: "/app/configuracoes",
    icon: "settings",
    plan: "core",
    status: "active"
  };
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
          <div className="portal-quick-area">
            <div className="portal-account-actions" aria-label="Acoes da conta">
              <a className="portal-account-link" href="/app/pagamentos">
                <CreditCard size={17} />
                <span>Pagamentos</span>
              </a>
              <a className="portal-settings-link" href={settingsService.href} aria-label="Configuracoes da conta">
                <Settings size={19} />
              </a>
            </div>
            <div className="portal-account">
              <Building2 size={20} />
              <span>{data?.tenant.slug || "tenant"}</span>
            </div>
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
          <section className="portal-products-section">
            <div className="portal-section-heading">
              <span className="eyebrow">Produtos contratados</span>
              <h2>Servicos ativos</h2>
            </div>
            <div className="portal-grid">
              {productServices.length ? (
                productServices.map((service) => (
                  <a className={`portal-card portal-product-card ${productClass(service.slug)}`} href={service.href} key={service.slug}>
                    <span className="portal-card-scrim" />
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
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
