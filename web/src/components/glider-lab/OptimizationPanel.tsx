"use client";

import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { useGliderStore } from "../../store/gliderStore";

export function OptimizationPanel() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const values = [
    { label: "Massa", value: `${metrics.mass.toFixed(1)} g`, ok: !metrics.specViolations.includes("mass") },
    { label: "Ko'tarish", value: metrics.liftEfficiencyRatio.toFixed(1), ok: !metrics.specViolations.includes("liftEfficiency") },
    { label: "Dihedral", value: `${metrics.effectiveDihedral.toFixed(1)}°`, ok: !metrics.specViolations.includes("effectiveDihedral") },
    { label: "Statik zaxira", value: `${metrics.staticMarginMm.toFixed(1)} mm`, ok: !metrics.specViolations.includes("staticMargin") },
    { label: "H-dum nisbati", value: metrics.hsToWingAreaRatio.toFixed(2), ok: !metrics.specViolations.includes("hsToWarRatio") },
    { label: "Parvoz vaqti", value: `${metrics.flightTimeSec.toFixed(2)} s`, ok: metrics.flightTimeSec > 0 },
  ];
  const issueCount = values.filter((item) => !item.ok).length;

  return (
    <section className="border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 md:px-4" aria-label="Dizayn holati">
      <div className="flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-36 shrink-0 border-r border-[var(--line)] pr-3">
          <p className="text-xs font-semibold text-[var(--ink)]">Dizayn holati</p>
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium ${issueCount ? "text-amber-700" : "text-[var(--accent)]"}`}>
            {issueCount ? <IconAlertTriangle size={13} stroke={1.8} /> : <IconCircleCheck size={13} stroke={1.8} />}
            {issueCount ? `${issueCount} parametrni sozlang` : "Asosiy limitlar bajarildi"}
          </div>
        </div>
        {values.map((item) => (
          <div key={item.label} className="min-w-[118px] shrink-0 px-1.5">
            <p className="text-[10px] font-medium text-[var(--ink-muted)]">{item.label}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-[var(--ink)]">{item.value}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${item.ok ? "bg-emerald-500" : "bg-amber-500"}`} aria-label={item.ok ? "Limit ichida" : "Sozlash kerak"} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
