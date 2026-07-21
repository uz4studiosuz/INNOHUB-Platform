"use client";

import { useState } from "react";
import { getBestIteration } from "../../store/iterationStore";

export interface LeaderboardEntry {
  name: string;
  value: number;
}

export function Leaderboard({
  moduleKey,
  direction = "max",
  metricLabel,
  unit = "",
  mockEntries,
  color = "#f59e0b",
  title,
}: {
  moduleKey: string;
  direction?: "max" | "min";
  metricLabel: string;
  unit?: string;
  mockEntries: LeaderboardEntry[];
  color?: string;
  title: string;
}) {
  const [entries] = useState<LeaderboardEntry[]>(() => {
    const best = getBestIteration(moduleKey, direction);
    return best ? [...mockEntries, { name: "Siz", value: best.keyMetric.value }] : mockEntries;
  });

  const sorted = [...entries].sort((a, b) => (direction === "max" ? b.value - a.value : a.value - b.value));
  const medals = ["🥇", "🥈", "🥉"];
  const hasUser = entries.some((e) => e.name === "Siz");

  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">{metricLabel} bo&apos;yicha reyting</p>
        </div>

        <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          {sorted.map((e, i) => (
            <div
              key={`${e.name}-${i}`}
              className={`flex items-center justify-between px-5 py-3 ${i < sorted.length - 1 ? "border-b border-[rgba(255,255,255,0.06)]" : ""}`}
              style={e.name === "Siz" ? { background: `${color}1a` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-lg text-center">{medals[i] ?? `#${i + 1}`}</span>
                <span className={`font-semibold ${e.name === "Siz" ? "text-white" : "text-slate-300"}`}>{e.name}</span>
              </div>
              <span className="font-mono font-bold" style={{ color }}>
                {e.value.toFixed(2)}{unit}
              </span>
            </div>
          ))}
        </div>

        {!hasUser && (
          <p className="text-center text-xs text-slate-500">
            ENGINEERING tab&apos;ida hisoblang — natijangiz shu reytingga avtomatik qo&apos;shiladi.
          </p>
        )}
      </div>
    </div>
  );
}
