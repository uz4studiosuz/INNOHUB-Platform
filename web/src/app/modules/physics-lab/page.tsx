"use client";

import { useCallback, useMemo, useState } from "react";
import { logIteration } from "../../../store/iterationStore";

type LabTab = "mechanics" | "electricity" | "waves" | "thermo";

type FieldSpec = {
  key: string;
  label: string;
  default: number;
  step?: number;
  unit?: string;
};

type ExperimentSpec = {
  key: string;
  label: string;
  fields: FieldSpec[];
};

const LAB_EXPERIMENTS: Record<LabTab, ExperimentSpec[]> = {
  mechanics: [
    { key: "projectile", label: "Snaryad harakati", fields: [
      { key: "v0", label: "Boshlang'ich tezlik", default: 20, unit: "m/s" },
      { key: "angleDeg", label: "Otish burchagi", default: 45, unit: "°" },
    ]},
    { key: "collision", label: "To'qnashuv (elastik)", fields: [
      { key: "m1", label: "1-jism massasi", default: 1, unit: "kg" },
      { key: "v1", label: "1-jism tezligi", default: 5, unit: "m/s" },
      { key: "m2", label: "2-jism massasi", default: 1, unit: "kg" },
      { key: "v2", label: "2-jism tezligi", default: 0, unit: "m/s" },
    ]},
    { key: "spring_oscillator", label: "Prujina tebranishi", fields: [
      { key: "mass", label: "Massa", default: 1, unit: "kg" },
      { key: "k", label: "Prujina qattiqligi", default: 50, unit: "N/m" },
      { key: "amplitude", label: "Amplituda", default: 0.1, step: 0.01, unit: "m" },
    ]},
    { key: "pendulum", label: "Mayatnik davri", fields: [
      { key: "length", label: "Uzunlik", default: 1, step: 0.1, unit: "m" },
    ]},
    { key: "centripetal", label: "Markazga intilma kuch", fields: [
      { key: "mass", label: "Massa", default: 1, unit: "kg" },
      { key: "velocity", label: "Tezlik", default: 5, unit: "m/s" },
      { key: "radius", label: "Radius", default: 1, unit: "m" },
    ]},
    { key: "energy", label: "Kinetik / Potensial energiya", fields: [
      { key: "mass", label: "Massa", default: 1, unit: "kg" },
      { key: "velocity", label: "Tezlik", default: 5, unit: "m/s" },
      { key: "height", label: "Balandlik", default: 2, unit: "m" },
    ]},
  ],
  electricity: [
    { key: "ohms_law", label: "Om qonuni (I = V/R)", fields: [
      { key: "voltage", label: "Kuchlanish", default: 9, unit: "V" },
      { key: "resistance", label: "Qarshilik", default: 100, unit: "Ω" },
    ]},
    { key: "induction", label: "Elektromagnit induksiya", fields: [
      { key: "turns", label: "O'ramlar soni", default: 100 },
      { key: "deltaFlux", label: "Oqim o'zgarishi", default: 0.001, step: 0.0001, unit: "Wb" },
      { key: "deltaTime", label: "Vaqt o'zgarishi", default: 0.1, step: 0.01, unit: "s" },
    ]},
    { key: "rc_circuit", label: "RC zanjiri", fields: [
      { key: "resistance", label: "Qarshilik", default: 1000, unit: "Ω" },
      { key: "capacitance", label: "Sig'im", default: 0.000001, step: 0.0000001, unit: "F" },
      { key: "voltage", label: "Kuchlanish", default: 5, unit: "V" },
      { key: "time", label: "Vaqt", default: 0.001, step: 0.0001, unit: "s" },
    ]},
  ],
  waves: [
    { key: "wave_properties", label: "To'lqin tezligi", fields: [
      { key: "frequency", label: "Chastota", default: 50, unit: "Hz" },
      { key: "wavelength", label: "To'lqin uzunligi", default: 2, step: 0.1, unit: "m" },
    ]},
    { key: "pendulum", label: "Mayatnik davri", fields: [
      { key: "length", label: "Uzunlik", default: 1, step: 0.1, unit: "m" },
    ]},
    { key: "spring_mass", label: "Prujina-massa tizimi", fields: [
      { key: "mass", label: "Massa", default: 1, unit: "kg" },
      { key: "k", label: "Prujina qattiqligi", default: 50, unit: "N/m" },
    ]},
    { key: "doppler", label: "Dopler effekti", fields: [
      { key: "sourceFreq", label: "Manba chastotasi", default: 440, unit: "Hz" },
      { key: "sourceSpeed", label: "Manba tezligi", default: 30, unit: "m/s" },
    ]},
  ],
  thermo: [
    { key: "heat_energy", label: "Issiqlik energiyasi", fields: [
      { key: "mass", label: "Massa", default: 1, unit: "kg" },
      { key: "specificHeat", label: "Solishtirma issiqlik", default: 4186, unit: "J/kg·K" },
      { key: "tempChange", label: "Harorat o'zgarishi", default: 10, unit: "K" },
    ]},
    { key: "ideal_gas", label: "Ideal gaz bosimi", fields: [
      { key: "volume", label: "Hajm", default: 0.024, step: 0.001, unit: "m³" },
      { key: "moles", label: "Mol miqdori", default: 1, unit: "mol" },
      { key: "temp", label: "Harorat", default: 300, unit: "K" },
    ]},
    { key: "heat_engine", label: "Issiqlik dvigateli / Karno", fields: [
      { key: "workOutput", label: "Chiqish ishi", default: 400, unit: "J" },
      { key: "heatInput", label: "Kiruvchi issiqlik", default: 1000, unit: "J" },
      { key: "hotTemp", label: "Issiq manba harorati", default: 500, unit: "K" },
      { key: "coldTemp", label: "Sovuq manba harorati", default: 300, unit: "K" },
    ]},
  ],
};

