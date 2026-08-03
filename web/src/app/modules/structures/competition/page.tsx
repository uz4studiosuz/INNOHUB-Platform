"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { loadTrussDesign, TrussDesign } from "../../../../store/trussDesignStore";
import { buildTrussApiParams } from "../../../../components/structures-lab/engineering/trussApiParams";
import { SolvedMember } from "../../../../components/structures-lab/engineering/types";
import { addBridgeResult, getBridgeResults } from "../../../../store/bridgeLeaderboardStore";
import { useHasMounted } from "../../../../lib/useHasMounted";
import { computeStability, stabilityErrorMessage } from "../../../../components/structures-lab/engineering/trussStability";
import { IconBox, IconRulerMeasure, IconSettings, IconTruck, IconTrophy } from "@tabler/icons-react";

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
      <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-3 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><IconTrophy size={21} stroke={1.8} /> Monster Truck Rally</h1>
          <p className="text-xs text-slate-400">
            Dizayn: <span className="text-white font-semibold">{design!.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-lg p-1">
            <button
              onClick={() => setView("2d")}
              className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${view === "2d" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              2D
            </button>
            <button
              onClick={() => setView("3d")}
              className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${view === "3d" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <IconBox size={16} stroke={1.8} /> 3D
            </button>
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
          >
            {testing ? "Sinov ketmoqda..." : <><IconTruck size={16} stroke={1.8} /> Sinovni boshlash</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          ❌ Xatolik: {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div ref={viewportRef} className="flex-1 flex flex-col relative min-w-0 bg-[#080b11]">
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-2 right-2 z-10 px-3 py-1.5 rounded text-xs font-bold bg-[#0a0e18]/90 border border-[rgba(255,255,255,0.15)] text-slate-300 hover:bg-[#141a2b] cursor-pointer"
          >
            {isFullscreen ? "⛶ Kichraytirish" : "⛶ Kattalashtirish"}
          </button>
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
            />
          ) : (
            <TrussRally3D
              nodes={design!.nodes}
              members={design!.members}
              solved={solvedMap}
              truckProgress={testing || result ? truckX / 100 : null}
            />
          )}
          {view === "2d" && (testing || result) && (
            <div
              className="absolute top-2 text-3xl pointer-events-none transition-none"
              style={{ left: `${5 + truckX * 0.9}%`, transform: "translateX(-50%)" }}
            >
              <IconTruck size={44} stroke={1.5} />
            </div>
          )}
          {(testing || result) && (
            <div className="absolute top-2 right-4 bg-[#0a0e18]/90 border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-3 flex items-center gap-3">
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

        <aside className="w-72 shrink-0 bg-[#0a0e18] text-white p-4 overflow-y-auto text-xs flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm mb-2">Natijalar</h3>
            {!result && !testing && (
              <p className="text-gray-500">
                &quot;Sinovni boshlash&quot;ni bosing — yuk mashinasi ko&apos;prik ustidan o&apos;tadi va
                yuk bosqichma-bosqich oshadi, birinchi sinadigan a&apos;zo topiladi.
              </p>
            )}
            {result && (
              <div className="flex flex-col gap-2">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  <div className="text-red-400 text-[10px] uppercase font-bold">Sinish yuki</div>
                  <div className="font-bold text-lg">
                    {result.failureLoadN.toFixed(0)} N <span className="text-slate-400 text-xs">({(result.failureLoadN / 9.81).toFixed(1)} kg)</span>
                  </div>
                </div>
                <div className="bg-[#141a2b] border border-[rgba(255,255,255,0.08)] rounded-lg p-2">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Ko&apos;prik og&apos;irligi</div>
                  <div className="font-bold text-lg">{result.structureMassKg.toFixed(3)} kg</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
                  <div className="text-emerald-400 text-[10px] uppercase font-bold">Samaradorlik</div>
                  <div className="font-bold text-lg">{result.efficiency.toFixed(1)}</div>
                </div>
                {failingMember && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                    <div className="text-amber-400 text-[10px] uppercase font-bold">Birinchi sinadigan a&apos;zo</div>
                    <div className="font-semibold">
                      #{result.failingMemberIndex} — {failingMember.in_tension ? "cho'zilish" : "siqilish"}
                      {failingMember.isBuckling ? " (bukilish)" : " (oquvchanlik)"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-bold text-sm mb-2"><IconRulerMeasure size={16} stroke={1.8} /> Reyting (samaradorlik bo&apos;yicha)</h3>
            {rankedLeaderboard.length === 0 ? (
              <p className="text-gray-500">Hali sinov o&apos;tkazilmagan.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {rankedLeaderboard.slice(0, 10).map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-gray-800 pb-1">
                    <span className="text-slate-300 truncate max-w-[120px]">
                      {i + 1}. {r.designName} <span className="text-slate-500">({r.material})</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{r.efficiency.toFixed(1)}</span>
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
