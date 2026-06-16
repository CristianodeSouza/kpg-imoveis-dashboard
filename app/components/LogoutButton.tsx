"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button className="btn secondary" onClick={logout} type="button">
      <LogOut size={17} />
      Sair
    </button>
  );
}
