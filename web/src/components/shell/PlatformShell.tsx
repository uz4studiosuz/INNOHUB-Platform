"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, LANGUAGES, type Lang } from "@/i18n";

/**
 * The sidebar and top bar that wrap every route. It is a client component
 * because the labels come from t() and the active item comes from the current
 * path - both of which need the browser.
 */

const NAV = [
  { href: "/modules/glider", icon: "✈️", key: "nav.glider" },
  { href: "/modules/rockets", icon: "🚀", key: "nav.rockets" },
  { href: "/modules/electronics", icon: "🔌", key: "nav.electronics" },
  { href: "/modules/structures", icon: "🏗️", key: "nav.structures" },
  { href: "/modules/hardware", icon: "🧩", key: "nav.hardware" },
] as const;

const LINK_BASE =
  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium";
const LINK_IDLE = "hover:bg-[rgba(255,255,255,0.04)] text-gray-300 hover:text-white";
const LINK_ACTIVE = "bg-blue-500/10 text-white border border-blue-500/20";

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      className="flex items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-0.5"
      role="group"
      aria-label={t("top.language")}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code as Lang)}
          aria-pressed={lang === l.code}
          title={l.name}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors ${
            lang === l.code
              ? "bg-blue-500/20 text-blue-300"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  // A module stays highlighted while you are anywhere inside it - on its
  // research or competition sub-pages too, not only its landing page.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const current = NAV.find((n) => isActive(n.href));

  return (
    <div className="flex flex-1 w-full min-h-screen">
      <aside className="hidden md:flex flex-col w-72 glass-panel border-r border-[rgba(255,255,255,0.06)] bg-[#0c101b]">
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

        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-500 px-3 mb-2 tracking-wider uppercase">
            {t("nav.main")}
          </div>
          <Link href="/" className={`${LINK_BASE} ${isActive("/") ? LINK_ACTIVE : LINK_IDLE}`}>
            ⚡ {t("nav.dashboard")}
          </Link>

          <div className="text-[10px] font-bold text-gray-500 px-3 mt-6 mb-2 tracking-wider uppercase">
            {t("nav.simulations")}
          </div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${LINK_BASE} ${isActive(item.href) ? LINK_ACTIVE : LINK_IDLE}`}
            >
              {item.icon} {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#090c14]">
          <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-xs font-semibold text-white">{t("nav.engineOnline")}</div>
              {/* A hardcoded pass count used to sit here and had already gone
                  stale. The module count is derived, so it cannot. */}
              <div className="text-[9px] text-gray-500 font-mono">
                {t("nav.moduleCount", { n: NAV.length })}
              </div>
              <div className="text-[9px] text-gray-600 font-mono">{t("nav.engineSplit")}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#080b11]/80 backdrop-blur-md sticky top-0 z-50">
          {/* Says where you actually are, rather than the placeholder project
              name that used to sit here regardless of the route. */}
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 min-w-0">
            <span className="truncate">{t("top.workspace")}</span>
            {current && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-200 truncate">{t(current.key)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
              <span>{t("top.engineActive")}</span>
            </div>
          </div>
        </header>

        {/* Mobile navigation: the sidebar is hidden under md, which left small
            screens with no way to reach any module at all. */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[#0c101b] custom-scrollbar">
          <Link
            href="/"
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isActive("/") ? "bg-blue-500/15 text-blue-300" : "text-gray-400"
            }`}
          >
            ⚡
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive(item.href) ? "bg-blue-500/15 text-blue-300" : "text-gray-400"
              }`}
            >
              {item.icon} {t(item.key)}
            </Link>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto bg-[#080b11] p-6">{children}</main>
      </div>
    </div>
  );
}
