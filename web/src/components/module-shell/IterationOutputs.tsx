"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Iteration, getIterations, getBestIteration, clearIterations } from "../../store/iterationStore";

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
      <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-2xl font-bold mb-2">Outputs</h1>
          <p className="text-slate-400 text-sm">
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
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Outputs — Iteratsiyalar tarixi</h1>
            <p className="text-slate-400 text-sm mt-1">
              {iterations.length} ta urinish saqlangan (brauzeringizda, sahifa yangilangach ham qoladi).
            </p>
          </div>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg bg-[#141a2b] border border-[rgba(255,255,255,0.1)] text-sm text-slate-300 hover:bg-[#1a2236] cursor-pointer"
          >
            Tarixni tozalash
          </button>
        </div>

        {best && (
          <div className="bg-[#0a0e18] border border-emerald-500/30 rounded-xl p-5 flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div>
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Eng yaxshi urinish</div>
              <div className="text-xl font-bold">
                {best.keyMetric.label}: {best.keyMetric.value.toFixed(3)}{best.keyMetric.unit ?? ""}
              </div>
              <div className="text-xs text-slate-500 mt-1">{new Date(best.timestamp).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl p-5" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="index"
                stroke="#64748b"
                fontSize={12}
                label={{ value: "Urinish #", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 12 }}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: "#0a0e18", border: "1px solid rgba(255,255,255,0.1)" }} labelStyle={{ color: "#fff" }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} name={metricLabel} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#141a2b] text-slate-400 text-xs uppercase">
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
                    className={`border-t border-[rgba(255,255,255,0.06)] ${best && it.id === best.id ? "bg-emerald-500/5" : ""}`}
                  >
                    <td className="px-4 py-2 text-slate-500">{iterations.length - i}</td>
                    <td className="px-4 py-2 text-slate-400">{new Date(it.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 font-bold">
                      {it.keyMetric.value.toFixed(3)}{it.keyMetric.unit ?? ""} {best && it.id === best.id && "🏆"}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs font-mono">
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
