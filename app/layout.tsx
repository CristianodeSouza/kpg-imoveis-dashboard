import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSR Tecnologia | Portal SaaS",
  description: "Portal SaaS multi-cliente para servicos de automacao e marketing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
