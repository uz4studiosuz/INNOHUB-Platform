"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Iteration, getIterations, getBestIteration, clearIterations } from "../../store/iterationStore";
import { IconFileAnalytics, IconTrophy } from "@tabler/icons-react";

export function IterationOutputs({
  moduleKey,
  direction = "max",
  color = "#f59e0b",
}: {
  moduleKey: string;
  direction?: "max" | "min";
  color?: string;
}) {
  const [iterations, setIterations] = useState<Iteration[]>(() => getIterations(moduleKey));
  const [best, setBest] = useState<Iteration | null>(() => getBestIteration(moduleKey, direction));

  const handleClear = () => {
    clearIterations(moduleKey);
    setIterations([]);
    setBest(null);
  };

  if (iterations.length === 0) {
    return (
      <div className="flex-1 p-8 bg-[var(--canvas)] overflow-y-auto flex items-center justify-center">
        <div className="text-center max-w-lg">
          <IconFileAnalytics size={42} stroke={1.6} className="mx-auto mb-4 text-[var(--accent)]" />
          <h1 className="text-2xl font-semibold mb-2 text-[var(--ink)]">Outputs</h1>
          <p className="text-[var(--ink-muted)] text-sm">
            Hali hech qanday hisoblash bajarilmagan. ENGINEERING tab&apos;ida hisoblash tugmasini bosgach,
            har bir urinishingiz shu yerda avtomatik saqlanadi.
          </p>
        </div>
      </div>
    );
  }

  const chartData = iterations.map((it, i) => ({ index: i + 1, value: it.keyMetric.value }));
  const metricLabel = iterations[0].keyMetric.label;

  return (
    <div className="flex-1 p-8 bg-[var(--canvas)] text-[var(--ink)] overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Outputs | Iteratsiyalar tarixi</h1>
            <p className="text-[var(--ink-muted)] text-sm mt-1">
              {iterations.length} ta urinish saqlangan (brauzeringizda, sahifa yangilangach ham qoladi).
            </p>
          </div>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            Tarixni tozalash
          </button>
        </div>

        {best && (
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5 flex items-center gap-4">
            <IconTrophy size={28} stroke={1.7} className="text-[var(--accent)]" />
            <div>
              <div className="text-xs text-[var(--accent)] font-semibold">Eng yaxshi urinish</div>
              <div className="text-xl font-bold">
                {best.keyMetric.label}: {best.keyMetric.value.toFixed(3)}{best.keyMetric.unit ?? ""}
              </div>
              <div className="text-xs text-[var(--ink-muted)] mt-1">{new Date(best.timestamp).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce2e8" />
              <XAxis
                dataKey="index"
                stroke="#66727f"
                fontSize={12}
                label={{ value: "Urinish #", position: "insideBottom", offset: -5, fill: "#66727f", fontSize: 12 }}
              />
              <YAxis stroke="#66727f" fontSize={12} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #dce2e8", borderRadius: 8 }} labelStyle={{ color: "#18212b" }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} name={metricLabel} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)] text-xs">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Vaqt</th>
                <th className="text-left px-4 py-2">{metricLabel}</th>
                <th className="text-left px-4 py-2">Parametrlar</th>
              </tr>
            </thead>
            <tbody>
              {iterations
                .slice()
                .reverse()
                .map((it, i) => (
                  <tr
                    key={it.id}
                    className={`border-t border-[var(--line)] ${best && it.id === best.id ? "bg-[var(--accent-soft)]" : ""}`}
                  >
                    <td className="px-4 py-2 text-[var(--ink-muted)]">{iterations.length - i}</td>
                    <td className="px-4 py-2 text-[var(--ink-muted)]">{new Date(it.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 font-bold">
                      {it.keyMetric.value.toFixed(3)}{it.keyMetric.unit ?? ""} {best && it.id === best.id && <IconTrophy size={14} stroke={1.8} className="inline text-[var(--accent)]" />}
                    </td>
                    <td className="px-4 py-2 text-[var(--ink-muted)] text-xs font-mono">
                      {Object.entries(it.params)
                        .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
