"use client";

import { useState } from "react";
import { Mission, getProgress, setCompleted, getScore } from "@/lib/missions/missions";

interface MissionCardProps {
  mission: Mission;
  onScoreChange: () => void;
}

export default function MissionCard({ mission, onScoreChange }: MissionCardProps) {
  const [params, setParams] = useState<Record<string, number>>(() => {
    const p: Record<string, number> = {};
    mission.params.forEach((mp) => { p[mp.key] = mp.default; });
    return p;
  });
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null);
  const completed = getProgress()[mission.id];

  const handleRun = () => {
    const r = mission.check(params);
    setResult(r);
    if (r.passed) {
      setCompleted(mission.id);
      onScoreChange();
    }
  };

  const moduleColors: Record<string, string> = {
    electronics: "border-blue-400",
    mechanics: "border-amber-400",
    aerodynamics: "border-purple-400",
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 bg-white shadow-sm ${
        completed ? "border-green-400 bg-green-50" : moduleColors[mission.module] || "border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-lg">{mission.title}</h3>
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {mission.module}
          </span>
        </div>
        {completed && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            Bajarildi
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
      <p className="text-xs text-gray-500 mb-4 italic">{mission.goal}</p>

      <div className="flex flex-col gap-3 mb-4">
        {mission.params.map((p) => (
          <div key={p.key}>
            <label className="block text-xs font-medium mb-1">
              {p.label}: {params[p.key]} {p.unit}
            </label>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={params[p.key]}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleRun}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Tekshirish
      </button>

      {result && (
        <div
          className={`mt-3 rounded-lg p-3 text-sm ${
            result.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
