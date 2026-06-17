"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, CheckCircle2, Instagram, KeyRound, Loader2, RefreshCw, Save } from "lucide-react";

type PublicSettings = {
  companyName: string;
  sigaEndpoint: string;
  sigaTokenConfigured: boolean;
  metaAppId: string;
  metaAppSecretConfigured: boolean;
  instagramAccountId: string;
  instagramAccessTokenConfigured: boolean;
  whatsappNumber: string;
  updatedAt?: string;
};

type AccountData = {
  name: string;
  legalName: string;
  document: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressComplement: string;
  addressCity: string;
  addressState: string;
};

type FormState = {
  companyName: string;
  legalName: string;
  document: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressComplement: string;
  addressCity: string;
  addressState: string;
  sigaEndpoint: string;
  sigaToken: string;
  metaAppId: string;
  metaAppSecret: string;
  instagramAccountId: string;
  instagramAccessToken: string;
  whatsappNumber: string;
};

const emptyForm: FormState = {
  companyName: "",
  legalName: "",
  document: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  addressZip: "",
  addressStreet: "",
  addressNumber: "",
  addressDistrict: "",
  addressComplement: "",
  addressCity: "",
  addressState: "",
  sigaEndpoint: "",
  sigaToken: "",
  metaAppId: "",
  metaAppSecret: "",
  instagramAccountId: "",
  instagramAccessToken: "",
  whatsappNumber: ""
};

