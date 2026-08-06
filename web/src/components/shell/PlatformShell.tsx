"use client";

import { usePathname } from "next/navigation";
import { IconMenu2 } from "@tabler/icons-react";
import { useState } from "react";
import { useI18n, LANGUAGES, type Lang } from "@/i18n";
import { ModuleDrawer } from "@/components/module-shell/ModuleDrawer";

const ICON = { size: 20, stroke: 1.8 } as const;
const NAV = ["glider", "rockets", "electronics", "structures", "hardware"] as const;

function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      className="md-segmented-buttons"
      role="group"
      aria-label={t("top.language")}
      style={{ height: 36 }}
    >
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => setLang(language.code as Lang)}
          aria-pressed={lang === language.code}
          title={language.name}
          className={`md-segmented-btn${lang === language.code ? " selected" : ""}`}
          style={{ minWidth: 44 }}
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

  // Module routes render their own tab row and manage scrolling themselves;
  // everything else gets the shell's standard padded, scrolling canvas.
  const isModuleRoute = Boolean(current);

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-on-background">
      {/* ── MD3 Top App Bar ─────────────────────────────────── */}
      <header className="md-top-app-bar" style={{ gap: 4, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          {/* Navigation icon button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md-icon-btn"
            aria-label={t("drawer.open")}
          >
            <IconMenu2 {...ICON} />
          </button>

          {/* Title */}
          <div style={{ minWidth: 0, paddingLeft: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="md-typescale-title-large"
                style={{ color: "var(--md-sys-color-on-surface)", lineHeight: 1 }}
              >
                INNOHUB
              </span>
            </div>
            <span
              className="md-typescale-body-small"
              style={{ color: "var(--md-sys-color-on-surface-variant)", display: "block", marginTop: 2 }}
            >
              {current ? t(`nav.${current}`) : t("top.workspace")}
            </span>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <main
        className={
          isModuleRoute
            ? "flex min-h-0 flex-1 flex-col"
            : "flex-1 overflow-y-auto px-4 py-6"
        }
      >
        {children}
      </main>

      <ModuleDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
