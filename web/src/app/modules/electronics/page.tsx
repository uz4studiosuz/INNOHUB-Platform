"use client";

import { useCallback, useState } from "react";

type BreadboardResult = {
  voltage_drops: number[];
  currents: number[];
  total_resistance: number;
  led_resistor_ohm: number;
};

export default function ElectronicsPage() {
  const [supplyV, setSupplyV] = useState(9);
  const [r1, setR1] = useState(1000);
  const [r2, setR2] = useState(2000);
  const [ledV, setLedV] = useState(2.2);
  const [ledI, setLedI] = useState(0.02);
  const [result, setResult] = useState<BreadboardResult | null>(null);
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
          module: "circuit",
          params: { supplyV, r1, r2, ledV, ledI }
        })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [supplyV, r1, r2, ledV, ledI]);

  // Calculate actual LED current in the series circuit
  // I = (V_supply - V_led) / (R_total)
  const totalR = r1 + r2;
  const actualLedI = Math.max(0, (supplyV - ledV) / totalR);
  const isLedBurned = actualLedI > ledI * 1.5; // Burn if actual current is 50% higher than max current

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-emerald-500 tracking-wider uppercase">Elektrotexnika Laboratoriyasi</span>
        <h1 className="text-3xl font-extrabold text-white">Elektronika: Breadboard Simulyatsiyasi</h1>
        <p className="text-sm text-gray-400 max-w-3xl">
          Kuchlanish bo&apos;luvchi zanjir parametrlarini va LED nominal ko&apos;rsatkichlarini sozlang. Tizim Ohm qonuni hamda KCL tugunlar tahlili (Nodal Analysis) yordamida har bir elementdagi tok va kuchlanish tushishini aniqlaydi.
        </p>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start">
        {/* Left Side: Parameters */}
        <div className="w-full lg:w-96 flex flex-col gap-4 glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/60 rounded-2xl p-5 shadow-xl">
          <h2 className="font-bold text-lg text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center justify-between">
            <span>Sxema parametrlari</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">Zanjir</span>
          </h2>

          <div className="flex flex-col gap-4 mt-2">
            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Ta&apos;minot kuchlanishi</span>
                <span className="font-mono text-emerald-400 font-bold">{supplyV} V</span>
              </div>
              <input type="range" min={1} max={24} step={0.5} value={supplyV} onChange={e => setSupplyV(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>R1 qarshilik</span>
                <span className="font-mono text-emerald-400 font-bold">{r1} Ω</span>
              </div>
              <input type="range" min={100} max={10000} step={100} value={r1} onChange={e => setR1(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>R2 qarshilik</span>
                <span className="font-mono text-emerald-400 font-bold">{r2} Ω</span>
              </div>
              <input type="range" min={100} max={10000} step={100} value={r2} onChange={e => setR2(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>LED to&apos;g&apos;ri kuchlanishi (V_f)</span>
                <span className="font-mono text-emerald-400 font-bold">{ledV.toFixed(1)} V</span>
              </div>
              <input type="range" min={1} max={5} step={0.1} value={ledV} onChange={e => setLedV(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>LED maksimal toki (I_max)</span>
                <span className="font-mono text-emerald-400 font-bold">{(ledI * 1000).toFixed(0)} mA</span>
              </div>
              <input type="range" min={5} max={50} step={1} value={ledI * 1000} onChange={e => setLedI(Number(e.target.value) / 1000)} />
            </label>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-white font-extrabold text-sm hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Hisoblanmoqda...</span>
                </>
              ) : (
                <>
                  <span>▶️ Sxemani tahlil qilish</span>
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

          {result && isLedBurned && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl p-4 text-xs flex flex-col gap-1 shadow-md animate-pulse">
              <div className="font-bold flex items-center gap-2">
                <span>🚨</span>
                <span>LED KUIB KETISH XAVFI!</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Zanjirdagi oqayotgan tok (<span className="font-bold font-mono text-rose-400">{(actualLedI * 1000).toFixed(1)} mA</span>) LED ning maksimal ruxsat etilgan toki (<span className="font-bold font-mono text-white">{(ledI * 1000).toFixed(0)} mA</span>) dan ancha yuqori. R1/R2 qarshiligini oshiring.
              </p>
            </div>
          )}

          {result ? (
            <div className="flex flex-col gap-6">
              <h2 className="font-bold text-lg text-white">Tahlil natijalari</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">R1 dagi kuchlanish tushishi</div>
                    <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{result.voltage_drops[0]?.toFixed(2) ?? 0} V</div>
                  </div>
                  <span className="text-xl">📉</span>
                </div>
                
                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">R2 dagi kuchlanish tushishi</div>
                    <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">{result.voltage_drops[1]?.toFixed(2) ?? 0} V</div>
                  </div>
                  <span className="text-xl">📉</span>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Zanjirdagi umumiy tok</div>
                    <div className="text-xl font-extrabold text-blue-400 font-mono mt-1">{(result.currents[0] * 1000).toFixed(1)} mA</div>
                  </div>
                  <span className="text-xl">⚡</span>
                </div>

                <div className="bg-[#0f1524]/60 border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 shadow-md flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Umumiy qarshilik (R_total)</div>
                    <div className="text-xl font-extrabold text-violet-400 font-mono mt-1">{result.total_resistance} Ω</div>
                  </div>
                  <span className="text-xl">⚙️</span>
                </div>
              </div>

              {/* Recommended LED series resistor card */}
              <div className="glass-panel border border-[rgba(255,255,255,0.06)] bg-emerald-500/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
                  💡
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold">Tavsiya etilgan LED ketma-ket rezistori</div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {result.led_resistor_ohm.toFixed(0)} Ω
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">LED to&apos;g&apos;ri tokini {ledI * 1000}mA da ushlab turish uchun zarur rezistor.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center glass-panel border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/30 rounded-3xl text-gray-500 shadow-xl border-dashed">
              <span className="text-4xl animate-bounce mb-3">🔌</span>
              <span className="text-sm font-semibold">Tahlil qilish uchun &quot;Sxemani tahlil qilish&quot; tugmasini bosing.</span>
              <span className="text-xs text-gray-600 mt-1">Kuchlanishlar va toklar real vaqtda hisoblanadi.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
