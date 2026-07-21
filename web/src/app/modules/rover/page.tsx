"use client";

import { useCallback, useState } from "react";

type RoverResult = {
  final_distance_m: number;
  final_velocity_ms: number;
  max_grade_deg: number;
  tractive_force_N: number;
  top_speed_ms: number;
  trajectory: { t: number; x: number; v: number; a: number }[];
};

export default function RoverPage() {
  const [mass, setMass] = useState(10);
  const [torque, setTorque] = useState(0.5);
  const [gear, setGear] = useState(10);
  const [incline, setIncline] = useState(0);
  const [crr, setCrr] = useState(0.02);
  const [result, setResult] = useState<RoverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "rover",
          params: {
            mass, wheelRadius: 0.1, motorTorque: torque, gearRatio: gear,
            efficiency: 0.85, rollingResistance: crr, frictionCoeff: 0.6,
            dragCoeff: 0.3, frontalArea: 0.05, inclineDeg: incline,
            dt: 0.1, maxTime: 30,
          },
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [mass, torque, gear, incline, crr]);

  return (
    <div className="flex-1 bg-[#080b11] overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto py-8 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">Mars Roveri Simulyatsiyasi</h1>
          <p className="text-slate-400 max-w-2xl mt-2">
            Rover parametrlarini sozlang va harakat simulyatsiyasini ishga tushiring.
            Tortish kuchi, qarshilik va nishablikni hisobga olgan holda rover harakati hisoblanadi.
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-4 min-w-[280px] bg-[#0a0e18] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]">
            <h2 className="font-semibold text-lg">Parametrlar</h2>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Massa: {mass.toFixed(1)} kg</span>
              <input type="range" min={1} max={100} step={0.5} value={mass} onChange={e => setMass(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Motor momenti: {torque.toFixed(2)} N·m</span>
              <input type="range" min={0.05} max={5} step={0.05} value={torque} onChange={e => setTorque(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Reduksiya: {gear}</span>
              <input type="range" min={1} max={50} step={1} value={gear} onChange={e => setGear(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Nishablik: {incline}°</span>
              <input type="range" min={0} max={45} step={1} value={incline} onChange={e => setIncline(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">G&apos;ildirak qarshiligi: {crr.toFixed(3)}</span>
              <input type="range" min={0.005} max={0.2} step={0.005} value={crr} onChange={e => setCrr(Number(e.target.value))} />
            </label>

            <button onClick={handleRun} disabled={loading} className="mt-2 rounded-xl bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer">
              {loading ? "Ishga tushirilmoqda..." : "▶ Ishga tushirish"}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 min-w-[320px] h-fit">
              ❌ Xatolik: {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
              <h2 className="font-semibold text-lg">Natijalar</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
                  <div className="text-xs text-orange-400">Masofa</div>
                  <div className="text-lg font-bold">{result.final_distance_m.toFixed(1)} m</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400">Tezlik</div>
                  <div className="text-lg font-bold">{result.final_velocity_ms.toFixed(2)} m/s</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                  <div className="text-xs text-green-400">Maks. nishablik</div>
                  <div className="text-lg font-bold">{result.max_grade_deg.toFixed(1)}°</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-xs text-purple-400">Tortish kuchi</div>
                  <div className="text-lg font-bold">{result.tractive_force_N.toFixed(2)} N</div>
                </div>
              </div>

              <div className="bg-[#0a0e18] rounded-lg p-3 border border-[rgba(255,255,255,0.1)]">
                <h3 className="font-semibold text-sm mb-2">Harakat ma&apos;lumotlari</h3>
                <div className="max-h-40 overflow-y-auto text-xs text-slate-400">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pr-2">t (s)</th>
                        <th className="pr-2">x (m)</th>
                        <th className="pr-2">v (m/s)</th>
                        <th className="pr-2">a (m/s²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trajectory.map((p, i) => (
                        <tr key={i}>
                          <td className="pr-2">{p.t.toFixed(1)}</td>
                          <td className="pr-2">{p.x.toFixed(1)}</td>
                          <td className="pr-2">{p.v.toFixed(2)}</td>
                          <td className="pr-2">{p.a.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
