"use client";

import { useGliderStore } from "../../store/gliderStore";
import { SPEC_LIMITS } from "../../lib/physics/gliderPhysics";
import { IconArrowsUp, IconAxisX, IconAxisY, IconFeather, IconScale, IconWind } from "@tabler/icons-react";

interface MetricBarProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  isGood: boolean;
}

function MetricBar({ label, value, unit, min, max, isGood }: MetricBarProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-geist-mono), monospace",
          color: isGood ? "#16a34a" : "#dc2626",
        }}>
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <div style={{
        height: 8,
        background: "#d1d5db",
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: isGood ? "#22c55e" : "#ef4444",
          borderRadius: 4,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 9, color: "#9ca3af" }}>{min} {unit}</span>
        <span style={{ fontSize: 9, color: "#9ca3af" }}>{max} {unit}</span>
      </div>
    </div>
  );
}

export function AnalysisView({ mode }: { mode: string }) {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    top: 8,
    left: 8,
    width: 300,
    background: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 16,
    zIndex: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    maxHeight: "calc(100% - 16px)",
    overflowY: "auto",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 800,
    color: "#1e293b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "2px solid #2563eb",
    paddingBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 7,
  };

  switch (mode) {
    case "weight":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconScale size={18} stroke={1.8} /> Weight Analysis</div>
          <MetricBar
            label="Total Mass"
            value={metrics.mass}
            unit="g"
            min={SPEC_LIMITS.mass.min}
            max={SPEC_LIMITS.mass.max}
            isGood={metrics.mass >= SPEC_LIMITS.mass.min && metrics.mass <= SPEC_LIMITS.mass.max}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            <strong>Wing Area:</strong> {metrics.wingArea.toFixed(0)} mm²<br />
            <strong>H-Stab Area:</strong> {metrics.hStabArea.toFixed(0)} mm²<br />
            <strong>V-Stab Area:</strong> {metrics.vStabArea.toFixed(0)} mm²<br />
            <strong>Wing True Length:</strong> {metrics.wingTrueLength.toFixed(1)} mm
          </div>
        </div>
      );

    case "lift":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconArrowsUp size={18} stroke={1.8} /> Lift Analysis</div>
          <MetricBar
            label="Lift Efficiency Ratio"
            value={metrics.liftEfficiencyRatio}
            unit=""
            min={SPEC_LIMITS.liftEfficiency.min}
            max={SPEC_LIMITS.liftEfficiency.max}
            isGood={metrics.liftEfficiencyRatio >= SPEC_LIMITS.liftEfficiency.min}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            <strong>Formula:</strong> Wing Area / Mass × 0.08<br />
            <strong>Wing Area:</strong> {metrics.wingArea.toFixed(0)} mm²<br />
            <strong>Mass:</strong> {metrics.mass.toFixed(2)} g<br />
            <strong>Target:</strong> &gt; {SPEC_LIMITS.liftEfficiency.min}
          </div>
        </div>
      );

    case "drag":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconWind size={18} stroke={1.8} /> Drag Analysis</div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>Drag is influenced by:</p>
            <ul style={{ paddingLeft: 16, listStyle: "disc" }}>
              <li><strong>Form Drag:</strong> Fuselage shape and cross-section</li>
              <li><strong>Induced Drag:</strong> Wing tip vortices (reduced by higher aspect ratio)</li>
              <li><strong>Skin Friction:</strong> Surface roughness (sanding level: <strong>{store.wing.sandingLevel}</strong>)</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              <strong>Aspect Ratio:</strong> {(store.wing.span / store.wing.chord).toFixed(2)}<br />
              <strong>Wing Shape:</strong> {store.wing.shape}
            </p>
          </div>
        </div>
      );

    case "roll":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconAxisX size={18} stroke={1.8} /> Roll Stability</div>
          <MetricBar
            label="Effective Dihedral"
            value={metrics.effectiveDihedral}
            unit="°"
            min={SPEC_LIMITS.effectiveDihedral.min}
            max={SPEC_LIMITS.effectiveDihedral.max}
            isGood={metrics.effectiveDihedral >= SPEC_LIMITS.effectiveDihedral.min && metrics.effectiveDihedral <= SPEC_LIMITS.effectiveDihedral.max}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            <strong>Dihedral Type:</strong> {store.wing.dihedralType}<br />
            <strong>Dihedral Angle:</strong> {store.wing.dihedral}°<br />
            {store.wing.dihedralType === "tipDihedral" && (
              <><strong>Tip Dihedral:</strong> {store.wing.tipDihedral}°<br /></>
            )}
            <strong>Optimal Range:</strong> {SPEC_LIMITS.effectiveDihedral.min}° - {SPEC_LIMITS.effectiveDihedral.max}°
          </div>
        </div>
      );

    case "pitch":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconFeather size={18} stroke={1.8} /> Pitch Stability</div>
          <MetricBar
            label="Static Margin"
            value={metrics.staticMarginMm}
            unit="mm"
            min={SPEC_LIMITS.staticMargin.min}
            max={SPEC_LIMITS.staticMargin.max}
            isGood={metrics.staticMarginMm >= 0 && metrics.staticMarginMm <= SPEC_LIMITS.staticMargin.max}
          />
          <MetricBar
            label="CG Chord Fraction"
            value={metrics.cgChordFraction}
            unit=""
            min={SPEC_LIMITS.cgChordFraction.min}
            max={SPEC_LIMITS.cgChordFraction.max}
            isGood={metrics.cgChordFraction >= SPEC_LIMITS.cgChordFraction.min && metrics.cgChordFraction <= SPEC_LIMITS.cgChordFraction.max}
          />
          <MetricBar
            label="HS/Wing Area Ratio"
            value={metrics.hsToWingAreaRatio}
            unit=""
            min={SPEC_LIMITS.hsToWarRatio.min}
            max={SPEC_LIMITS.hsToWarRatio.max}
            isGood={metrics.hsToWingAreaRatio >= SPEC_LIMITS.hsToWarRatio.min && metrics.hsToWingAreaRatio <= SPEC_LIMITS.hsToWarRatio.max}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            <strong>CG Position:</strong> {metrics.centerOfGravity.toFixed(1)} mm from nose<br />
            <strong>Neutral Point:</strong> {metrics.neutralPoint.toFixed(1)} mm from nose<br />
            <strong>SM = NP - CG:</strong> {metrics.staticMarginMm.toFixed(1)} mm
          </div>
        </div>
      );

    case "yaw":
      return (
        <div style={panelStyle}>
          <div style={titleStyle}><IconAxisY size={18} stroke={1.8} /> Yaw Stability</div>
          <MetricBar
            label="V/H Stab Area Ratio"
            value={metrics.vhStabAreaRatio}
            unit=""
            min={SPEC_LIMITS.vhStabRatio.min}
            max={SPEC_LIMITS.vhStabRatio.max}
            isGood={metrics.vhStabAreaRatio >= SPEC_LIMITS.vhStabRatio.min && metrics.vhStabAreaRatio <= SPEC_LIMITS.vhStabRatio.max}
          />
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
            <strong>V-Stab Area:</strong> {metrics.vStabArea.toFixed(0)} mm²<br />
            <strong>H-Stab Area:</strong> {metrics.hStabArea.toFixed(0)} mm²<br />
            <strong>Ratio:</strong> {metrics.vhStabAreaRatio.toFixed(3)}<br />
            <strong>Optimal Range:</strong> {SPEC_LIMITS.vhStabRatio.min} - {SPEC_LIMITS.vhStabRatio.max}
          </div>
        </div>
      );

    default:
      return null;
  }
}
