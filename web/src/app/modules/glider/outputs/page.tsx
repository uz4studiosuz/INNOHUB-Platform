"use client";

import React, { useMemo } from "react";
import { useGliderStore } from "../../../../store/gliderStore";
import { SPEC_LIMITS } from "../../../../lib/physics/gliderPhysics";

export default function OutputsPage() {
  const store = useGliderStore();
  const metrics = useMemo(() => store.getComputedMetrics(), [store]);

  const specs = [
    { key: "wingSpan", val: store.wing.span },
    { key: "wingChord", val: store.wing.chord },
    { key: "wingTrueLength", val: metrics.wingTrueLength },
    { key: "hStabSpan", val: store.horizontalStabilizer.span },
    { key: "hStabChord", val: store.horizontalStabilizer.chord },
    { key: "vStabHeight", val: store.verticalStabilizer.height },
    { key: "vStabChord", val: store.verticalStabilizer.chord },
    { key: "fuselageLength", val: store.fuselage.length },
    { key: "mass", val: metrics.mass },
    { key: "liftEfficiency", val: metrics.liftEfficiencyRatio },
    { key: "effectiveDihedral", val: metrics.effectiveDihedral },
    { key: "hsToWarRatio", val: metrics.hsToWingAreaRatio },
    { key: "vhStabRatio", val: metrics.vhStabAreaRatio },
    { key: "cgChordFraction", val: metrics.cgChordFraction },
    { key: "staticMargin", val: metrics.staticMarginMm },
  ] as const;

  return (
    <div className="flex-1 p-8 bg-[#060814] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Design Specifications</h1>
        <p className="text-slate-400 mb-8">
          Detailed metrics and physical limits for the current glider design. 
          Parameters out of specification are highlighted in red.
        </p>

        <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f1423] border-b border-[rgba(255,255,255,0.1)]">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/3">Parameter</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-1/6">Min Limit</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-1/6">Max Limit</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right w-1/3">As Designed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {specs.map(({ key, val }) => {
                const limit = SPEC_LIMITS[key];
                const isOutOfSpec = val < limit.min || val > limit.max;

                return (
                  <tr key={key} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="p-4">
                      <div className="font-semibold">{limit.label}</div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-400">
                      {limit.min} {limit.unit}
                    </td>
                    <td className="p-4 text-center font-mono text-slate-400">
                      {limit.max} {limit.unit}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-mono font-bold ${isOutOfSpec ? "text-red-400" : "text-emerald-400"}`}>
                        {typeof val === 'number' ? val.toFixed(2) : val} {limit.unit}
                      </div>
                      {isOutOfSpec && (
                        <div className="text-[10px] text-red-500/80 uppercase tracking-wider mt-1">Out of Spec</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
