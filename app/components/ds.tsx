import type { CSSProperties, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Circle, Info, Loader2 } from "lucide-react";
import { LogoutButton } from "@/app/components/LogoutButton";

export type NavItem = {
  href: string;
  label: string;
  active?: boolean;
  adminOnly?: boolean;
};

export function AppShell({
  title = "CSR Tecnologia",
  subtitle,
  navItems,
  children,
  aside,
  userIsAdmin = false
}: {
  title?: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
  aside?: ReactNode;
  userIsAdmin?: boolean;
}) {
  const visibleItems = navItems.filter((item) => !item.adminOnly || userIsAdmin);
  return (
    <main className="ds-shell">
      <aside className="ds-sidebar">
        <a className="ds-sidebar-brand" href="/portal" aria-label="Portal CSR Tecnologia">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </a>
        <nav className="ds-sidebar-nav" aria-label="Navegacao principal">
          {visibleItems.map((item) => (
            <a className={`ds-sidebar-link ${item.active ? "active" : ""}`} href={item.href} key={item.href}>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        {aside ? <div className="ds-sidebar-meta">{aside}</div> : null}
        <div className="ds-sidebar-footer">
          <LogoutButton />
        </div>
      </aside>
      <section className="ds-main">{children}</section>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="ds-page-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ds-page-actions">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral"
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className={`ds-metric-card ${tone}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function StatusBadge({
  status,
  children
}: {
  status: "success" | "warning" | "danger" | "neutral" | "info";
  children: ReactNode;
}) {
  const Icon = status === "success" ? CheckCircle2 : status === "danger" ? AlertCircle : status === "info" ? Info : Circle;
  return (
    <span className={`ds-status-badge ${status}`}>
      <Icon size={14} />
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="ds-empty-state">
      {icon ? <span className="ds-empty-icon">{icon}</span> : null}
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  );
}

export function LoadingState({ title = "Carregando" }: { title?: string }) {
  return (
    <div className="ds-empty-state">
      <Loader2 className="spin" size={24} />
      <strong>{title}</strong>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty
}: {
  columns: string[];
  rows: Array<{ id: string; cells: ReactNode[] }>;
  empty: ReactNode;
}) {
  return (
    <div className="ds-data-table" role="table" style={{ "--columns": columns.length } as CSSProperties}>
      <div className="ds-data-table-head" role="row">
        {columns.map((column) => (
          <span role="columnheader" key={column}>
            {column}
          </span>
        ))}
      </div>
      {rows.length ? (
        rows.map((row) => (
          <div className="ds-data-table-row" role="row" key={row.id}>
            {row.cells.map((cell, index) => (
              <span role="cell" key={`${row.id}-${index}`}>
                {cell}
              </span>
            ))}
          </div>
        ))
      ) : (
        empty
      )}
    </div>
  );
}
