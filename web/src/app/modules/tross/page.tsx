"use client";

import dynamic from "next/dynamic";
import { IconBuildingBridge } from "@tabler/icons-react";

const BridgeSimulator = dynamic(() => import("@/components/tross-builder/App"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--md-sys-color-surface-container)",
        color: "var(--md-sys-color-on-surface-variant)",
        gap: 12,
      }}
    >
      <IconBuildingBridge
        size={40}
        style={{ color: "var(--md-sys-color-primary)" }}
      />
      <p className="md-typescale-body-medium">
        3D Ko&apos;prik Qurilish Simulyatori yuklanmoqda...
      </p>
    </div>
  ),
});

export default function TrossModulePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 88px)",
        minHeight: 560,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--md-sys-color-surface-container-lowest)",
        border: "1px solid var(--md-sys-color-outline-variant)",
        boxShadow: "var(--md-sys-elevation-level1)",
      }}
    >
      {/* Module header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderBottom: "1px solid var(--md-sys-color-outline-variant)",
          background: "var(--md-sys-color-surface-container-low)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconBuildingBridge size={22} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="md-typescale-title-medium" style={{ margin: 0, color: "var(--md-sys-color-on-surface)" }}>
              3D Bridge Constructor &amp; FEA Simulator
            </h1>
            <span
              className="md-typescale-label-small"
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                background: "var(--md-sys-color-tertiary-container)",
                color: "var(--md-sys-color-on-tertiary-container)",
              }}
            >
              2D / 3D
            </span>
          </div>
          <p className="md-typescale-body-small" style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
            Ko&apos;prik loyihalang, kuch deformatsiyalarini hisoblang va yuklama sinovlarini o&apos;tkazing
          </p>
        </div>
      </div>

      {/* Simulator */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <BridgeSimulator />
      </div>
    </div>
  );
}
