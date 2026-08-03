"use client";

import { useState } from "react";
import { getBestIteration } from "../../store/iterationStore";
import { IconMedal, IconTrophy } from "@tabler/icons-react";

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
  const hasUser = entries.some((e) => e.name === "Siz");

  return (
    <div className="flex-1 p-8 bg-[var(--canvas)] text-[var(--ink)] overflow-y-auto">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <IconTrophy size={42} stroke={1.6} className="mx-auto mb-3 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-[var(--ink-muted)] text-sm mt-1">{metricLabel} bo&apos;yicha reyting</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden">
          {sorted.map((e, i) => (
            <div
              key={`${e.name}-${i}`}
              className={`flex items-center justify-between px-5 py-3 ${i < sorted.length - 1 ? "border-b border-[var(--line)]" : ""}`}
              style={e.name === "Siz" ? { background: `${color}1a` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span className="flex w-8 justify-center text-[var(--ink-muted)]">{i < 3 ? <IconMedal size={20} stroke={1.8} /> : `#${i + 1}`}</span>
                <span className="font-semibold text-[var(--ink)]">{e.name}</span>
              </div>
              <span className="font-mono font-bold" style={{ color }}>
                {e.value.toFixed(2)}{unit}
              </span>
            </div>
          ))}
        </div>

        {!hasUser && (
          <p className="text-center text-xs text-[var(--ink-muted)]">
            ENGINEERING tab&apos;ida hisoblang. Natijangiz shu reytingga avtomatik qo&apos;shiladi.
          </p>
        )}
      </div>
    </div>
  );
}
