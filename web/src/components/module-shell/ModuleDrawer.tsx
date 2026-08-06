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
  { href: "/modules/glider",       icon: IconPlaneTilt,       key: "nav.glider",       detail: "drawer.glider" },
  { href: "/modules/rockets",      icon: IconRocket,           key: "nav.rockets",      detail: "drawer.rockets" },
  { href: "/modules/electronics",  icon: IconCircuitResistor,  key: "nav.electronics",  detail: "drawer.electronics" },
  { href: "/modules/structures",   icon: IconBuildingBridge,   key: "nav.structures",   detail: "drawer.structures" },
  { href: "/modules/hardware",     icon: IconCpu,              key: "nav.hardware",     detail: "drawer.hardware" },
] as const;

export function ModuleDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { lang, setLang, t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isHome = pathname === "/";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("drawer.title")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
      }}
    >
      {/* Scrim */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="md-scrim-in"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.32)",
          border: "none",
          cursor: "default",
          padding: 0,
        }}
      />

      {/* Drawer surface */}
      <aside
        className="md-enter-right"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "min(360px, calc(100vw - 24px))",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--md-sys-color-surface-container-low)",
          borderRadius: "0 16px 16px 0",
          boxShadow: "var(--md-sys-elevation-level3)",
          overflow: "hidden",
        }}
      >
        {/* ── Drawer header ─────────────────────────────────── */}
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 8px 0 16px",
            borderBottom: "1px solid var(--md-sys-color-outline-variant)",
          }}
        >
          <Link
            href="/"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flex: 1, minWidth: 0 }}
          >
            {/* Logo chip */}
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--md-sys-color-primary)",
                color: "var(--md-sys-color-on-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
            >
              IH
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                className="md-typescale-title-medium"
                style={{
                  display: "block",
                  color: "var(--md-sys-color-on-surface)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                INNOHUB
              </span>
              <span
                className="md-typescale-body-small"
                style={{
                  display: "block",
                  color: "var(--md-sys-color-on-surface-variant)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t("drawer.subtitle")}
              </span>
            </span>
          </Link>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="md-icon-btn"
            aria-label={t("common.close")}
          >
            <IconX size={20} stroke={1.8} />
          </button>
        </div>

        {/* ── Scrollable nav content ─────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>

          {/* Section: Workspace */}
          <p className="md-nav-drawer-label">{t("drawer.workspace")}</p>

          <Link
            href="/"
            onClick={onClose}
            className={`md-nav-drawer-item${isHome ? " active" : ""}`}
          >
            <IconHome2 size={20} stroke={1.8} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t("nav.dashboard")}</span>
            <IconChevronRight size={16} stroke={1.8} style={{ opacity: 0.5 }} />
          </Link>

          {/* Section: Modules */}
          <p className="md-nav-drawer-label" style={{ marginTop: 16 }}>{t("drawer.modules")}</p>

          <nav aria-label={t("drawer.modules")}>
            {MODULE_LINKS.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`md-nav-drawer-item${active ? " active" : ""}`}
                  style={{ marginBottom: 2, height: 64 }}
                >
                  <Icon size={20} stroke={1.8} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      className="md-typescale-label-large"
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t(item.key)}
                    </span>
                    <span
                      className="md-typescale-body-small"
                      style={{
                        display: "block",
                        color: active
                          ? "var(--md-sys-color-on-secondary-container)"
                          : "var(--md-sys-color-on-surface-variant)",
                        opacity: 0.8,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t(item.detail)}
                    </span>
                  </span>
                  <IconChevronRight size={16} stroke={1.8} style={{ opacity: 0.4, flexShrink: 0 }} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Drawer footer ─────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--md-sys-color-outline-variant)",
            padding: 16,
            background: "var(--md-sys-color-surface-container)",
          }}
        >
          {/* Engine status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 12,
              background: "var(--md-sys-color-surface-container-lowest)",
              border: "1px solid var(--md-sys-color-outline-variant)",
              marginBottom: 12,
            }}
          >
            <IconBolt size={18} stroke={2} style={{ color: "var(--md-sys-color-tertiary)", flexShrink: 0 }} />
            <span
              className="md-typescale-label-medium"
              style={{ flex: 1, color: "var(--md-sys-color-on-surface)" }}
            >
              {t("nav.engineOnline")}
            </span>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--md-sys-color-tertiary)",
                flexShrink: 0,
              }}
            />
          </div>

          {/* Language */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span
              className="md-typescale-label-medium"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              {t("top.language")}
            </span>
            <div
              className="md-segmented-buttons"
              role="group"
              aria-label={t("top.language")}
              style={{ height: 32 }}
            >
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => setLang(language.code as Lang)}
                  aria-pressed={lang === language.code}
                  className={`md-segmented-btn${lang === language.code ? " selected" : ""}`}
                  style={{ minWidth: 48, fontSize: 13 }}
                >
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
