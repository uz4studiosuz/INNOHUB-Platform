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

function simulateRover(
  mass: number, wheelR: number, torque: number, gear: number, eff: number,
  crr: number, mu: number, cd: number, area: number, incline: number,
  dt: number, maxTime: number,
): RoverResult {
  const g = 9.81;
  const F_t = torque * gear * eff / wheelR;
  const traj: { t: number; x: number; v: number; a: number }[] = [];
  let x = 0, v = 0;

  const nSteps = Math.ceil(maxTime / dt);
  for (let step = 0; step < nSteps; step++) {
    const F_rr = crr * mass * g * Math.cos(incline * Math.PI / 180);
    const F_gr = mass * g * Math.sin(incline * Math.PI / 180);
    const F_d = 0.5 * 1.225 * v * v * cd * area;
    const F_net = F_t - F_rr - F_gr - F_d;
    const a = F_net / mass;
    v += a * dt;
    if (v < 0) v = 0;
    x += v * dt;
    if (step % Math.max(1, Math.floor(nSteps / 50)) === 0) {
      traj.push({ t: step * dt, x, v, a });
    }
  }

  return {
    final_distance_m: x, final_velocity_ms: v,
    max_grade_deg: Math.atan(mu) * 180 / Math.PI,
    tractive_force_N: F_t, top_speed_ms: v, trajectory: traj,
  };
}

export default function RoverPage() {
  const [mass, setMass] = useState(10);
  const [torque, setTorque] = useState(0.5);
  const [gear, setGear] = useState(10);
  const [incline, setIncline] = useState(0);
  const [crr, setCrr] = useState(0.02);
  const [result, setResult] = useState<RoverResult | null>(null);

  const handleRun = useCallback(() => {
    const res = simulateRover(mass, 0.1, torque, gear, 0.85, crr, 0.6, 0.3, 0.05, incline, 0.1, 30);
    setResult(res);
  }, [mass, torque, gear, incline, crr]);

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Mars Roveri Simulyatsiyasi</h1>
      <p className="text-gray-600 max-w-2xl">
        Rover parametrlarini sozlang va harakat simulyatsiyasini ishga tushiring.
        Tortish kuchi, qarshilik va nishablikni hisobga olgan holda rover harakati hisoblanadi.
      </p>

      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-4 min-w-[280px] bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h2 className="font-semibold text-lg">Parametrlar</h2>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Massa: {mass.toFixed(1)} kg</span>
            <input type="range" min={1} max={100} step={0.5} value={mass} onChange={e => setMass(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Motor momenti: {torque.toFixed(2)} N·m</span>
            <input type="range" min={0.05} max={5} step={0.05} value={torque} onChange={e => setTorque(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Reduksiya: {gear}</span>
            <input type="range" min={1} max={50} step={1} value={gear} onChange={e => setGear(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Nishablik: {incline}°</span>
            <input type="range" min={0} max={45} step={1} value={incline} onChange={e => setIncline(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">G&apos;ildirak qarshiligi: {crr.toFixed(3)}</span>
            <input type="range" min={0.005} max={0.2} step={0.005} value={crr} onChange={e => setCrr(Number(e.target.value))} />
          </label>

          <button onClick={handleRun} className="mt-2 rounded-xl bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-700 transition-colors shadow-md">
            ▶ Ishga tushirish
          </button>
        </div>

        {result && (
          <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
            <h2 className="font-semibold text-lg">Natijalar</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-orange-600">Masofa</div>
                <div className="text-lg font-bold">{result.final_distance_m.toFixed(1)} m</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600">Tezlik</div>
                <div className="text-lg font-bold">{result.final_velocity_ms.toFixed(2)} m/s</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600">Maks. nishablik</div>
                <div className="text-lg font-bold">{result.max_grade_deg.toFixed(1)}°</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-xs text-purple-600">Tortish kuchi</div>
                <div className="text-lg font-bold">{result.tractive_force_N.toFixed(2)} N</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h3 className="font-semibold text-sm mb-2">Harakat ma&apos;lumotlari</h3>
              <div className="max-h-40 overflow-y-auto text-xs text-gray-600">
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
  );
}