const RESULT_LABELS: Record<string, string> = {
  speed_ms: "Tezlik (m/s)",
  range: "Masofa (m)",
  max_height: "Maks. balandlik (m)",
  time_of_flight: "Parvoz vaqti (s)",
  v1f: "1-jism yakuniy tezligi (m/s)",
  v2f: "2-jism yakuniy tezligi (m/s)",
  ke_before: "Boshlang'ich kinetik energiya (J)",
  ke_after: "Yakuniy kinetik energiya (J)",
  ke_loss: "Yo'qotilgan energiya (J)",
  period_s: "Davr (s)",
  frequency_hz: "Chastota (Hz)",
  omega_rad_s: "Burchak chastotasi (rad/s)",
  angular_frequency_rad_s: "Burchak chastotasi (rad/s)",
  max_velocity_ms: "Maks. tezlik (m/s)",
  max_acceleration_ms2: "Maks. tezlanish (m/s²)",
  max_force_N: "Maks. kuch (N)",
  total_energy_J: "Umumiy energiya (J)",
  force_N: "Kuch (N)",
  kinetic_energy_J: "Kinetik energiya (J)",
  potential_energy_J: "Potensial energiya (J)",
  current_A: "Tok kuchi (A)",
  voltage_V: "Kuchlanish (V)",
  resistance_ohm: "Qarshilik (Ω)",
  emf_V: "EYuK (V)",
  tau_s: "Vaqt doimiysi (s)",
  capacitor_voltage_V: "Kondensator kuchlanishi (V)",
  wavelength_m: "To'lqin uzunligi (m)",
  observed_freq_hz: "Kuzatilgan chastota (Hz)",
  heat_J: "Issiqlik (J)",
  pressure_Pa: "Bosim (Pa)",
  volume_m3: "Hajm (m³)",
  efficiency: "Samaradorlik",
  carnot_max_efficiency: "Karno maks. samaradorligi",
};

function formatResultKey(key: string): string {
  return RESULT_LABELS[key] ?? key;
}

function formatResultValue(value: number): string {
  if (Math.abs(value) !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) > 100000)) {
    return value.toExponential(3);
  }
  return value.toFixed(4);
}

