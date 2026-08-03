"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { loadTrussDesign, TrussDesign } from "../../../../store/trussDesignStore";
import { buildTrussApiParams, GRID_SIZE, UNIT_METERS } from "../../../../components/structures-lab/engineering/trussApiParams";
import { SolvedMember } from "../../../../components/structures-lab/engineering/types";
import { addBridgeResult, getBridgeResults } from "../../../../store/bridgeLeaderboardStore";
import { useHasMounted } from "../../../../lib/useHasMounted";
import { computeStability, stabilityErrorMessage } from "../../../../components/structures-lab/engineering/trussStability";
import { VEHICLE_PRESETS, vehicleById, vehicleLoadN } from "../../../../components/structures-lab/engineering/trussVehicles";
import { IconAlertTriangle, IconBox, IconMaximize, IconRulerMeasure, IconSettings, IconTruck, IconTrophy } from "@tabler/icons-react";

const TrussCanvas = dynamic(() => import("../../../../components/structures-lab/engineering/TrussCanvas"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">Canvas yuklanmoqda...</div>,
});

const TrussRally3D = dynamic(() => import("../../../../components/structures-lab/engineering/TrussRally3D"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">3D sinov maydoni yuklanmoqda...</div>,
});

interface LoadTestMember {
  force_N: number;
  stress_Pa: number;
  in_tension: boolean;
  isBuckling: boolean;
  memberFailureLoadN: number;
}

interface LoadTestResult {
  failureLoadN: number;
  structureMassKg: number;
  efficiency: number;
  failingMemberIndex: number | null;
  members: LoadTestMember[];
}

const ANIMATION_MS = 2600;

function materialLabelFor(design: TrussDesign): string {
  const labels = new Set(design.members.map((m) => m.materialLabel));
  return labels.size === 1 ? [...labels][0] : "Aralash material";
}

