"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBolt,
  IconCircuitResistor,
  IconBuildingBridge,
  IconChevronRight,
  IconCpu,
  IconHome,
  IconPlaneTilt,
  IconRocket,
} from "@tabler/icons-react";
import { useI18n, LANGUAGES, type Lang } from "@/i18n";

const ICON = { size: 19, stroke: 1.8 } as const;

const NAV = [
  { href: "/modules/glider", icon: IconPlaneTilt, key: "nav.glider" },
  { href: "/modules/rockets", icon: IconRocket, key: "nav.rockets" },
  { href: "/modules/electronics", icon: IconCircuitResistor, key: "nav.electronics" },
  { href: "/modules/structures", icon: IconBuildingBridge, key: "nav.structures" },
  { href: "/modules/hardware", icon: IconCpu, key: "nav.hardware" },
] as const;

const LINK_BASE = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
const LINK_IDLE = "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]";
const LINK_ACTIVE = "bg-[var(--accent-soft)] text-[var(--accent)]";

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0.5" role="group" aria-label={t("top.language")}>
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setLang(language.code as Lang)}
          aria-pressed={lang === language.code}
          title={language.name}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            lang === language.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const current = NAV.find((item) => isActive(item.href));

  return (
    <div className="flex min-h-[100dvh] w-full bg-[var(--canvas)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] md:flex">
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-[var(--line)] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">IH</div>
          <div className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.08em] text-[var(--ink)]">INNOHUB</span>
            <span className="block text-[10px] font-medium text-[var(--ink-muted)]">Learning platform</span>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
          <p className="mb-1 px-3 text-xs font-medium text-[var(--ink-muted)]">{t("nav.main")}</p>
          <Link href="/" className={`${LINK_BASE} ${isActive("/") ? LINK_ACTIVE : LINK_IDLE}`}>
            <IconHome {...ICON} />
            {t("nav.dashboard")}
          </Link>
          <p className="mb-1 mt-6 px-3 text-xs font-medium text-[var(--ink-muted)]">{t("nav.simulations")}</p>
          {NAV.map((item) => {
            const NavIcon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`${LINK_BASE} ${isActive(item.href) ? LINK_ACTIVE : LINK_IDLE}`}>
                <NavIcon {...ICON} />
                <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                {isActive(item.href) && <IconChevronRight size={15} stroke={1.8} />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--line)] p-4">
          <div className="rounded-xl bg-[var(--surface-muted)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
              <IconBolt size={17} stroke={1.8} className="text-[var(--accent)]" />
              {t("nav.engineOnline")}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[var(--ink-muted)]">{t("nav.moduleCount", { n: NAV.length })}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[rgba(255,255,255,0.94)] px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--ink-muted)]">
            <span className="truncate">{t("top.workspace")}</span>
            {current && <><span>/</span><span className="truncate font-medium text-[var(--ink)]">{t(current.key)}</span></>}
          </div>
          <LanguageSwitcher />
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2 md:hidden">
          <Link href="/" aria-label={t("nav.dashboard")} className={`shrink-0 rounded-lg p-2 ${isActive("/") ? LINK_ACTIVE : LINK_IDLE}`}><IconHome {...ICON} /></Link>
          {NAV.map((item) => {
            const NavIcon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${isActive(item.href) ? LINK_ACTIVE : LINK_IDLE}`}>
                <NavIcon size={17} stroke={1.8} />{t(item.key)}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