export default function PhysicsLabPage() {
  const [tab, setTab] = useState<LabTab>("mechanics");
  const [expIndex, setExpIndex] = useState(0);
  const [values, setValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    LAB_EXPERIMENTS.mechanics[0].fields.forEach(f => { defaults[f.key] = f.default; });
    return defaults;
  });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const experiments = LAB_EXPERIMENTS[tab];
  const experiment = experiments[expIndex] ?? experiments[0];

  const resetForExperiment = useCallback((exp: ExperimentSpec) => {
    const defaults: Record<string, number> = {};
    exp.fields.forEach(f => { defaults[f.key] = f.default; });
    setValues(defaults);
    setResult(null);
    setError(null);
  }, []);

  const resultEntries = useMemo(() => {
    if (!result) return [];
    return Object.entries(result).filter(([, v]) => typeof v === "number");
  }, [result]);

  const handleCompute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "physics_lab",
          params: { lab: tab, experiment: experiment.key, ...values },
        }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult(data);
      const firstNumeric = Object.entries(data).find(([, v]) => typeof v === "number") as [string, number] | undefined;
      if (firstNumeric) {
        logIteration(
          "physics-lab",
          { lab: tab, experiment: experiment.key, ...values },
          { label: formatResultKey(firstNumeric[0]), value: firstNumeric[1] }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [tab, experiment, values]);

  return (
    <div className="flex-1 bg-[#080b11] overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto py-8 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">Fizika Laboratoriyasi</h1>
          <p className="text-slate-400 max-w-2xl mt-2">
            Fizik kattaliklarni hisoblang. Manba: Halliday Resnick — Fundamentals of Physics.
          </p>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="flex flex-col gap-4 min-w-[280px] bg-[#0a0e18] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]">
            <h2 className="font-semibold text-lg">Laboratoriya</h2>

            <div className="flex gap-2 flex-wrap">
              {(["mechanics", "electricity", "waves", "thermo"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setExpIndex(0); resetForExperiment(LAB_EXPERIMENTS[t][0]); }}
                  className={`px-3 py-1 rounded text-sm font-medium cursor-pointer ${tab === t ? "bg-lime-600 text-white" : "bg-[#141a2b] text-slate-300 border border-[rgba(255,255,255,0.1)]"}`}>
                  {t === "mechanics" ? "Mexanika" : t === "electricity" ? "Elektr" : t === "waves" ? "To'lqinlar" : "Termo"}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">Tajriba</span>
              <select value={expIndex} onChange={e => { const i = Number(e.target.value); setExpIndex(i); resetForExperiment(experiments[i]); }}
                className="border border-[rgba(255,255,255,0.15)] bg-[#0a0e18] rounded px-2 py-1 text-sm">
                {experiments.map((exp, i) => <option key={exp.key} value={i}>{exp.label}</option>)}
              </select>
            </label>

            {experiment.fields.map(f => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-sm text-slate-400">{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                <input
                  type="number"
                  step={f.step ?? 1}
                  value={values[f.key] ?? f.default}
                  onChange={e => setValues(v => ({ ...v, [f.key]: Number(e.target.value) }))}
                  className="border border-[rgba(255,255,255,0.15)] bg-[#0a0e18] rounded px-2 py-1 text-sm"
                />
              </label>
            ))}

            <button onClick={handleCompute} disabled={loading} className="mt-2 rounded-xl bg-lime-600 px-6 py-3 text-white font-semibold hover:bg-lime-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer">
              {loading ? "Hisoblanmoqda..." : "▶ Hisoblash"}
            </button>
          </div>

          <div className="flex-1 min-w-[320px] flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                ❌ Xatolik: {error}
              </div>
            )}

            {resultEntries.length > 0 && (
              <div className="bg-lime-500/10 rounded-xl p-6 border border-lime-500/30">
                <h2 className="font-semibold text-lg mb-4">Natijalar</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resultEntries.map(([key, value]) => (
                    <div key={key} className="bg-[#0a0e18] rounded-lg p-3 border border-lime-500/20">
                      <div className="text-xs text-lime-400">{formatResultKey(key)}</div>
                      <div className="text-lg font-bold text-white">{formatResultValue(value as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
