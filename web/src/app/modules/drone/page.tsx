"use client";

import { useCallback, useState } from "react";

type DroneResult = {
  hover_rpm: number;
  thrust_N: number;
  weight_N: number;
  tw_ratio: number;
  max_vertical_accel_ms2: number;
  battery_life_min: number;
};

function analyzeDrone(
  mass: number, armLen: number, kt: number, maxRpm: number,
  propDia: number, ct: number, battCapacity_mAh: number,
  hoverCurrent_A: number,
): DroneResult {
  const weight = mass * 9.81;
  const hoverRpm = Math.sqrt(weight / (4 * kt));
  const thrust = kt * maxRpm * maxRpm;
  const totalThrust = 4 * thrust;
  const tw = totalThrust / weight;
  const maxAccel = (totalThrust - weight) / mass;
  const n = hoverRpm / 60;
  const hoverThrust = ct * 1.225 * n * n * Math.pow(propDia, 4);
  const battLife = hoverCurrent_A > 0 ? battCapacity_mAh / (hoverCurrent_A * 1000) * 60 : 0;

  return {
    hover_rpm: hoverRpm,
    thrust_N: thrust,
    weight_N: weight,
    tw_ratio: tw,
    max_vertical_accel_ms2: maxAccel,
    battery_life_min: battLife,
  };
}

export default function DronePage() {
  const [mass, setMass] = useState(1.5);
  const [armLen, setArmLen] = useState(0.2);
  const [kt, setKt] = useState(1e-5);
  const [maxRpm, setMaxRpm] = useState(10000);
  const [propDia, setPropDia] = useState(0.2);
  const [battCap, setBattCap] = useState(2200);
  const [hoverA, setHoverA] = useState(10);
  const [result, setResult] = useState<DroneResult | null>(null);

  const handleAnalyze = useCallback(() => {
    const res = analyzeDrone(mass, armLen, kt, maxRpm, propDia, 0.1, battCap, hoverA);
    setResult(res);
  }, [mass, armLen, kt, maxRpm, propDia, battCap, hoverA]);

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Quadkopter (Drone) Tahlili</h1>
      <p className="text-gray-600 max-w-2xl">
        Quadkopter parvoz parametrlarini hisoblang: hover RPM, tortish kuchi, T/W nisbati va batareya muddati.
        Manbalar: Leishman - Helicopter Aerodynamics.
      </p>

      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-4 min-w-[280px] bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h2 className="font-semibold text-lg">Parametrlar</h2>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Massa: {mass.toFixed(2)} kg</span>
            <input type="range" min={0.2} max={5} step={0.05} value={mass} onChange={e => setMass(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Motor qo&apos;l uzunligi: {armLen.toFixed(2)} m</span>
            <input type="range" min={0.05} max={0.5} step={0.01} value={armLen} onChange={e => setArmLen(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Tortish koeff. (kt): {kt.toExponential()}</span>
            <input type="range" min={0.5e-6} max={5e-5} step={0.5e-6} value={kt}
              onChange={e => setKt(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Maks. RPM: {maxRpm}</span>
            <input type="range" min={2000} max={30000} step={500} value={maxRpm} onChange={e => setMaxRpm(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Parvrak diametri: {propDia.toFixed(2)} m</span>
            <input type="range" min={0.05} max={0.5} step={0.01} value={propDia} onChange={e => setPropDia(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Batareya sig&apos;imi: {battCap} mAh</span>
            <input type="range" min={500} max={10000} step={100} value={battCap} onChange={e => setBattCap(Number(e.target.value))} />
          </label>

          <button onClick={handleAnalyze} className="mt-2 rounded-xl bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700 transition-colors shadow-md">
            ▶ Hisoblash
          </button>
        </div>

        {result && (
          <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
            <h2 className="font-semibold text-lg">Natijalar</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="text-xs text-amber-600">Hover RPM</div>
                <div className="text-lg font-bold">{result.hover_rpm.toFixed(0)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600">Tortish kuchi</div>
                <div className="text-lg font-bold">{result.thrust_N.toFixed(2)} N</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="text-xs text-red-600">Weight</div>
                <div className="text-lg font-bold">{result.weight_N.toFixed(2)} N</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600">T/W nisbati</div>
                <div className="text-lg font-bold">{result.tw_ratio.toFixed(2)}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-xs text-purple-600">Maks. vertikal tezl.</div>
                <div className="text-lg font-bold">{result.max_vertical_accel_ms2.toFixed(2)} m/s²</div>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                <div className="text-xs text-cyan-600">Batareya muddati</div>
                <div className="text-lg font-bold">{result.battery_life_min.toFixed(1)} min</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
