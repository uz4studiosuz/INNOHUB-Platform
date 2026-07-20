import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STEM Interaktiv IDE — Whitebox Learning Clone",
  description: "Qadam-baqadam STEM loyihalarini loyihalash va tahlillash interaktiv platformasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#080b11] text-[#f8fafc] grid-bg">
        {children}
      </body>
    </html>
  );
}
