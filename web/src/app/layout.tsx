import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { I18nProvider } from "@/i18n";
import { PlatformShell } from "@/components/shell/PlatformShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "INNOHUB Platform | STEM o'quv laboratoriyasi",
  description: "Dinamik fizika, parvoz va elektronika zanjirlari simulyatsiyasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang starts at the source language and the provider rewrites it once the
  // reader's stored choice is known, so the document never claims English for
  // an Uzbek page the way it used to.
  return (
    <html lang="uz" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body style={{ minHeight: "100%", display: "flex", margin: 0, backgroundColor: "var(--md-sys-color-background)", color: "var(--md-sys-color-on-background)" }}>
        <I18nProvider>
          <PlatformShell>{children}</PlatformShell>
        </I18nProvider>
      </body>
    </html>
  );
}
