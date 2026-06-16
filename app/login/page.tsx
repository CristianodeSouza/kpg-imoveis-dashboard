"use client";

import { FormEvent, useState } from "react";
import { Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("KPGIMOVEIS");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao entrar.");
      window.location.href = new URLSearchParams(window.location.search).get("next") || "/portal";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <strong>CSR Tecnologia</strong>
          <span>Portal SaaS</span>
        </div>
        <div className="login-icon">
          <Lock size={26} />
        </div>
        <h1>Acesse seu portal</h1>
        <p>Entre para acessar os servicos contratados pela sua empresa.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input
              autoComplete="username"
              className="input"
              id="username"
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              autoComplete="current-password"
              className="input"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          {error ? <div className="message error">{error}</div> : null}
          <button className="btn primary login-submit" disabled={loading} type="submit">
            <LogIn size={17} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
