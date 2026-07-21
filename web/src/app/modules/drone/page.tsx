"use client";

import { useCallback, useState } from "react";

type DroneResult = {
  hover_rpm: number;
  single_motor_thrust_N: number;
  weight_N: number;
  tw_ratio: number;
  max_vertical_accel_ms2: number;
};

export default function DronePage() {
  const [mass, setMass] = useState(1.5);
  const [armLen, setArmLen] = useState(0.2);
  const [kt, setKt] = useState(1e-5);
  const [maxRpm, setMaxRpm] = useState(10000);
  const [propDia, setPropDia] = useState(0.2);
  const [battCap, setBattCap] = useState(2200);
  const [hoverA, setHoverA] = useState(10);
  const [result, setResult] = useState<DroneResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const battLifeMin = hoverA > 0 ? (battCap / (hoverA * 1000)) * 60 : 0;

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "drone",
          params: {
            mass, armLength: armLen, thrustCoeff: kt, maxRpm, propDiameter: propDia,
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
  }, [mass, armLen, kt, maxRpm, propDia]);

  return (
    <div className="flex-1 bg-[#080b11] overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto py-8 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">Quadkopter (Drone) Muhandisligi</h1>
          <p className="text-slate-400 max-w-2xl mt-2">
            Quadkopter parvoz parametrlarini hisoblang: hover RPM, tortish kuchi, T/W nisbati va batareya muddati.
            Manba: Leishman — Helicopter Aerodynamics.
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-4 min-w-[280px] bg-[#0a0e18] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]">
            <h2 className="font-semibold text-lg">Parametrlar</h2>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Massa: {mass.toFixed(2)} kg</span>
              <input type="range" min={0.2} max={5} step={0.05} value={mass} onChange={e => setMass(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Motor qo&apos;l uzunligi: {armLen.toFixed(2)} m</span>
              <input type="range" min={0.05} max={0.5} step={0.01} value={armLen} onChange={e => setArmLen(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Tortish koeff. (kt): {kt.toExponential()}</span>
              <input type="range" min={0.5e-6} max={5e-5} step={0.5e-6} value={kt}
                onChange={e => setKt(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Maks. RPM: {maxRpm}</span>
              <input type="range" min={2000} max={30000} step={500} value={maxRpm} onChange={e => setMaxRpm(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Parvrak diametri: {propDia.toFixed(2)} m</span>
              <input type="range" min={0.05} max={0.5} step={0.01} value={propDia} onChange={e => setPropDia(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Batareya sig&apos;imi: {battCap} mAh</span>
              <input type="range" min={500} max={10000} step={100} value={battCap} onChange={e => setBattCap(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Hover oqimi: {hoverA} A</span>
              <input type="range" min={1} max={40} step={1} value={hoverA} onChange={e => setHoverA(Number(e.target.value))} />
            </label>

            <button onClick={handleAnalyze} disabled={loading} className="mt-2 rounded-xl bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer">
              {loading ? "Hisoblanmoqda..." : "▶ Hisoblash"}
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
                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30">
                  <div className="text-xs text-amber-400">Hover RPM</div>
                  <div className="text-lg font-bold">{result.hover_rpm.toFixed(0)}</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400">Tortish kuchi</div>
                  <div className="text-lg font-bold">{result.single_motor_thrust_N.toFixed(2)} N</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                  <div className="text-xs text-red-400">Weight</div>
                  <div className="text-lg font-bold">{result.weight_N.toFixed(2)} N</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                  <div className="text-xs text-green-400">T/W nisbati</div>
                  <div className="text-lg font-bold">{result.tw_ratio.toFixed(2)}</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                  <div className="text-xs text-purple-400">Maks. vertikal tezl.</div>
                  <div className="text-lg font-bold">{result.max_vertical_accel_ms2.toFixed(2)} m/s²</div>
                </div>
                <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                  <div className="text-xs text-cyan-400">Batareya muddati</div>
                  <div className="text-lg font-bold">{battLifeMin.toFixed(1)} min</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
