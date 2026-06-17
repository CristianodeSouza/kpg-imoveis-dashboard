"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { AppShell, DataTable, EmptyState, MetricCard, PageHeader, StatusBadge } from "@/app/components/ds";

type PaymentSummary = {
  tenantName: string;
  billingStatus: string;
  monthlyValueCents: number;
  cycleStart: string;
  cycleEnd: string;
  currentCyclePaid: boolean;
  paymentsCount: number;
  lastPaymentAt?: string | null;
};

type PaymentRecord = {
  id: string;
  description: string;
  amountCents: number;
  paidAt?: string | null;
  dueAt?: string | null;
  status: string;
  method: string;
  receiptUrl: string;
  notes: string;
  createdAt: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function billingLabel(status: string) {
  if (status === "active") return "Em dia";
  if (status === "trial") return "Teste";
  if (status === "overdue") return "Em atraso";
  if (status === "suspended") return "Suspenso";
  return status || "Pendente";
}

function paymentLabel(status: string) {
  if (status === "paid") return "Sucesso";
  if (status === "pending") return "Pendente";
  if (status === "failed") return "Falhou";
  if (status === "refunded") return "Estornado";
  return status || "Pendente";
}

export default function PagamentosPage() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPayments() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/pagamentos")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar pagamentos.");
      setSummary(data.summary);
      setPayments(data.payments || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <AppShell
      subtitle="Pagamentos"
      navItems={[
        { href: "/portal", label: "Portal" },
        { href: "/app/instagram", label: "Instagram Publisher" },
        { href: "/app/leads", label: "Mini CRM" },
        { href: "/app/pagamentos", label: "Pagamentos", active: true },
        { href: "/app/configuracoes", label: "Configuracoes" }
      ]}
      aside={summary ? <StatusBadge status={summary.currentCyclePaid ? "success" : "warning"}>{summary.currentCyclePaid ? "Ciclo pago" : "Ciclo pendente"}</StatusBadge> : null}
    >
      <section>
        <PageHeader
          eyebrow="Conta e assinatura"
          title="Pagamentos"
          description="Acompanhe status da assinatura, ciclo atual, comprovantes e historico financeiro do cliente."
          actions={
            <button className="btn secondary" disabled={loading} onClick={loadPayments} type="button">
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          }
        />
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <CreditCard size={22} />
              <h2>Resumo financeiro</h2>
            </div>
          </div>

          {message ? <div className="message error">{message}</div> : null}

          {summary ? (
            <>
              <div className="admin-summary-strip">
                <MetricCard label="Status atual" value={billingLabel(summary.billingStatus)} tone={summary.billingStatus === "active" ? "success" : "warning"} />
                <MetricCard label="Valor mensal" value={money(summary.monthlyValueCents)} />
                <MetricCard label="Renova em" value={new Date(summary.cycleEnd).toLocaleDateString("pt-BR")} />
                <MetricCard
                  label="Pagamento do ciclo"
                  value={summary.currentCyclePaid ? "Confirmado" : "Pendente"}
                  tone={summary.currentCyclePaid ? "success" : "warning"}
                />
              </div>

              <div className="payment-note">
                <ReceiptText size={18} />
                <span>
                  Historico financeiro da conta {summary.tenantName}. Pagamentos confirmados liberam o ciclo contratado ate a data de renovacao.
                </span>
              </div>
            </>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <ReceiptText size={22} />
              <h2>Historico de pagamentos</h2>
            </div>
          </div>

          <div className="payment-table">
            <DataTable
              columns={["Cliente/descricao", "Valor", "Pago em", "Status da cobranca", "Comprovante"]}
              rows={payments.map((payment) => ({
                id: payment.id,
                cells: [
                  <strong key="description">{payment.description || summary?.tenantName || "Pagamento"}</strong>,
                  money(payment.amountCents),
                  payment.paidAt ? new Date(payment.paidAt).toLocaleString("pt-BR") : "Pendente",
                  <StatusBadge key="status" status={payment.status === "paid" ? "success" : payment.status === "pending" ? "warning" : "danger"}>
                    {paymentLabel(payment.status)}
                  </StatusBadge>,
                  payment.receiptUrl ? (
                    <a href={payment.receiptUrl} rel="noreferrer" target="_blank" title="Abrir comprovante" key="receipt">
                      <ExternalLink size={17} />
                    </a>
                  ) : (
                    "Sem anexo"
                  )
                ]
              }))}
              empty={
                <EmptyState title="Nenhum pagamento registrado para este cliente.">
                  Quando a CSR registrar pagamentos, eles aparecerao aqui com status, data e comprovante.
                </EmptyState>
              }
            />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