function configuredLabel(configured: boolean) {
  return configured ? "Configurado" : "Pendente";
}

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function fillForm(nextSettings: PublicSettings, nextAccount?: AccountData | null) {
    setForm({
      companyName: nextSettings.companyName || "",
      legalName: nextAccount?.legalName || "",
      document: nextAccount?.document || "",
      contactName: nextAccount?.contactName || "",
      contactEmail: nextAccount?.contactEmail || "",
      contactPhone: nextAccount?.contactPhone || nextSettings.whatsappNumber || "",
      addressZip: nextAccount?.addressZip || "",
      addressStreet: nextAccount?.addressStreet || "",
      addressNumber: nextAccount?.addressNumber || "",
      addressDistrict: nextAccount?.addressDistrict || "",
      addressComplement: nextAccount?.addressComplement || "",
      addressCity: nextAccount?.addressCity || "",
      addressState: nextAccount?.addressState || "",
      sigaEndpoint: nextSettings.sigaEndpoint || "",
      sigaToken: "",
      metaAppId: nextSettings.metaAppId || "",
      metaAppSecret: "",
      instagramAccountId: nextSettings.instagramAccountId || "",
      instagramAccessToken: "",
      whatsappNumber: nextSettings.whatsappNumber || ""
    });
  }

  async function loadSettings() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/configuracoes", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/configuracoes")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel carregar configuracoes.");
      setSettings(data.settings);
      setAccount(data.account || null);
      fillForm(data.settings, data.account);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar configuracoes." });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/app/configuracoes")}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar configuracoes.");
      setSettings(data.settings);
      setAccount(data.account || null);
      fillForm(data.settings, data.account);
      setMessage({ type: "ok", text: "Configuracoes salvas para este cliente." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar configuracoes." });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const instagramStatus = new URLSearchParams(window.location.search).get("instagram");
    if (instagramStatus === "connected") {
      setMessage({ type: "ok", text: "Instagram conectado com sucesso pela tela oficial da Meta." });
      window.history.replaceState(null, "", "/app/configuracoes");
    } else if (instagramStatus === "missing_meta_app") {
      setMessage({ type: "error", text: "Configure o Meta App ID e Secret antes de conectar pelo login oficial." });
      window.history.replaceState(null, "", "/app/configuracoes");
    } else if (instagramStatus?.startsWith("error:")) {
      setMessage({ type: "error", text: decodeURIComponent(instagramStatus.replace("error:", "")) });
      window.history.replaceState(null, "", "/app/configuracoes");
    }
    loadSettings();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>CSR Tecnologia</strong>
          <span>{settings?.companyName || "Configuracoes"}</span>
        </div>
        <nav className="tool-nav" aria-label="Ferramentas">
          <a className="tool-link" href="/portal">
            Portal
          </a>
          <a className="tool-link" href="/app/instagram">
            Instagram Publisher
          </a>
          <a className="tool-link" href="/app/leads">
            Mini CRM
          </a>
          <a className="tool-link" href="/app/pagamentos">
            Pagamentos
          </a>
          <a className="tool-link active" href="/app/configuracoes">
            Configuracoes
          </a>
        </nav>
      </header>

      <section className="workspace">
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-title">
              <KeyRound size={22} />
              <h2>Configuracoes do Cliente</h2>
            </div>
            <button className="btn secondary" disabled={loading} onClick={loadSettings}>
              {loading ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
              Recarregar
            </button>
          </div>

          <div className="config-status-grid">
            <div className="metric">
              <span>CRM SIGA</span>
              <strong>{configuredLabel(Boolean(settings?.sigaEndpoint && settings?.sigaTokenConfigured))}</strong>
            </div>
            <div className="metric">
              <span>Meta App</span>
              <strong>{configuredLabel(Boolean(settings?.metaAppId && settings?.metaAppSecretConfigured))}</strong>
            </div>
            <div className="metric">
              <span>Instagram</span>
              <strong>{configuredLabel(Boolean(settings?.instagramAccountId && settings?.instagramAccessTokenConfigured))}</strong>
            </div>
            <div className="metric">
              <span>WhatsApp CTA</span>
              <strong>{settings?.whatsappNumber || "Pendente"}</strong>
            </div>
          </div>

          {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}

          <form className="settings-form" onSubmit={saveSettings}>
            <section className="settings-section">
              <div className="settings-section-title">
                <Building2 size={20} />
                <div>
                  <h3>Dados da conta e faturamento</h3>
                  <span>Identificacao do cliente usada para contrato, cobranca e suporte.</span>
                </div>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="legalName">Razao social</label>
                  <input
                    className="input"
                    id="legalName"
                    onChange={(event) => updateField("legalName", event.target.value)}
                    placeholder="Razao social ou nome completo"
                    value={form.legalName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="document">CPF/CNPJ</label>
                  <input
                    className="input"
                    id="document"
                    onChange={(event) => updateField("document", event.target.value)}
                    placeholder="00.000.000/0000-00"
                    value={form.document}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contactName">Responsavel</label>
                  <input
                    className="input"
                    id="contactName"
                    onChange={(event) => updateField("contactName", event.target.value)}
                    placeholder="Nome do responsavel"
                    value={form.contactName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contactEmail">E-mail</label>
                  <input
                    className="input"
                    id="contactEmail"
                    onChange={(event) => updateField("contactEmail", event.target.value)}
                    placeholder="financeiro@empresa.com.br"
                    type="email"
                    value={form.contactEmail}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contactPhone">WhatsApp / telefone</label>
                  <input
                    className="input"
                    id="contactPhone"
                    onChange={(event) => updateField("contactPhone", event.target.value)}
                    placeholder="Ex: 5554999999999"
                    value={form.contactPhone}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressZip">CEP</label>
                  <input
                    className="input"
                    id="addressZip"
                    onChange={(event) => updateField("addressZip", event.target.value)}
                    placeholder="00000-000"
                    value={form.addressZip}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressStreet">Logradouro</label>
                  <input
                    className="input"
                    id="addressStreet"
                    onChange={(event) => updateField("addressStreet", event.target.value)}
                    placeholder="Rua, avenida..."
                    value={form.addressStreet}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressNumber">Numero</label>
                  <input
                    className="input"
                    id="addressNumber"
                    onChange={(event) => updateField("addressNumber", event.target.value)}
                    placeholder="72"
                    value={form.addressNumber}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressDistrict">Bairro</label>
                  <input
                    className="input"
                    id="addressDistrict"
                    onChange={(event) => updateField("addressDistrict", event.target.value)}
                    placeholder="Bairro"
                    value={form.addressDistrict}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressComplement">Complemento</label>
                  <input
                    className="input"
                    id="addressComplement"
                    onChange={(event) => updateField("addressComplement", event.target.value)}
                    placeholder="Sala, casa, andar..."
                    value={form.addressComplement}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressCity">Cidade</label>
                  <input
                    className="input"
                    id="addressCity"
                    onChange={(event) => updateField("addressCity", event.target.value)}
                    placeholder="Cidade"
                    value={form.addressCity}
                  />
                </div>
                <div className="field">
                  <label htmlFor="addressState">UF</label>
                  <input
                    className="input"
                    id="addressState"
                    maxLength={2}
                    onChange={(event) => updateField("addressState", event.target.value.toUpperCase())}
                    placeholder="RS"
                    value={form.addressState}
                  />
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-title">
                <Building2 size={20} />
                <div>
                  <h3>Cliente e CRM SIGA</h3>
                  <span>Dados usados para buscar imoveis e alimentar as automacoes.</span>
                </div>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="companyName">Nome da imobiliaria <span className="required-mark">*</span></label>
                  <input
                    className="input"
                    id="companyName"
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="Ex: KPG Imoveis"
                    required
                    value={form.companyName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="whatsappNumber">WhatsApp principal</label>
                  <input
                    className="input"
                    id="whatsappNumber"
                    onChange={(event) => updateField("whatsappNumber", event.target.value)}
                    placeholder="Ex: 5554999999999"
                    value={form.whatsappNumber}
                  />
                </div>
                <div className="field wide">
                  <label htmlFor="sigaEndpoint">Endpoint da API SIGA <span className="required-mark">*</span></label>
                  <input
                    className="input"
                    id="sigaEndpoint"
                    onChange={(event) => updateField("sigaEndpoint", event.target.value)}
                    placeholder="https://..."
                    required
                    value={form.sigaEndpoint}
                  />
                </div>
                <div className="field wide secret-field">
                  <label htmlFor="sigaToken">Token da API SIGA <span className="required-mark">*</span></label>
                  <input
                    autoComplete="off"
                    className="input"
                    id="sigaToken"
                    onChange={(event) => updateField("sigaToken", event.target.value)}
                    placeholder={settings?.sigaTokenConfigured ? "Token ja configurado. Preencha apenas para trocar." : "Cole o token do CRM SIGA"}
                    required={!settings?.sigaTokenConfigured}
                    type="password"
                    value={form.sigaToken}
                  />
                  {settings?.sigaTokenConfigured ? (
                    <span className="secret-status">
                      <CheckCircle2 size={15} />
                      Token salvo
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-title">
                <Instagram size={20} />
                <div>
                  <h3>Meta e Instagram</h3>
                  <span>Conecte pelo login oficial da Meta ou mantenha o token manual atual.</span>
                </div>
              </div>
              <div className="oauth-connect-box">
                <div>
                  <strong>{settings?.instagramAccessTokenConfigured ? "Instagram conectado" : "Conectar Instagram pelo login oficial"}</strong>
                  <span>
                    O cliente entra na tela oficial da Meta/Instagram, autoriza o aplicativo e o SaaS salva o token automaticamente.
                  </span>
                </div>
                <a className="btn success" href="/api/integrations/instagram/start">
                  <Instagram size={17} />
                  {settings?.instagramAccessTokenConfigured ? "Reconectar Instagram" : "Conectar Instagram"}
                </a>
              </div>
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="metaAppId">Meta App ID</label>
                  <input
                    className="input"
                    id="metaAppId"
                    onChange={(event) => updateField("metaAppId", event.target.value)}
                    placeholder="App ID"
                    value={form.metaAppId}
                  />
                </div>
                <div className="field secret-field">
                  <label htmlFor="metaAppSecret">Meta App Secret</label>
                  <input
                    autoComplete="off"
                    className="input"
                    id="metaAppSecret"
                    onChange={(event) => updateField("metaAppSecret", event.target.value)}
                    placeholder={settings?.metaAppSecretConfigured ? "Secret ja configurado. Preencha apenas para trocar." : "App Secret"}
                    type="password"
                    value={form.metaAppSecret}
                  />
                  {settings?.metaAppSecretConfigured ? (
                    <span className="secret-status">
                      <CheckCircle2 size={15} />
                      Secret salvo
                    </span>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="instagramAccountId">Instagram Account ID <span className="required-mark">*</span></label>
                  <input
                    className="input"
                    id="instagramAccountId"
                    onChange={(event) => updateField("instagramAccountId", event.target.value)}
                    placeholder="ID da conta profissional"
                    required
                    value={form.instagramAccountId}
                  />
                </div>
                <div className="field secret-field">
                  <label htmlFor="instagramAccessToken">Instagram Access Token <span className="required-mark">*</span></label>
                  <input
                    autoComplete="off"
                    className="input"
                    id="instagramAccessToken"
                    onChange={(event) => updateField("instagramAccessToken", event.target.value)}
                    placeholder={
                      settings?.instagramAccessTokenConfigured
                        ? "Token ja configurado. Preencha apenas para trocar."
                        : "Token de acesso com permissoes da Graph API"
                    }
                    required={!settings?.instagramAccessTokenConfigured}
                    type="password"
                    value={form.instagramAccessToken}
                  />
                  {settings?.instagramAccessTokenConfigured ? (
                    <span className="secret-status">
                      <CheckCircle2 size={15} />
                      Token salvo
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="actions">
              <span className="step-caption">
                Campos secretos ficam armazenados no servidor e nao retornam em texto aberto para a tela.
              </span>
              <button className="btn success" disabled={saving || loading} type="submit">
                {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                Salvar configuracoes
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
