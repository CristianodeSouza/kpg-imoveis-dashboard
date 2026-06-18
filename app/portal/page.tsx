"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpenText, Building2, CreditCard, Instagram, LayoutDashboard, Loader2, Settings, Shield, Users } from "lucide-react";
import { AppShell, LoadingState, PageHeader, StatusBadge } from "@/app/components/ds";

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
  blog: BookOpenText,
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
  if (slug === "blog-automatizado") return "portal-product-blog";
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
    <AppShell
      subtitle="Portal SaaS"
      userIsAdmin={Boolean(data?.user.isPlatformAdmin)}
      navItems={[
        { href: "/portal", label: "Portal", active: true },
        { href: "/app/instagram", label: "Instagram Publisher" },
        { href: "/app/leads", label: "Mini CRM" },
        { href: "/app/blog", label: "Blog Automatizado" },
        { href: "/app/pagamentos", label: "Pagamentos" },
        { href: "/admin", label: "Admin", adminOnly: true }
      ]}
      aside={
        data ? (
          <>
            <span>Cliente: {data.tenant.name}</span>
            <StatusBadge status="success">Conta ativa</StatusBadge>
          </>
        ) : null
      }
    >
      <section className="v2-page v2-portal-page">
        <PageHeader
          eyebrow="Cliente conectado"
          title={data?.tenant.name || "Portal CSR Tecnologia"}
          description={data ? `Ola, ${data.user.name}. Acesse os servicos contratados para esta conta.` : "Carregando seus servicos contratados."}
          actions={
            <div className="portal-account-actions" aria-label="Acoes da conta">
              <a className="portal-account-link" href="/app/pagamentos">
                <CreditCard size={17} />
                <span>Pagamentos</span>
              </a>
              <a className="portal-settings-link" href={settingsService.href} aria-label="Configuracoes da conta">
                <Settings size={19} />
              </a>
            </div>
          }
        />
        <section className="portal-hero panel">
          <div>
            <span className="eyebrow">Conta SaaS</span>
            <h2>{data?.tenant.name || "Carregando"}</h2>
            <p>Produtos contratados, consumo da assinatura e configuracoes de integracao ficam centralizados nesta area.</p>
          </div>
          <div className="portal-quick-area">
            <div className="portal-account">
              <Building2 size={20} />
              <span>{data?.tenant.slug || "tenant"}</span>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="panel">
            <LoadingState title="Carregando portal" />
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
    </AppShell>
  );
}
