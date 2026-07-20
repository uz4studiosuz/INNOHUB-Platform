"use client";

import { useGliderStore } from "../../store/gliderStore";
import { normalizeMetric, normalizeMetricCentered, SPEC_LIMITS } from "../../lib/physics/gliderPhysics";

interface OptParam {
  id: string;
  label: string;
  /** Current value (0-1 scale, where 0 = worst / red, 1 = best / green) */
  value: number;
  isOutOfSpec?: boolean;
  /** Color used for the label text */
  labelColor?: string;
}

function OptBar({ param }: { param: OptParam }) {
  const pct = Math.max(0, Math.min(100, param.value * 100));

  return (
    <div className="opt-row">
      {/* Triangle indicator */}
      <div className="opt-bar-track">
        <div className="opt-bar-gradient" />
        {/* Tick marks for visual reference */}
        {[20, 40, 60, 80].map((tick) => (
          <div
            key={tick}
            className="opt-bar-tick"
            style={{ left: `${tick}%` }}
          />
        ))}
        {/* Indicator triangle */}
        <div
          className="opt-triangle"
          style={{ left: `${pct}%` }}
        />
      </div>
      {/* Label on the right */}
      <span
        className="opt-label"
        style={{ color: param.labelColor || (param.isOutOfSpec ? "#ef4444" : "#22c55e") }}
      >
        {param.label}
      </span>
    </div>
  );
}

export function OptimizationPanel() {
  const getComputedMetrics = useGliderStore(state => state.getComputedMetrics);
  const metrics = getComputedMetrics();

  // Normalize metrics for the bars (0.0 to 1.0)
  const weightScore = normalizeMetric(metrics.mass, SPEC_LIMITS.mass, false);
  const liftScore = normalizeMetric(metrics.liftEfficiencyRatio, SPEC_LIMITS.liftEfficiency, true);
  const dragScore = Math.max(0, Math.min(1, liftScore * 0.8 + 0.2));
  const rollScore = normalizeMetricCentered(metrics.effectiveDihedral, SPEC_LIMITS.effectiveDihedral.min, SPEC_LIMITS.effectiveDihedral.max);
  const pitchCgScore = normalizeMetricCentered(metrics.staticMarginMm, 5, 15);
  const pitchNpScore = normalizeMetricCentered(metrics.neutralPoint / 300, 0.4, 0.6);
  const pitchHsScore = normalizeMetricCentered(metrics.hsToWingAreaRatio, SPEC_LIMITS.hsToWarRatio.min, SPEC_LIMITS.hsToWarRatio.max);
  const yawScore = normalizeMetricCentered(metrics.vhStabAreaRatio, SPEC_LIMITS.vhStabRatio.min, SPEC_LIMITS.vhStabRatio.max);

  const params: OptParam[] = [
    { id: "weight",   label: "Weight",                     value: weightScore,  isOutOfSpec: metrics.specViolations.includes("mass"),             labelColor: "#22c55e" },
    { id: "lift",     label: "Lift",                       value: liftScore,    isOutOfSpec: metrics.specViolations.includes("liftEfficiency"),    labelColor: "#22c55e" },
    { id: "drag",     label: "Drag",                       value: dragScore,                                                                      labelColor: "#22c55e" },
    { id: "roll",     label: "Roll",                       value: rollScore,    isOutOfSpec: metrics.specViolations.includes("effectiveDihedral"), labelColor: "#f59e0b" },
    { id: "pitch-cg", label: "Pitch (Center of Gravity)",  value: pitchCgScore, isOutOfSpec: metrics.specViolations.includes("staticMargin"),     labelColor: "#22c55e" },
    { id: "pitch-np", label: "Pitch (Neutral Point)",      value: pitchNpScore,                                                                   labelColor: "#ef4444" },
    { id: "pitch-hs", label: "Pitch (Horizontal Stabilizer)", value: pitchHsScore, isOutOfSpec: metrics.specViolations.includes("hsToWarRatio"), labelColor: "#ef4444" },
    { id: "yaw",      label: "Yaw",                        value: yawScore,                                                                       labelColor: "#22c55e" },
  ];

  return (
    <div className="opt-panel">
      <h3 className="opt-title">Optimization</h3>
      <div className="opt-bars-container">
        {params.map((p) => (
          <OptBar key={p.id} param={p} />
        ))}
      </div>
      {/* WhiteBox-style legend */}
      <div className="opt-legend">
        <span className="opt-legend-unstable">Unstable</span>
        <span className="opt-legend-scale">OK &lt;-- Better --&gt; Best</span>
      </div>
    </div>
  );
}
