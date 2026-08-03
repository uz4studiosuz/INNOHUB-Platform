"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChartDots3,
  IconFileAnalytics,
  IconFlask,
  IconHome2,
  IconLanguage,
  IconMenu2,
  IconRulerMeasure,
  IconTools,
  IconTrophy,
} from "@tabler/icons-react";
import { useState } from "react";
import { ModuleDrawer } from "./ModuleDrawer";
import { LANGUAGES, type Lang, useI18n } from "@/i18n";

export type ModuleTab = { label?: string; labelKey?: string; segment: string };

export const DEFAULT_MODULE_TABS: ModuleTab[] = [
  { labelKey: "moduleTab.home", segment: "home" },
  { labelKey: "moduleTab.research", segment: "research" },
  { labelKey: "moduleTab.engineering", segment: "" },
  { labelKey: "moduleTab.competition", segment: "competition" },
  { labelKey: "moduleTab.outputs", segment: "outputs" },
  { labelKey: "moduleTab.buildTest", segment: "build-test" },
];

const TAB_ICONS: Record<string, typeof IconHome2> = {
  home: IconHome2,
  research: IconFlask,
  "": IconRulerMeasure,
  competition: IconTrophy,
  outputs: IconFileAnalytics,
  "build-test": IconTools,
};

export function ModuleNavbar({
  basePath,
  tabs = DEFAULT_MODULE_TABS,
  accent = "#126b55",
}: {
  basePath: string;
  tabs?: ModuleTab[];
  accent?: string;
}) {
  const { lang, setLang, t } = useI18n();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hrefFor = (segment: string) => segment ? `${basePath}/${segment}` : basePath;
  const isActive = (segment: string) => segment === "" ? pathname === basePath : pathname.startsWith(hrefFor(segment));

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 md:px-4" style={{ "--module-accent": accent } as React.CSSProperties}>
      <button type="button" onClick={() => setDrawerOpen(true)} aria-label={t("drawer.open")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
        <IconMenu2 size={19} stroke={1.8} />
      </button>

      <nav aria-label="Modul bosqichlari" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const TabIcon = TAB_ICONS[tab.segment] ?? IconChartDots3;
          const active = isActive(tab.segment);
          return (
            <Link
              key={tab.segment}
              href={hrefFor(tab.segment)}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition-[background,color,transform] active:scale-[0.98] ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <TabIcon size={17} stroke={1.8} />
              <span>{tab.labelKey ? t(tab.labelKey) : tab.label}</span>
              {active && <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-[var(--accent)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="hidden shrink-0 items-center gap-1 sm:flex" aria-label={t("top.language")}>
        <IconLanguage size={17} stroke={1.8} className="text-[var(--ink-muted)]" />
        {LANGUAGES.map((language) => (
          <button key={language.code} type="button" onClick={() => setLang(language.code as Lang)} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${lang === language.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"}`} aria-pressed={lang === language.code}>
            {language.label}
          </button>
        ))}
      </div>
      <ModuleDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
