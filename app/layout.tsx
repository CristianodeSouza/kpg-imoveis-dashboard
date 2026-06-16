import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPG Imoveis | Instagram Publisher",
  description: "Ferramenta interna para criar publicacoes imobiliarias no Instagram."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
