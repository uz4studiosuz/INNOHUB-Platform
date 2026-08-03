"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBolt,
  IconBuildingBridge,
  IconChevronRight,
  IconCircuitResistor,
  IconCpu,
  IconHome2,
  IconPlaneTilt,
  IconRocket,
  IconX,
} from "@tabler/icons-react";
import { LANGUAGES, type Lang, useI18n } from "@/i18n";

const MODULE_LINKS = [
  { href: "/modules/glider", icon: IconPlaneTilt, key: "nav.glider", detail: "drawer.glider" },
  { href: "/modules/rockets", icon: IconRocket, key: "nav.rockets", detail: "drawer.rockets" },
  { href: "/modules/electronics", icon: IconCircuitResistor, key: "nav.electronics", detail: "drawer.electronics" },
  { href: "/modules/structures", icon: IconBuildingBridge, key: "nav.structures", detail: "drawer.structures" },
  { href: "/modules/hardware", icon: IconCpu, key: "nav.hardware", detail: "drawer.hardware" },
] as const;

export function ModuleDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={t("drawer.title")}>
      <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose} aria-label={t("common.close")} />
      <aside className="absolute inset-y-0 left-0 flex w-[min(390px,calc(100vw-24px))] flex-col border-r border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--line)] px-4">
          <Link href="/" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-bold tracking-wide text-white">IH</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-[0.08em] text-[var(--ink)]">INNOHUB</span>
              <span className="block truncate text-[11px] text-[var(--ink-muted)]">{t("drawer.subtitle")}</span>
            </span>
          </Link>
          <button ref={closeRef} type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]" aria-label={t("common.close")}>
            <IconX size={20} stroke={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{t("drawer.workspace")}</p>
          <Link href="/" onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${pathname === "/" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)]"><IconHome2 size={19} stroke={1.8} /></span>
            <span className="flex-1">{t("nav.dashboard")}</span>
            <IconChevronRight size={17} stroke={1.8} />
          </Link>

          <p className="mt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{t("drawer.modules")}</p>
          <nav className="space-y-1" aria-label={t("drawer.modules")}>
            {MODULE_LINKS.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink)] hover:bg-[var(--surface-muted)]"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${active ? "border-emerald-200 bg-white" : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] group-hover:text-[var(--accent)]"}`}>
                    <Icon size={19} stroke={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t(item.key)}</span>
                    <span className={`mt-0.5 block truncate text-[11px] ${active ? "text-emerald-700/70" : "text-[var(--ink-muted)]"}`}>{t(item.detail)}</span>
                  </span>
                  <IconChevronRight size={17} stroke={1.8} className="shrink-0" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-[var(--line)] p-4">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 text-xs font-medium text-[var(--ink)]">
            <IconBolt size={17} stroke={1.8} className="text-[var(--accent)]" />
            <span className="flex-1">{t("nav.engineOnline")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--ink-muted)]">{t("top.language")}</span>
            <div className="flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-0.5" role="group" aria-label={t("top.language")}>
              {LANGUAGES.map((language) => (
                <button key={language.code} type="button" onClick={() => setLang(language.code as Lang)} aria-pressed={lang === language.code} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${lang === language.code ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
                  {language.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
