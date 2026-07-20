import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "INNOHUB Platform — STEM Engineering Simulyatsiya Platformasi",
  description: "Dinamik fizika, parvoz va elektronika zanjirlari simulyatsiyasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex bg-[#080b11] text-[#f8fafc] grid-bg">
        {/* Layout wrapper */}
        <div className="flex flex-1 w-full min-h-screen">
          
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-72 glass-panel border-r border-[rgba(255,255,255,0.06)] bg-[#0c101b]">
            {/* Sidebar Header */}
            <div className="h-16 flex items-center px-6 border-b border-[rgba(255,255,255,0.06)] gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                IH
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  INNOHUB
                </span>
                <span className="text-[10px] block text-blue-500 font-bold tracking-widest uppercase">
                  Platform
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
              <div className="text-[10px] font-bold text-gray-500 px-3 mb-2 tracking-wider uppercase">
                Asosiy
              </div>
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                ⚡ Dashboard
              </Link>
              <Link href="/editor2d" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                📐 2D Sxema Muharriri
              </Link>
              <Link href="/viewer3d" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                📦 3D Ko&apos;rish
              </Link>

              <div className="text-[10px] font-bold text-gray-500 px-3 mt-6 mb-2 tracking-wider uppercase">
                Simulyatsiyalar
              </div>
              <Link href="/modules/glider" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                ✈️ Planyor (Glider)
              </Link>
              <Link href="/modules/rockets" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                🚀 Raketalar (Rockets)
              </Link>
              <Link href="/modules/electronics" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                🔌 Elektronika (Breadboard)
              </Link>
              <Link href="/modules/structures" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white transition-all text-sm font-medium">
                🏗️ Tuzilmalar (Structures)
              </Link>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#090c14]">
              <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-xs font-semibold text-white">Engine Online</div>
                  <div className="text-[9px] text-gray-500 font-mono">289/289 Tests Passed</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            {/* Topbar */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#080b11]/80 backdrop-blur-md sticky top-0 z-50">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button placeholder if needed */}
                <span className="text-sm font-semibold text-gray-400">Workspace / Project Alpha</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                  <span>Python Integration Enabled</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-800 flex items-center justify-center font-bold text-xs text-white border border-[rgba(255,255,255,0.1)]">
                  U
                </div>
              </div>
            </header>

            {/* Page main content */}
            <main className="flex-1 overflow-y-auto bg-[#080b11] p-6">
              {children}
            </main>
          </div>
          
        </div>
      </body>
    </html>
  );
}
