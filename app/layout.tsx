import type { Metadata } from "next";
import { getThemeHtmlAttrs, getThemeStyles } from "@atlaskit/tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSR Tecnologia | Portal SaaS",
  description: "Portal SaaS multi-cliente para servicos de automacao e marketing."
};

const adsTheme = {
  colorMode: "light",
  light: "light",
  spacing: "spacing",
  shape: "shape"
} as const;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeAttrs = getThemeHtmlAttrs(adsTheme);
  const themeStyles = await getThemeStyles(adsTheme);

  return (
    <html lang="pt-BR" {...themeAttrs}>
      <head>
        {themeStyles.map((style) => (
          <style dangerouslySetInnerHTML={{ __html: style.css }} key={style.id} {...style.attrs} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
