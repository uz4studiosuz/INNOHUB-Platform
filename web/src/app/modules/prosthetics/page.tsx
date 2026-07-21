"use client";

import { useCallback, useState } from "react";

const MATERIALS = [
  { id: "aluminum_6061", name: "Alyuminiy 6061", E: 68.9, density: 2700, yield: 276 },
  { id: "carbon_fiber", name: "Uglerod tolasi", E: 230, density: 1600, yield: 3500 },
  { id: "steel_304", name: "Po'lat 304", E: 193, density: 8000, yield: 215 },
  { id: "titanium_ti6al4v", name: "Titan Ti6Al4V", E: 114, density: 4430, yield: 880 },
  { id: "plastic_abs", name: "ABS plastik", E: 2.3, density: 1040, yield: 40 },
];

type ProstheticResult = {
  joint_torque_Nm: number;
  actuator_required_torque_Nm: number;
  mechanical_advantage: number;
  stress_Pa: number;
  safety_factor: number;
  grip_force_N: number;
  battery_life_hours: number;
  material: string;
};

export default function ProstheticsPage() {
  const [limbMass, setLimbMass] = useState(2);
  const [limbLen, setLimbLen] = useState(0.3);
  const [angle, setAngle] = useState(30);
  const [loadN, setLoadN] = useState(50);
  const [momentArm, setMomentArm] = useState(0.05);
  const [area, setArea] = useState(1e-4);
  const [matId, setMatId] = useState("aluminum_6061");
  const [actuatorN, setActuatorN] = useState(100);
  const [linkRatio, setLinkRatio] = useState(0.5);
  const [battAh, setBattAh] = useState(2);
  const [battA, setBattA] = useState(0.5);
  const [result, setResult] = useState<ProstheticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "prosthetic",
          params: {
            limbMass, limbLength: limbLen, angleDeg: angle, loadForce: loadN,
            momentArm, crossSectionArea: area, material: matId,
            actuatorForce: actuatorN, linkageRatio: linkRatio,
            batteryCapacityAh: battAh, currentDrawA: battA,
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
  }, [limbMass, limbLen, angle, loadN, momentArm, area, matId, actuatorN, linkRatio, battAh, battA]);

  return (
    <div className="flex flex-col min-h-screen p-6 gap-6">
      <h1 className="text-3xl font-bold">Protez Tahlili</h1>
      <p className="text-gray-600 max-w-2xl">
        Protez bo&apos;g&apos;im momenti, aktualtor kuchi, material tanlovi va batareya muddatini hisoblang.
        Manbalar: Winter - Biomechanics, Norton - Design of Machinery.
      </p>

      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-4 min-w-[280px] bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h2 className="font-semibold text-lg">Parametrlar</h2>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Qo&apos;l/oyoq massasi: {limbMass.toFixed(1)} kg</span>
            <input type="range" min={0.5} max={10} step={0.1} value={limbMass} onChange={e => setLimbMass(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Bo&apos;g&apos;im uzunligi: {limbLen.toFixed(2)} m</span>
            <input type="range" min={0.05} max={0.5} step={0.01} value={limbLen} onChange={e => setLimbLen(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Burchak: {angle}°</span>
            <input type="range" min={0} max={90} step={1} value={angle} onChange={e => setAngle(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Yuk kuchi: {loadN} N</span>
            <input type="range" min={5} max={500} step={5} value={loadN} onChange={e => setLoadN(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Moment yelkasi: {(momentArm * 1000).toFixed(0)} mm</span>
            <input type="range" min={0.01} max={0.2} step={0.005} value={momentArm} onChange={e => setMomentArm(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Kesim yuzasi: {(area * 1e6).toFixed(1)} mm²</span>
            <input type="range" min={0.00002} max={0.001} step={0.00001} value={area} onChange={e => setArea(Number(e.target.value))} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Material</span>
            <select value={matId} onChange={e => setMatId(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
              {MATERIALS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Aktuator kuchi: {actuatorN} N</span>
            <input type="range" min={10} max={500} step={10} value={actuatorN} onChange={e => setActuatorN(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Bog&apos;lanish nisbati: {linkRatio.toFixed(2)}</span>
            <input type="range" min={0.1} max={1} step={0.05} value={linkRatio} onChange={e => setLinkRatio(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Batareya sig&apos;imi: {battAh.toFixed(1)} Ah</span>
            <input type="range" min={0.5} max={10} step={0.5} value={battAh} onChange={e => setBattAh(Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Tok iste&apos;moli: {battA.toFixed(2)} A</span>
            <input type="range" min={0.1} max={5} step={0.1} value={battA} onChange={e => setBattA(Number(e.target.value))} />
          </label>

          <button onClick={handleCalc} disabled={loading} className="mt-2 rounded-xl bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-md">
            {loading ? "Hisoblanmoqda..." : "▶ Hisoblash"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 min-w-[320px]">
            ❌ Xatolik: {error}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4 flex-1 min-w-[320px]">
            <h2 className="font-semibold text-lg">Natijalar</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                <div className="text-xs text-teal-600">Bo&apos;g&apos;im momenti</div>
                <div className="text-lg font-bold">{result.joint_torque_Nm.toFixed(3)} N·m</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-orange-600">Aktualtor momenti</div>
                <div className="text-lg font-bold">{result.actuator_required_torque_Nm.toFixed(3)} N·m</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="text-xs text-red-600">Zo&apos;riqish</div>
                <div className="text-lg font-bold">{(result.stress_Pa / 1e6).toFixed(2)} MPa</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600">Xavfsizlik koeff.</div>
                <div className="text-lg font-bold">{result.safety_factor.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600">Tutish kuchi</div>
                <div className="text-lg font-bold">{result.grip_force_N.toFixed(1)} N</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-xs text-purple-600">Batareya muddati</div>
                <div className="text-lg font-bold">{result.battery_life_hours.toFixed(1)} soat</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
