"use client";

import { usePathname } from "next/navigation";
import {
  IconMenu2,
} from "@tabler/icons-react";
import { useState } from "react";
import { useI18n, LANGUAGES, type Lang } from "@/i18n";
import { ModuleDrawer } from "@/components/module-shell/ModuleDrawer";

const ICON = { size: 19, stroke: 1.8 } as const;

const NAV = ["glider", "rockets", "electronics", "structures", "hardware"] as const;

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = NAV.find((module) => pathname.startsWith(`/modules/${module}`));

  return (
    <div className="flex min-h-[100dvh] w-full bg-[var(--canvas)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[rgba(255,255,255,0.94)] px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white" aria-label={t("drawer.open")}>
              <IconMenu2 {...ICON} />
            </button>
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-[0.06em] text-[var(--ink)]">INNOHUB</span>
              <span className="block truncate text-[11px] text-[var(--ink-muted)]">{current ? t(`nav.${current}`) : t("top.workspace")}</span>
            </div>
          </div>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <ModuleDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
