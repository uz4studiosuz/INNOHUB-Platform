"use client";

import { useCallback, useState } from "react";

type LabTab = "mechanics" | "electricity" | "waves" | "thermo";

type MechanicsCalc = {
  label: string;
  compute: (v: number, a2: number) => number;
};

type ElectricityCalc = {
  label: string;
  compute: (v: number, a2: number) => number;
};

type WavesCalc = {
  label: string;
  compute: (v: number, a2: number) => number;
};

type ThermoCalc = {
  label: string;
  compute: (v: number, a2: number) => number;
};

const MECHANICS_CALCS: MechanicsCalc[] = [
  { label: "Proyektiliya masofasi (v₀=?, burchak=?)", compute: (v, angle) => v * v * Math.sin(2 * angle * Math.PI / 180) / 9.81 },
  { label: "Kinetik energiya (m=?, v=?)", compute: (m, v) => 0.5 * m * v * v },
  { label: "Potensial energiya (m=?, h=?)", compute: (m, h) => m * 9.81 * h },
  { label: "Markazga intilma kuch (m=?, v=?, r=1)", compute: (m, v) => m * v * v },
];

const ELECTRICITY_CALCS: ElectricityCalc[] = [
  { label: "Ohm qonuni I (V=?, R=?)", compute: (v, r) => v / r },
  { label: "Quvvat (V=?, I=?)", compute: (v, i) => v * i },
  { label: "RC vaqt doimiysi (R=?, C=1e-6)", compute: (r, _) => r * 1e-6 },
  { label: "Kondensator zaryadi (V=5, R=?, t=1e-3)", compute: (r, _) => 5 * (1 - Math.exp(-0.001 / (r * 1e-6))) },
];

const WAVES_CALCS: WavesCalc[] = [
  { label: "To'lqin tezligi (f=?, λ=?)", compute: (f, lam) => f * lam },
  { label: "Mayatnik davri (L=?, g=9.81)", compute: (L, _) => 2 * Math.PI * Math.sqrt(L / 9.81) },
  { label: "Prujina chastotasi (k=?, m=1)", compute: (k, _) => Math.sqrt(k) / (2 * Math.PI) },
  { label: "Tovush intensivligi (P=1, r=?)", compute: (_, r) => 1 / (4 * Math.PI * r * r) },
];

const THERMO_CALCS: ThermoCalc[] = [
  { label: "Issiqlik energiyasi (m=1, c=4186, ΔT=?)", compute: (_, dT) => 1 * 4186 * dT },
  { label: "Ideal gaz P (n=1, T=300, V=?)", compute: (_, V) => 1 * 8.314 * 300 / V },
  { label: "Karno samaradorligi (Th=?, Tc=300)", compute: (Th, _) => 1 - 300 / Th },
  { label: "Issiqlik o'tkazuvchanlik (k=1, A=1, ΔT=10, d=?)", compute: (_, d) => 1 * 1 * 10 / d },
];

export default function PhysicsLabPage() {
  const [tab, setTab] = useState<LabTab>("mechanics");
  const [val1, setVal1] = useState(10);
  const [val2, setVal2] = useState(45);
  const [calcIndex, setCalcIndex] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const calcs = tab === "mechanics" ? MECHANICS_CALCS
    : tab === "electricity" ? ELECTRICITY_CALCS
    : tab === "waves" ? WAVES_CALCS
    : THERMO_CALCS;

  const handleCompute = useCallback(() => {
    const c = calcs[calcIndex];
    if (!c) return;
    setResult(c.compute(val1, val2));
  }, [tab, calcIndex, val1, val2, calcs]);

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Fizika Laboratoriyasi</h1>
      <p className="text-gray-600 max-w-2xl">
        Fizik kattaliklarni hisoblang. Manbalar: Halliday Resnick - Fundamentals of Physics.
      </p>

      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-4 min-w-[280px] bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h2 className="font-semibold text-lg">Laboratoriya</h2>

          <div className="flex gap-2 flex-wrap">
            {(["mechanics", "electricity", "waves", "thermo"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setCalcIndex(0); setResult(null); }}
                className={`px-3 py-1 rounded text-sm font-medium ${tab === t ? "bg-lime-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                {t === "mechanics" ? "Mexanika" : t === "electricity" ? "Elektr" : t === "waves" ? "To'lqinlar" : "Termo"}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Formula</span>
            <select value={calcIndex} onChange={e => { setCalcIndex(Number(e.target.value)); setResult(null); }}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              {calcs.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">1-parametr: {val1}</span>
            <input type="range" min={1} max={500} step={1} value={val1} onChange={e => setVal1(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">2-parametr: {val2}</span>
            <input type="range" min={1} max={500} step={1} value={val2} onChange={e => setVal2(Number(e.target.value))} />
          </label>

          <button onClick={handleCompute} className="mt-2 rounded-xl bg-lime-600 px-6 py-3 text-white font-semibold hover:bg-lime-700 transition-colors shadow-md">
            ▶ Hisoblash
          </button>
        </div>

        <div className="flex-1 min-w-[320px]">
          {result !== null && (
            <div className="bg-lime-50 rounded-xl p-6 border border-lime-200">
              <h2 className="font-semibold text-lg mb-2">Natija</h2>
              <div className="text-3xl font-bold text-lime-700">{result.toFixed(4)}</div>
              <div className="text-sm text-gray-500 mt-2">
                {tab === "mechanics" && "Mexanik kattalik"}
                {tab === "electricity" && "Elektr kattalik"}
                {tab === "waves" && "To'lqin/tebranish kattalik"}
                {tab === "thermo" && "Termodinamik kattalik"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
