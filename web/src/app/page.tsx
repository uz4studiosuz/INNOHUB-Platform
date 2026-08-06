"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconBolt,
  IconCircuitResistor,
  IconBuildingBridge,
  IconCpu,
  IconPlaneTilt,
  IconRobot,
  IconRocket,
} from "@tabler/icons-react";
import { useI18n } from "@/i18n";

const ICON_PROPS = { size: 24, stroke: 1.8 } as const;

/* Module accent colours — one per module (used for the icon container tint) */
const MODULE_ACCENT: Record<string, { bg: string; icon: string }> = {
  glider:      { bg: "#E8F1FF", icon: "#0061a4" },
  rockets:     { bg: "#FCEEED", icon: "#B3261E" },
  electronics: { bg: "#E8F5E9", icon: "#1B6B27" },
  structures:  { bg: "#FFF8E1", icon: "#7E5700" },
  hardware:    { bg: "#F3E8FD", icon: "#6750A4" },
};

const MODULES = [
  { id: "glider",       link: "/modules/glider",       icon: IconPlaneTilt       },
  { id: "rockets",      link: "/modules/rockets",       icon: IconRocket           },
  { id: "electronics",  link: "/modules/electronics",   icon: IconCircuitResistor  },
  { id: "structures",   link: "/modules/structures",    icon: IconBuildingBridge   },
  { id: "hardware",     link: "/modules/hardware",      icon: IconCpu              },
] as const;

export default function Home() {
  const { t } = useI18n();

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        padding: "8px 0",
      }}
    >
      {/* ── Hero banner card ──────────────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 320px",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--md-sys-color-outline-variant)",
          background: "var(--md-sys-color-surface-container-lowest)",
          boxShadow: "var(--md-sys-elevation-level1)",
        }}
        className="hero-grid"
      >
        {/* Left: hero text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 48px 48px",
            minHeight: 280,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              width: "fit-content",
              marginBottom: 20,
              padding: "6px 14px",
              borderRadius: 8,
              background: "var(--md-sys-color-primary-container)",
              color: "var(--md-sys-color-on-primary-container)",
            }}
          >
            <IconBolt size={16} stroke={2} />
            <span className="md-typescale-label-medium">INNOHUB Platform</span>
          </div>

          <h1
            className="md-typescale-headline-large"
            style={{
              margin: 0,
              color: "var(--md-sys-color-on-surface)",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {t("dash.title")}
          </h1>
          <p
            className="md-typescale-body-large"
            style={{
              marginTop: 16,
              color: "var(--md-sys-color-on-surface-variant)",
              maxWidth: "60ch",
            }}
          >
            {t("dash.intro")}
          </p>
        </div>

        {/* Right: status panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 32,
            background: "var(--md-sys-color-surface-container-high)",
            borderLeft: "1px solid var(--md-sys-color-outline-variant)",
          }}
        >
          {/* Engine info */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p
                className="md-typescale-label-medium"
                style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {t("dash.engineLabel")}
              </p>
              <p
                className="md-typescale-title-medium"
                style={{ margin: "8px 0 0", color: "var(--md-sys-color-on-surface)" }}
              >
                {t("dash.engineName")}
              </p>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--md-sys-color-tertiary-container)",
                color: "var(--md-sys-color-on-tertiary-container)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconRobot size={26} stroke={1.8} />
            </div>
          </div>

          {/* Status row */}
          <div style={{ borderTop: "1px solid var(--md-sys-color-outline-variant)", paddingTop: 20, marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="md-typescale-body-medium" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                {t("dash.platformStatus")}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "var(--md-sys-color-primary-container)",
                  color: "var(--md-sys-color-on-primary-container)",
                }}
                className="md-typescale-label-medium"
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--md-sys-color-primary)" }} />
                {t("dash.active")}
              </span>
            </div>
            <p className="md-typescale-body-small" style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
              {t("dash.engineStatus", { n: MODULES.length })}
            </p>
          </div>
        </div>
      </section>

      {/* ── Module grid ──────────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <h2
            className="md-typescale-headline-small"
            style={{ margin: 0, color: "var(--md-sys-color-on-surface)", fontWeight: 600 }}
          >
            {t("dash.modulesHeading")}
          </h2>
          <p
            className="md-typescale-body-medium"
            style={{ margin: "6px 0 0", color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {t("dash.modulesHint")}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {MODULES.map((module) => {
            const ModuleIcon = module.icon;
            const accent = MODULE_ACCENT[module.id] ?? { bg: "var(--md-sys-color-primary-container)", icon: "var(--md-sys-color-primary)" };
            return (
              <Link
                key={module.id}
                href={module.link}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 16,
                  border: "1px solid var(--md-sys-color-outline-variant)",
                  background: "var(--md-sys-color-surface-container-lowest)",
                  padding: 24,
                  minHeight: 200,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "box-shadow 200ms ease, transform 200ms ease",
                }}
                className="module-card"
              >
                {/* Icon + tag row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: accent.bg,
                      color: accent.icon,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ModuleIcon {...ICON_PROPS} />
                  </div>
                  <span
                    className="md-typescale-label-small"
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--md-sys-color-outline-variant)",
                      color: "var(--md-sys-color-on-surface-variant)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t(`mod.${module.id}.tag`)}
                  </span>
                </div>

                {/* Text */}
                <div style={{ marginTop: "auto", paddingTop: 28 }}>
                  <h3
                    className="md-typescale-title-medium"
                    style={{ margin: 0, color: "var(--md-sys-color-on-surface)" }}
                  >
                    {t(`mod.${module.id}.title`)}
                  </h3>
                  <p
                    className="md-typescale-body-small"
                    style={{
                      margin: "8px 0 0",
                      color: "var(--md-sys-color-on-surface-variant)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {t(`mod.${module.id}.desc`)}
                  </p>

                  {/* Footer */}
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: "1px solid var(--md-sys-color-outline-variant)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      className="md-typescale-label-large"
                      style={{ color: "var(--md-sys-color-primary)" }}
                    >
                      {t("dash.start")}
                    </span>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--md-sys-color-primary-container)",
                        color: "var(--md-sys-color-on-primary-container)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconArrowUpRight size={16} stroke={2} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Card hover style */}
      <style>{`
        .module-card:hover {
          box-shadow: var(--md-sys-elevation-level2);
          transform: translateY(-2px);
        }
        .module-card:active {
          transform: translateY(0);
          box-shadow: var(--md-sys-elevation-level0);
        }
        @media (max-width: 700px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
