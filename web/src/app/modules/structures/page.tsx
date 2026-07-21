"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

const TrussBuilder = dynamic(() => import("../../../components/structures-lab/engineering/TrussBuilder"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">Truss quruvchisi yuklanmoqda...</div>,
});

export default function StructuresPage() {
  const [tab, setTab] = useState<"truss" | "beam">("truss");

  return (
    <div className="flex-1 bg-[#080b11] flex flex-col min-h-0">
      <div className="flex gap-1 px-6 pt-4">
        {(["truss", "beam"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-bold cursor-pointer transition-colors ${
              tab === t ? "bg-[#0f1e3d] text-white" : "bg-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "truss" ? "🌉 Truss Builder" : "📐 Beam / Column Calculator"}
          </button>
        ))}
      </div>
      {tab === "truss" ? <TrussBuilder /> : <BeamColumnCalculator />}
    </div>
  );
}

type AnalysisType = "beam" | "column" | "section";

type BeamResult = {
  bending_moment_Nm: number;
  bending_stress_Pa: number;
  deflection_m: number;
  moment_of_inertia_m4: number;
};

type ColumnResult = {
  critical_load_N: number;
  safety_factor: number;
};

type SectionResult = {
  I_rect_m4: number;
  I_circle_m4: number;
};

function BeamColumnCalculator() {
  const [mode, setMode] = useState<AnalysisType>("beam");
  const [force, setForce] = useState(100);
  const [length, setLength] = useState(1);
  const [width, setWidth] = useState(0.05);
  const [height, setHeight] = useState(0.1);
  const [Emod, setEmod] = useState(200);
  
  const [beamResult, setBeamResult] = useState<BeamResult | null>(null);
  const [columnResult, setColumnResult] = useState<ColumnResult | null>(null);
  const [sectionResult, setSectionResult] = useState<SectionResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "structure",
          params: { mode, force, length, width, height, Emod }
        })
      });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      if (mode === "beam") {
        setBeamResult(data);
      } else if (mode === "column") {
        setColumnResult(data);
      } else if (mode === "section") {
        setSectionResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [mode, force, length, width, height, Emod]);

  return (
    <div className="flex-1 bg-[#080b11] overflow-y-auto">
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-2 p-8">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-violet-500 tracking-wider uppercase">Qurilish & Mexanika Laboratoriyasi</span>
        <h1 className="text-3xl font-extrabold text-white">Tuzilmalar (Structures) Tahlili</h1>
        <p className="text-sm text-gray-400 max-w-3xl">
          Egiluvchan balkalar va siqiluvchan ustunlar parametrlarini sozlang. Tizim materiallar qarshiligi (Euler-Bernoulli beam theory hamda Euler buckling) qonuniyatlariga binoan egilish, zo&apos;riqish va tanglik koeffitsientlarini hisoblaydi.
        </p>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start">
        {/* Left Side: Parameters */}
        <div className="w-full lg:w-96 flex flex-col gap-4 glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/60 rounded-2xl p-5 shadow-xl">
          <h2 className="font-bold text-lg text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span>Geometriya & Yuk</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-md">Struktura</span>
            </div>
            
            {/* Mode selection buttons */}
            <div className="flex gap-1.5 p-1 bg-[#090d16] rounded-xl border border-[rgba(255,255,255,0.04)]">
              {(["beam", "column", "section"] as const).map(m => (
                <button 
                  key={m} 
                  onClick={() => { 
                    setMode(m); 
                    setBeamResult(null); 
                    setColumnResult(null); 
                    setSectionResult(null); 
                  }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === m 
                      ? "bg-violet-600 text-white shadow-md" 
                      : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  {m === "beam" ? "Balka" : m === "column" ? "Ustun" : "Kesim"}
                </button>
              ))}
            </div>
          </h2>

          <div className="flex flex-col gap-4 mt-1">
            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Tushayotgan kuch (F)</span>
                <span className="font-mono text-violet-400 font-bold">{force} N</span>
              </div>
              <input type="range" min={10} max={10000} step={10} value={force} onChange={e => setForce(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Uzunlik (L)</span>
                <span className="font-mono text-violet-400 font-bold">{length.toFixed(2)} m</span>
              </div>
              <input type="range" min={0.1} max={5} step={0.05} value={length} onChange={e => setLength(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Kesim eni (b)</span>
                <span className="font-mono text-violet-400 font-bold">{(width * 1000).toFixed(0)} mm</span>
              </div>
              <input type="range" min={0.01} max={0.5} step={0.005} value={width} onChange={e => setWidth(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Kesim balandligi (h)</span>
                <span className="font-mono text-violet-400 font-bold">{(height * 1000).toFixed(0)} mm</span>
              </div>
              <input type="range" min={0.01} max={0.5} step={0.005} value={height} onChange={e => setHeight(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Elastiklik moduli (E)</span>
                <span className="font-mono text-violet-400 font-bold">{Emod} GPa</span>
              </div>
              <input type="range" min={1} max={300} step={1} value={Emod} onChange={e => setEmod(Number(e.target.value))} />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-2 rounded-xl bg-violet-600 px-6 py-3.5 text-white font-extrabold text-sm hover:bg-violet-700 disabled:bg-violet-800 disabled:opacity-50 transition-colors shadow-lg shadow-violet-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Tahlil qilinmoqda...</span>
                </>
              ) : (
                <>
                  <span>▶️ Konstruksiyani tahlillash</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="flex-1 flex flex-col gap-6 min-w-[320px]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-xs text-red-400">
              ❌ Xatolik yuz berdi: {error}
            </div>
          )}

          {/* Column critical warning alert */}
          {mode === "column" && columnResult && columnResult.safety_factor < 1.5 && (
            <div className={`rounded-2xl p-4 text-xs flex flex-col gap-1 shadow-md ${
              columnResult.safety_factor < 1.0 
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse" 
                : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
            }`}>
              <div className="font-bold">
                {columnResult.safety_factor < 1.0 ? "🚨 Ustun siqilish/bukilish (Euler Buckling) falokati!" : "⚠️ Ustunning barqarorlik chegarasi juda kam!"}
              </div>
              <p className="text-gray-400 leading-relaxed">
                Ushbu yuk ostida ustun xavfsizlik chegarasi <span className="font-bold font-mono">{columnResult.safety_factor.toFixed(2)}</span>. 
                Ustun sinmasligi uchun xavfsizlik moduli kamida 1.5-2.0 dan baland bo&apos;lishi tavsiya etiladi. Kesim balandligi yoki enini kattalashtiring.
              </p>
            </div>
          )}

          {/* Beam Results */}
          {mode === "beam" && beamResult && (
            <div className="flex flex-col gap-6">
              <h2 className="font-bold text-lg text-white">Balka egilish tahlillari</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Maks. Egilish momenti</div>
                    <div className="text-xl font-extrabold text-violet-400 font-mono mt-1">{beamResult.bending_moment_Nm.toFixed(1)} N·m</div>
                  </div>
                  <span className="text-xl">🌀</span>
                </div>
                
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Maks. Egilish zo&apos;riqishi</div>
                    <div className="text-xl font-extrabold text-rose-400 font-mono mt-1">{(beamResult.bending_stress_Pa / 1e6).toFixed(2)} MPa</div>
                  </div>
                  <span className="text-xl">💥</span>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Maksimal egilish masofasi</div>
                    <div className="text-xl font-extrabold text-blue-400 font-mono mt-1">{(beamResult.deflection_m * 1000).toFixed(3)} mm</div>
                  </div>
                  <span className="text-xl">📏</span>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Inersiya momenti (I)</div>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">{beamResult.moment_of_inertia_m4.toExponential(3)} m⁴</div>
                  </div>
                  <span className="text-xl">📐</span>
                </div>
              </div>
            </div>
          )}

          {/* Column Results */}
          {mode === "column" && columnResult && (
            <div className="flex flex-col gap-6">
              <h2 className="font-bold text-lg text-white">Ustun bukilish tahlillari</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tangidiy bukilish yuki (P_cr)</div>
                    <div className="text-xl font-extrabold text-rose-400 font-mono mt-1">{columnResult.critical_load_N.toFixed(0)} N</div>
                  </div>
                  <span className="text-xl">📉</span>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Xavfsizlik Koeffitsienti</div>
                    <div className={`text-xl font-extrabold font-mono mt-1 ${columnResult.safety_factor < 1.5 ? "text-rose-400" : "text-emerald-400"}`}>
                      {columnResult.safety_factor.toFixed(2)}
                    </div>
                  </div>
                  <span className="text-xl">🛡️</span>
                </div>
              </div>
            </div>
          )}

          {/* Section Results */}
          {mode === "section" && sectionResult && (
            <div className="flex flex-col gap-6">
              <h2 className="font-bold text-lg text-white">Geometrik inersiya momentlari</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">To&apos;rtburchak kesim I_xx</div>
                  <div className="text-base font-bold text-violet-400 font-mono mt-1">{sectionResult.I_rect_m4.toExponential(4)} m⁴</div>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Doiraviy kesim I_xx (d = {Math.min(width, height).toFixed(3)}m)</div>
                  <div className="text-base font-bold text-blue-400 font-mono mt-1">{sectionResult.I_circle_m4.toExponential(4)} m⁴</div>
                </div>
              </div>
            </div>
          )}

          {!beamResult && !columnResult && !sectionResult && (
            <div className="h-[300px] flex flex-col items-center justify-center glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/30 rounded-3xl text-gray-500 shadow-xl border-dashed">
              <span className="text-4xl animate-bounce mb-3">🏗️</span>
              <span className="text-sm font-semibold">Tahlillash uchun &quot;Konstruksiyani tahlillash&quot; tugmasini bosing.</span>
              <span className="text-xs text-gray-600 mt-1">Koeffitsientlar materiallar qarshiligi tenglamalari asosida hisoblanadi.</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
