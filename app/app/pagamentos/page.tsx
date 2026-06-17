"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2, ReceiptText, RefreshCw } from "lucide-react";

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
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>Pagamentos</span>
        </div>
        <nav className="tool-nav" aria-label="Ferramentas CSR">
          <a className="tool-link" href="/portal">
            Portal
          </a>
          <a className="tool-link" href="/app/instagram">
            Instagram Publisher
          </a>
          <a className="tool-link" href="/app/leads">
            Mini CRM
          </a>
          <a className="tool-link active" href="/app/pagamentos">
            Pagamentos
          </a>
          <a className="tool-link" href="/app/configuracoes">
            Configuracoes
          </a>
        </nav>
      </header>

      <section className="workspace">
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <CreditCard size={22} />
              <h2>Pagamentos e assinatura</h2>
            </div>
            <button className="btn secondary" disabled={loading} onClick={loadPayments} type="button">
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Atualizar
            </button>
          </div>

          {message ? <div className="message error">{message}</div> : null}

          {summary ? (
            <>
              <div className="admin-summary-strip">
                <div>
                  <span className="eyebrow">Status atual</span>
                  <strong>{billingLabel(summary.billingStatus)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Valor mensal</span>
                  <strong>{money(summary.monthlyValueCents)}</strong>
                </div>
                <div>
                  <span className="eyebrow">Ciclo atual</span>
                  <strong>{new Date(summary.cycleEnd).toLocaleDateString("pt-BR")}</strong>
                </div>
                <div>
                  <span className="eyebrow">Pagamento do ciclo</span>
                  <strong>{summary.currentCyclePaid ? "Confirmado" : "Pendente"}</strong>
                </div>
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
            <div className="payment-table-head">
              <span>Cliente/descricao</span>
              <span>Valor</span>
              <span>Pago em</span>
              <span>Status da cobranca</span>
              <span>Comprovante</span>
            </div>
            {payments.length ? (
              payments.map((payment) => (
                <div className="payment-table-row" key={payment.id}>
                  <strong>{payment.description || summary?.tenantName || "Pagamento"}</strong>
                  <span>{money(payment.amountCents)}</span>
                  <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleString("pt-BR") : "Pendente"}</span>
                  <span className={`payment-status ${payment.status}`}>{paymentLabel(payment.status)}</span>
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} rel="noreferrer" target="_blank" title="Abrir comprovante">
                      <ExternalLink size={17} />
                    </a>
                  ) : (
                    <span>Sem anexo</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state payment-empty">
                <strong>Nenhum pagamento registrado para este cliente.</strong>
                <span>Quando a CSR registrar pagamentos, eles aparecerao aqui com status, data e comprovante.</span>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