export default function StructuresCompetitionPage() {
  // localStorage doesn't exist during SSR, so both are read directly from
  // the store only once the client has actually mounted (hasMounted flips
  // true post-hydration). Before that, design/leaderboard stay at their
  // SSR-safe defaults so the server and the client's first render match -
  // reading them eagerly would trigger a hydration mismatch. Re-deriving
  // on every render (rather than caching in state) also means the
  // leaderboard automatically reflects a just-added result on the very
  // next re-render, with no extra state to keep in sync.
  const hasMounted = useHasMounted();
  const design: TrussDesign | null = hasMounted ? loadTrussDesign() : null;
  const leaderboard = hasMounted ? getBridgeResults() : [];

  const [result, setResult] = useState<LoadTestResult | null>(null);
  const [solvedMap, setSolvedMap] = useState<Map<string, SolvedMember> | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truckX, setTruckX] = useState(0);
  const [displayLoad, setDisplayLoad] = useState(0);
  const [gaugeMaxN, setGaugeMaxN] = useState(1200);
  const [view, setView] = useState<"2d" | "3d">("2d");
  // O'tadigan transport: turi tayyor ro'yxatdan, og'irligini esa qo'lda ham
  // kiritish mumkin. Og'irlik haqiqiy yuk sifatida ishlatiladi (m·g), ya'ni
  // "shu mashina o'ta oladimi?" degan savolga aniq javob beradi.
  const [vehicleId, setVehicleId] = useState(VEHICLE_PRESETS[0].id);
  const [customMassKg, setCustomMassKg] = useState<number | null>(null);
  const [vehicleScaledDown, setVehicleScaledDown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const animRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewportRef.current?.requestFullscreen();
    }
  }, []);

  const hasDesign = !!design && design.nodes.length >= 2 && design.members.length >= 1;

  const handleTest = useCallback(async () => {
    if (!design) return;
    const stabilityError = stabilityErrorMessage(computeStability(design.nodes, design.members));
    if (stabilityError) {
      setError(stabilityError);
      return;
    }
    setTesting(true);
    setError(null);
    setResult(null);
    setSolvedMap(null);
    setTruckX(0);
    setDisplayLoad(0);
    setGaugeMaxN(1200);

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "truss_loadtest",
          params: buildTrussApiParams(design.nodes, design.members),
        }),
      });
      const data: LoadTestResult & { error?: string } = await response.json();
      if (data.error) {
        setError(data.error);
        setTesting(false);
        return;
      }
      setGaugeMaxN(Math.max(data.failureLoadN * 1.15, 200));

      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / ANIMATION_MS);
        setTruckX(p * 100);
        setDisplayLoad(p * data.failureLoadN);

        if (p < 1) {
          animRef.current = requestAnimationFrame(step);
          return;
        }

        const map = new Map<string, SolvedMember>();
        design.members.forEach((m, i) => {
          const mr = data.members[i];
          if (!mr) return;
          const isFailing = i === data.failingMemberIndex;
          map.set(m.id, {
            id: m.id,
            nodeA: m.nodeA,
            nodeB: m.nodeB,
            forceN: mr.force_N,
            stressPa: mr.stress_Pa,
            safetyFactor: isFailing ? 0.5 : (data.failureLoadN > 0 ? mr.memberFailureLoadN / data.failureLoadN : 1),
            inTension: mr.in_tension,
          });
        });
        setSolvedMap(map);
        setResult(data);
        setTesting(false);

        addBridgeResult({
          designName: design.name,
          material: materialLabelFor(design),
          massKg: data.structureMassKg,
          failureLoadN: data.failureLoadN,
          efficiency: data.efficiency,
        });
      };
      animRef.current = requestAnimationFrame(step);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      setTesting(false);
    }
  }, [design]);

  const rankedLeaderboard = [...leaderboard].sort((a, b) => b.efficiency - a.efficiency);

  const failingMember = result && result.failingMemberIndex !== null ? result.members[result.failingMemberIndex] : null;

  /** TrussCanvas re-centres (and re-scales) whenever this token changes, so a
   * design opened here lands in the middle of the viewport instead of wherever
   * its raw canvas coordinates happen to be. Bumping it on every switch back to
   * 2D also re-fits after the canvas has been remounted at a new size. */
  const [fitToken, setFitToken] = useState(1);
  const showView = useCallback((next: "2d" | "3d") => {
    setView(next);
    // Switching back to 2D remounts the canvas at whatever size the viewport
    // now has, so ask for a fresh fit rather than reusing the old offset.
    if (next === "2d") setFitToken((n) => n + 1);
  }, []);

  // Ko'prik oralig'i (metrda) — chizmadagi piksellar emas, haqiqiy o'lchov.
  const spanMeters = useMemo(() => {
    if (!design || design.nodes.length < 2) return 0;
    const xs = design.nodes.map((n) => n.x);
    return ((Math.max(...xs) - Math.min(...xs)) / GRID_SIZE) * UNIT_METERS;
  }, [design]);

  const basePreset = vehicleById(vehicleId);
  const activeMassKg = customMassKg ?? basePreset.massKg;
  const vehicle = { ...basePreset, massKg: activeMassKg };
  const vehicleN = vehicleLoadN(activeMassKg);

  /**
   * Sinov natijasini tanlangan transport bilan solishtiradi.
   *
   * Solver ko'prikning sinish yukini (N) beradi; mashinaning og'irligi ham
   * kuchda o'lchanadi (m·g). Ikkalasining nisbati — zaxira koeffitsienti:
   * 1 dan katta bo'lsa mashina o'tadi, kichik bo'lsa ko'prik sinadi.
   */
  const verdict = result
    ? {
        passes: result.failureLoadN >= vehicleN,
        safety: vehicleN > 0 ? result.failureLoadN / vehicleN : 0,
      }
    : null;

  const statusChip = testing ? (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/15 border border-violet-500/30 text-violet-200">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      {displayLoad.toFixed(0)} N
    </span>
  ) : result ? (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/12 border border-emerald-500/30 text-emerald-300">
      Samaradorlik {result.efficiency.toFixed(1)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 border border-[rgba(255,255,255,0.1)] text-slate-400">
      Sinovga tayyor
    </span>
  );

  if (!hasDesign) {
    return (
      <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto flex items-center justify-center">
        <div className="text-center max-w-lg">
          <IconTrophy size={42} stroke={1.6} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Competition — Monster Truck Rally</h1>
          <p className="text-slate-400 text-sm mb-4">
            Hali ko&apos;prik qurilmagan. Avval ENGINEERING tab&apos;ida kamida 2 ta tugun, 1 ta a&apos;zo
            va tayanch bilan ko&apos;prik quring, so&apos;ng bu yerga qayting.
          </p>
          <Link
            href="/modules/structures"
            className="inline-block px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700"
          >
            <IconSettings size={16} stroke={1.8} /> Engineering&apos;ga o&apos;tish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080b11] text-white">
      {/* Header: kim, nima bilan, qaysi holatda — uch qatorga bo'linmagan,
          bitta chiziqda o'qiladigan qilib. */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#0a0e18]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/30 shrink-0">
            <IconTrophy size={21} stroke={1.8} className="text-violet-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">Monster Truck Rally</h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="truncate max-w-[220px] text-white font-semibold">{design!.name}</span>
              <span className="text-slate-600">·</span>
              <span>{materialLabelFor(design!)}</span>
              <span className="text-slate-600">·</span>
              <span>{design!.members.length} a&apos;zo / {design!.nodes.length} tugun</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusChip}
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 cursor-pointer shadow-lg shadow-violet-900/40 transition-colors"
          >
            <IconTruck size={17} stroke={1.8} />
            {testing ? "Sinov ketmoqda…" : result ? "Qayta sinash" : "Sinovni boshlash"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div ref={viewportRef} className="flex-1 flex flex-col relative min-w-0 bg-[#080b11]">
          {/* Ko'rinish tanlagichi endi viewport ichida — sarlavha qatorini
              bo'shatadi va u boshqaradigan tasvirning ustida turadi. */}
          <div className="absolute top-3 left-3 z-10 flex gap-1 bg-[#0a0e18]/90 backdrop-blur border border-[rgba(255,255,255,0.12)] rounded-lg p-1">
            <button
              onClick={() => showView("2d")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${view === "2d" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            >
              <IconRulerMeasure size={14} stroke={1.8} /> 2D sxema
            </button>
            <button
              onClick={() => showView("3d")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${view === "3d" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            >
              <IconBox size={14} stroke={1.8} /> 3D arena
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0a0e18]/90 backdrop-blur border border-[rgba(255,255,255,0.12)] text-slate-300 hover:bg-[#141a2b] cursor-pointer"
          >
            <IconMaximize size={14} stroke={1.8} />
            {isFullscreen ? "Kichraytirish" : "Kattalashtirish"}
          </button>

          {/* Xatolik viewport ustida suzadi — avval u sahifa oqimida turib,
              paydo bo'lganda butun tasvirni pastga surib yuborardi. */}
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[560px] flex items-start gap-2.5 bg-[#2a1215]/95 backdrop-blur border border-red-500/40 rounded-xl px-4 py-3 shadow-xl">
              <IconAlertTriangle size={17} stroke={1.9} className="text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-red-400">Sinov boshlanmadi</div>
                <p className="text-[12.5px] text-red-200/90 leading-snug mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-300/60 hover:text-red-200 cursor-pointer shrink-0 leading-none text-lg"
                aria-label="Yopish"
              >
                ×
              </button>
            </div>
          )}

          {view === "2d" ? (
            <TrussCanvas
              nodes={design!.nodes}
              members={design!.members}
              mode="delete"
              memberFirstNode={null}
              solved={solvedMap}
              onAddNode={() => {}}
              onNodeClick={() => {}}
              onNodeDrag={() => {}}
              onMemberClick={() => {}}
              readOnly
              intensityMode
              fitRequest={fitToken}
              fitZoom
            />
          ) : (
            <TrussRally3D
              nodes={design!.nodes}
              members={design!.members}
              solved={solvedMap}
              truckProgress={testing || result ? truckX / 100 : null}
              vehicle={vehicle}
              onDrawScale={setVehicleScaledDown}
            />
          )}
          {/* O'tish jarayoni. Avval bu yerda 2D ustida suzib yuruvchi yuk
              mashinasi ikonkasi bor edi, u viewport kengligining foizi bo'ylab
              yurardi — ko'prik markazga tekislangach, ikonka ko'prik bilan
              umuman mos kelmay qoldi. Aniq bo'lmagan animatsiya o'rniga aniq
              progress ko'rsatkichi. */}
          {view === "2d" && (testing || result) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[min(420px,60%)] bg-[#0a0e18]/90 backdrop-blur border border-[rgba(255,255,255,0.12)] rounded-xl px-4 py-2.5 pointer-events-none">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <IconTruck size={14} stroke={1.8} />
                  Yuk mashinasi o&apos;tmoqda
                </span>
                <span className="font-mono text-violet-300">{truckX.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${truckX}%` }} />
              </div>
            </div>
          )}
          {(testing || result) && (
            <div className="absolute top-3 right-3 z-10 bg-[#0a0e18]/90 backdrop-blur border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-3 flex items-center gap-3">
              <div
                className="relative w-8 h-56 rounded-full border border-[rgba(255,255,255,0.2)] overflow-hidden shrink-0"
                style={{ background: "linear-gradient(to top, #16a34a 0%, #84cc16 30%, #eab308 55%, #f97316 78%, #dc2626 100%)" }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 h-px bg-black/25" style={{ bottom: `${(i + 1) * 16.6}%` }} />
                ))}
                <div
                  className="absolute left-0 right-0"
                  style={{ bottom: `${Math.max(0, Math.min(100, (displayLoad / gaugeMaxN) * 100))}%` }}
                >
                  <div className={`h-[3px] bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.85)] ${testing ? "gauge-needle-live" : ""}`} />
                </div>
              </div>
              <div>
                <div className="text-slate-400 uppercase font-bold text-[10px] tracking-wide">Joriy yuk</div>
                <div className="font-bold text-2xl text-amber-400 leading-tight">
                  {displayLoad.toFixed(0)}
                  <span className="text-xs text-slate-400 font-semibold"> N</span>
                </div>
                <div className="text-[10px] text-slate-500">shkala: 0–{gaugeMaxN.toFixed(0)} N</div>
              </div>
            </div>
          )}
        </div>

        <aside className="w-[310px] shrink-0 bg-[#0a0e18] border-l border-[rgba(255,255,255,0.08)] text-white overflow-y-auto flex flex-col">
          {/* O'tadigan transport tanlash */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              <IconTruck size={14} stroke={2} /> O&apos;tadigan transport
            </h3>

            <div className="grid grid-cols-2 gap-1.5">
              {VEHICLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={testing}
                  onClick={() => {
                    setVehicleId(preset.id);
                    setCustomMassKg(null);
                  }}
                  title={preset.hint}
                  className={`text-left px-2.5 py-2 rounded-lg border transition-colors disabled:opacity-50 cursor-pointer ${
                    vehicleId === preset.id
                      ? "border-violet-500 bg-violet-600/15"
                      : "border-[rgba(255,255,255,0.1)] bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="block text-[11.5px] font-bold text-slate-100 leading-tight">{preset.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{preset.massKg.toLocaleString("ru-RU")} kg</span>
                </button>
              ))}
            </div>

            <label className="block mt-3">
              <span className="block text-[10px] uppercase font-bold tracking-wide text-slate-500 mb-1.5">
                Og&apos;irligi (kg)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  max={100000}
                  step={50}
                  disabled={testing}
                  value={activeMassKg}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCustomMassKg(Number.isFinite(next) && next > 0 ? Math.min(100000, Math.max(50, next)) : null);
                  }}
                  className="flex-1 min-w-0 bg-[#141a2b] border border-[rgba(255,255,255,0.14)] rounded-lg px-2.5 py-1.5 text-[13px] font-mono font-bold text-white outline-none focus:border-violet-500"
                />
                {customMassKg !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomMassKg(null)}
                    className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer shrink-0"
                  >
                    standart
                  </button>
                )}
              </div>
              <span className="block text-[10px] text-slate-500 mt-1.5">
                Yuk kuchi: <span className="font-mono text-slate-300">{vehicleN.toFixed(0)} N</span> (m × 9.81)
              </span>
            </label>

            <div className="mt-2.5 text-[10px] leading-snug text-slate-500">
              Ko&apos;prik oralig&apos;i: <span className="font-mono text-slate-300">{spanMeters.toFixed(1)} m</span> ·
              {" "}transport uzunligi: <span className="font-mono text-slate-300">{vehicle.lengthM} m</span>
              {vehicleScaledDown && view === "3d" && (
                <span className="block mt-1 text-amber-400/80">
                  3D da mashina ko&apos;prikka sig&apos;ishi uchun kichraytirib chizildi — hisob-kitobda to&apos;liq
                  og&apos;irlik ishlatiladi.
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Sinov natijasi</h3>

            {!result && !testing && (
              <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.14)] p-4 text-center">
                <IconTruck size={26} stroke={1.5} className="mx-auto text-slate-600 mb-2" />
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Yuk mashinasi ko&apos;prik ustidan o&apos;tadi va yuk bosqichma-bosqich oshadi.
                  Birinchi sinadigan a&apos;zo topilganda sinov to&apos;xtaydi.
                </p>
              </div>
            )}

            {testing && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                <div className="text-[11px] font-bold uppercase text-violet-300 mb-2">Yuk oshirilmoqda</div>
                <div className="font-mono text-2xl font-bold text-amber-400">{displayLoad.toFixed(0)} N</div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-2.5">
                {/* Asosiy savol — "tanlagan mashinam o'ta oladimi?" — eng
                    tepada javob beriladi; qolgan raqamlar shuni asoslaydi. */}
                {verdict && (
                  <div
                    className={`rounded-xl border p-3.5 ${
                      verdict.passes ? "border-emerald-500/40 bg-emerald-500/12" : "border-red-500/40 bg-red-500/12"
                    }`}
                  >
                    <div className={`text-[10px] uppercase font-bold tracking-wide ${verdict.passes ? "text-emerald-400" : "text-red-400"}`}>
                      {vehicle.label} · {activeMassKg.toLocaleString("ru-RU")} kg
                    </div>
                    <div className="font-bold text-xl leading-tight mt-1">
                      {verdict.passes ? "Ko'prik ko'taradi ✓" : "Ko'prik sinadi ✗"}
                    </div>
                    <div className="text-[11px] text-slate-300/80 mt-1">
                      Zaxira koeffitsienti: <span className="font-mono font-bold">{verdict.safety.toFixed(2)}×</span>
                      {verdict.passes
                        ? verdict.safety < 1.5
                          ? " — o'tadi, lekin zaxira kam"
                          : " — ishonchli zaxira"
                        : ` — yana ${(vehicleN - result.failureLoadN).toFixed(0)} N yetishmayapti`}
                    </div>
                  </div>
                )}

                {/* Samaradorlik reytingni belgilaydi, shuning uchun u birinchi
                    va eng katta — avval u uchta bir xil kartochkaning
                    oxirgisi bo'lib turardi. */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                  <div className="text-emerald-400 text-[10px] uppercase font-bold tracking-wide">Samaradorlik</div>
                  <div className="font-bold text-3xl leading-tight mt-0.5">{result.efficiency.toFixed(1)}</div>
                  <div className="text-[10.5px] text-emerald-200/60 mt-0.5">sinish yuki / og&apos;irlik — reyting shu bo&apos;yicha</div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-2.5">
                    <div className="text-red-400 text-[9.5px] uppercase font-bold tracking-wide">Sinish yuki</div>
                    <div className="font-bold text-lg leading-tight mt-0.5">{result.failureLoadN.toFixed(0)}<span className="text-[11px] text-slate-400 font-semibold"> N</span></div>
                    <div className="text-[10px] text-slate-500">{(result.failureLoadN / 9.81).toFixed(1)} kg</div>
                  </div>
                  <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#141a2b] p-2.5">
                    <div className="text-slate-400 text-[9.5px] uppercase font-bold tracking-wide">Og&apos;irligi</div>
                    <div className="font-bold text-lg leading-tight mt-0.5">{result.structureMassKg.toFixed(3)}<span className="text-[11px] text-slate-400 font-semibold"> kg</span></div>
                    <div className="text-[10px] text-slate-500">{design!.members.length} a&apos;zo</div>
                  </div>
                </div>

                {failingMember && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                    <div className="text-amber-400 text-[9.5px] uppercase font-bold tracking-wide">Birinchi sinadigan a&apos;zo</div>
                    <div className="font-semibold text-[12.5px] mt-0.5">
                      #{result.failingMemberIndex} — {failingMember.in_tension ? "cho'zilish" : "siqilish"}
                      {failingMember.isBuckling ? " (bukilish)" : " (oquvchanlik)"}
                    </div>
                    <p className="text-[10.5px] text-amber-200/60 mt-1 leading-snug">
                      {failingMember.isBuckling
                        ? "Siqilgan a'zo uzunligi bo'yicha bukilib ketdi — uni kaltaroq qiling yoki kesimini kattalashtiring."
                        : "A'zo materiali oquvchanlik chegarasiga yetdi — yukni boshqa a'zolarga taqsimlang."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              <IconRulerMeasure size={14} stroke={2} /> Reyting · samaradorlik
            </h3>
            {rankedLeaderboard.length === 0 ? (
              <p className="text-[12px] text-slate-500">Hali sinov o&apos;tkazilmagan.</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {rankedLeaderboard.slice(0, 10).map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${i === 0 ? "bg-amber-500/10 border border-amber-500/25" : "border border-transparent"}`}
                  >
                    <span className={`grid place-items-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 ${i === 0 ? "bg-amber-500 text-black" : "bg-white/8 text-slate-400"}`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-slate-200 truncate">{r.designName}</span>
                      <span className="block text-[10px] text-slate-500 truncate">{r.material}</span>
                    </span>
                    <span className="font-mono font-bold text-[13px] text-emerald-400 shrink-0">{r.efficiency.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
