"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { TrussToolbar, ViewMode } from "./TrussToolbar";
import { TrussNode, TrussMemberDraft, BuilderMode, MATERIALS, SolvedMember, SupportType } from "./types";
import { buildTrussApiParams } from "./trussApiParams";
import { computeStability, stabilityErrorMessage, stabilityWarningMessage } from "./trussStability";
import { nextId, mirrorTrussHorizontally } from "./trussMirror";
import { buildExampleWarrenTruss } from "./trussExample";
import { loadTrussDesign, saveTrussDesign } from "../../../store/trussDesignStore";
import { useHasMounted } from "../../../lib/useHasMounted";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

const TrussCanvas = dynamic(() => import("./TrussCanvas"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">Canvas yuklanmoqda...</div>,
});

const TrussViewport3D = dynamic(() => import("./TrussViewport3D"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">3D ko&apos;rinish yuklanmoqda...</div>,
});

const SUPPORT_CYCLE: SupportType[] = ["none", "pin", "roller_h", "roller_v"];
const HISTORY_LIMIT = 80;

type TrussSnapshot = {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
};

export default function TrussBuilder() {
  // All three start as the SSR-safe default (localStorage doesn't exist on
  // the server) and are populated after mount below - reading them
  // synchronously in a useState initializer would make the client's first
  // render differ from the server-rendered HTML and trigger a hydration
  // mismatch.
  const [nodes, setNodes] = useState<TrussNode[]>([]);
  const [members, setMembers] = useState<TrussMemberDraft[]>([]);
  const [designName, setDesignName] = useState("Mening ko'prigim");
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<BuilderMode>("node");
  const [view, setView] = useState<ViewMode>("2d");
  const [memberFirstNode, setMemberFirstNode] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState(MATERIALS[0].id);
  const [loadMagnitude, setLoadMagnitude] = useState(500);
  const [solved, setSolved] = useState<Map<string, SolvedMember> | null>(null);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [history, setHistory] = useState<{ past: TrussSnapshot[]; future: TrussSnapshot[] }>({ past: [], future: [] });
  const [fitRequest, setFitRequest] = useState(0);
  const currentSnapshotRef = useRef<TrussSnapshot>({ nodes: [], members: [] });

  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const stability = computeStability(nodes, members);

  useEffect(() => {
    currentSnapshotRef.current = { nodes, members };
  }, [nodes, members]);

  const checkpoint = useCallback(() => {
    const snapshot = currentSnapshotRef.current;
    setHistory((current) => ({
      past: [...current.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
      future: [],
    }));
  }, []);

  const applySnapshot = useCallback((snapshot: TrussSnapshot) => {
    currentSnapshotRef.current = snapshot;
    setNodes(snapshot.nodes);
    setMembers(snapshot.members);
    setMemberFirstNode(null);
    setSolved(null);
    setError(null);
  }, []);

  const handleUndo = useCallback(() => {
    const previous = history.past.at(-1);
    if (!previous) return;
    const present = currentSnapshotRef.current;
    setHistory({ past: history.past.slice(0, -1), future: [present, ...history.future] });
    applySnapshot(previous);
  }, [applySnapshot, history]);

  const handleRedo = useCallback(() => {
    const next = history.future[0];
    if (!next) return;
    const present = currentSnapshotRef.current;
    setHistory({ past: [...history.past, present], future: history.future.slice(1) });
    applySnapshot(next);
  }, [applySnapshot, history]);

  // Load whatever was last saved, exactly once, after the client has
  // actually mounted (hasMounted flips true post-hydration). This is a
  // render-phase state update guarded by `hydrated` - not an effect - so it
  // runs before this render commits, with no flicker and no separate effect
  // needed just to sync from a browser-only store.
  const hasMounted = useHasMounted();
  if (hasMounted && !hydrated) {
    const saved = loadTrussDesign();
    if (saved) {
      setNodes(saved.nodes);
      setMembers(saved.members);
      setDesignName(saved.name);
      // A restored design carries whatever canvas coordinates it was drawn at,
      // which on a different viewport size can be off in a corner. Ask for one
      // fit so the user sees their bridge, not an empty grid.
      setFitRequest((request) => request + 1);
    }
    setHydrated(true);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo]);

  // Keep the design synced to storage so the Competition tab can pick up
  // whatever was last built here, whenever the user navigates away. Gated on
  // `hydrated` so this doesn't fire with the empty initial state and
  // clobber the just-loaded design before the effect above applies it.
  useEffect(() => {
    if (!hydrated) return;
    saveTrussDesign({ name: designName, nodes, members });
  }, [hydrated, designName, nodes, members]);

  const handleAddNode = useCallback((x: number, y: number) => {
    checkpoint();
    setNodes((prev) => [...prev, { id: nextId(prev, "n"), x, y, support: "none", loadFx: 0, loadFy: 0 }]);
    setSolved(null);
  }, [checkpoint]);

  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    const node = currentSnapshotRef.current.nodes.find((item) => item.id === id);
    if (!node || (node.x === x && node.y === y)) return;
    checkpoint();
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    setSolved(null);
  }, [checkpoint]);

  const handleNodeClick = useCallback(
    (id: string) => {
      setSolved(null);
      if (mode === "member") {
        if (!memberFirstNode) {
          setMemberFirstNode(id);
        } else if (memberFirstNode === id) {
          setMemberFirstNode(null);
        } else {
          checkpoint();
          setMembers((prev) => [
            ...prev,
            {
              id: nextId(prev, "m"),
              nodeA: memberFirstNode,
              nodeB: id,
              areaM2: material.areaM2,
              yieldStrengthPa: material.yieldStrengthPa,
              E: material.E,
              densityKgM3: material.densityKgM3,
              materialLabel: material.label,
            },
          ]);
          setMemberFirstNode(null);
        }
      } else if (mode === "support") {
        checkpoint();
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== id) return n;
            const next = SUPPORT_CYCLE[(SUPPORT_CYCLE.indexOf(n.support) + 1) % SUPPORT_CYCLE.length];
            return { ...n, support: next };
          })
        );
      } else if (mode === "load") {
        checkpoint();
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== id) return n;
            const applied = -loadMagnitude;
            return { ...n, loadFy: n.loadFy === applied ? 0 : applied };
          })
        );
      } else if (mode === "delete") {
        checkpoint();
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setMembers((prev) => prev.filter((m) => m.nodeA !== id && m.nodeB !== id));
      }
    },
    [checkpoint, mode, memberFirstNode, material, loadMagnitude]
  );

  const handleMemberClick = useCallback((id: string) => {
    if (!currentSnapshotRef.current.members.some((member) => member.id === id)) return;
    checkpoint();
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setSolved(null);
  }, [checkpoint]);

  const handleDeleteNode = useCallback((id: string) => {
    if (!currentSnapshotRef.current.nodes.some((node) => node.id === id)) return;
    checkpoint();
    setNodes((prev) => prev.filter((node) => node.id !== id));
    setMembers((prev) => prev.filter((member) => member.nodeA !== id && member.nodeB !== id));
    setMemberFirstNode((current) => current === id ? null : current);
    setSolved(null);
  }, [checkpoint]);

  const handleClear = useCallback(() => {
    if (currentSnapshotRef.current.nodes.length === 0 && currentSnapshotRef.current.members.length === 0) return;
    checkpoint();
    setNodes([]);
    setMembers([]);
    setMemberFirstNode(null);
    setSolved(null);
    setError(null);
  }, [checkpoint]);

  const handleMirror = useCallback(() => {
    if (nodes.length === 0) {
      setError("Avval nusxalash uchun ferma quring.");
      return;
    }
    checkpoint();
    const mirrored = mirrorTrussHorizontally(nodes, members);
    setNodes(mirrored.nodes);
    setMembers(mirrored.members);
    setSolved(null);
    setError(null);
  }, [checkpoint, nodes, members]);

  const handleLoadExample = useCallback(() => {
    checkpoint();
    const example = buildExampleWarrenTruss();
    setNodes(example.nodes);
    setMembers(example.members);
    setDesignName(example.name);
    setSolved(null);
    setError(null);
    setFitRequest((request) => request + 1);
  }, [checkpoint]);

  const handleSolve = useCallback(async () => {
    setError(null);
    if (nodes.length < 2 || members.length < 1) {
      setError("Kamida 2 ta tugun va 1 ta a'zo qo'shing.");
      return;
    }
    if (!nodes.some((n) => n.support !== "none")) {
      setError("Kamida bitta tayanch (support) belgilang.");
      return;
    }
    // Faqat mexanizm to'sadi. Statik aniqlanmagan konstruksiya endi
    // yechiladi (qattiqlik usuli), shuning uchun u ogohlantirish sifatida
    // ko'rsatiladi va tahlil davom etadi.
    const stabilityError = stabilityErrorMessage(stability);
    if (stabilityError) {
      setError(stabilityError);
      return;
    }
    setWarning(stabilityWarningMessage(stability));

    setSolving(true);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "truss", params: buildTrussApiParams(nodes, members) }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      interface BackendMemberResult {
        force_N: number;
        stress_Pa: number;
        safety_factor: number;
        in_tension: boolean;
      }

      const resultMap = new Map<string, SolvedMember>();
      (data.members as BackendMemberResult[]).forEach((res, i) => {
        const local = members[i];
        if (!local) return;
        resultMap.set(local.id, {
          id: local.id,
          nodeA: local.nodeA,
          nodeB: local.nodeB,
          forceN: res.force_N,
          stressPa: res.stress_Pa,
          safetyFactor: res.safety_factor,
          inTension: res.in_tension,
        });
      });
      setSolved(resultMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tahlil xatoligi");
    } finally {
      setSolving(false);
    }
  }, [nodes, members, stability]);

  const worstMember = solved ? Array.from(solved.values()).sort((a, b) => a.safetyFactor - b.safetyFactor)[0] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TrussToolbar
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setMemberFirstNode(null);
        }}
        materialId={materialId}
        onMaterialChange={setMaterialId}
        loadMagnitude={loadMagnitude}
        onLoadMagnitudeChange={setLoadMagnitude}
        onSolve={handleSolve}
        onClear={handleClear}
        onMirror={handleMirror}
        onLoadExample={handleLoadExample}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        solving={solving}
        view={view}
        onViewChange={(nextView) => {
          setView(nextView);
          setMemberFirstNode(null);
          // Coming back from 3D remounts the canvas at the current viewport
          // size, so re-centre rather than restoring a stale offset.
          if (nextView === "2d") setFitRequest((request) => request + 1);
        }}
      />

      <div className="flex flex-1 min-h-0">
        {view === "2d" ? (
          <TrussCanvas
            nodes={nodes}
            members={members}
            mode={mode}
            memberFirstNode={memberFirstNode}
            solved={solved}
            onAddNode={handleAddNode}
            onNodeClick={handleNodeClick}
            onNodeDrag={handleNodeDrag}
            onMemberClick={handleMemberClick}
            onDeleteNode={handleDeleteNode}
            onDeleteMember={handleMemberClick}
            fitRequest={fitRequest}
          />
        ) : (
          <TrussViewport3D
            nodes={nodes}
            members={members}
            solved={solved}
          />
        )}

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-[var(--line)] bg-white p-4 text-xs text-[var(--ink)]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Loyiha nazorati</h2>
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Model va tahlil holati</p>
          </div>
          <label className="mb-4 flex flex-col gap-1.5">
            <span className="font-medium text-[var(--ink-muted)]">Dizayn nomi</span>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="h-9 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-3 text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>

          {nodes.length > 0 && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Tugunlar (j)</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{stability.joints}</span>
              </div>
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>A&apos;zolar (m)</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{stability.members}</span>
              </div>
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Tayanch reaksiyalari (r)</span>
                <span className="font-mono font-semibold text-[var(--ink)]">{stability.reactions}</span>
              </div>
              <div
                className={`mt-1 rounded-lg px-2 py-2 text-center font-semibold ${
                  stability.status === "determinate"
                    ? "bg-emerald-50 text-emerald-700"
                    : stability.status === "unstable"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {stability.status === "determinate" && <span className="inline-flex items-center gap-1.5"><IconCheck size={15} stroke={2} /> Barqaror (2j = m+r = {stability.twoJ})</span>}
                {stability.status === "unstable" && <span className="inline-flex items-center gap-1.5"><IconAlertTriangle size={15} stroke={1.8} /> Beqaror: m+r={stability.mPlusR} &lt; 2j={stability.twoJ}</span>}
                {stability.status === "indeterminate" && <span className="inline-flex items-center gap-1.5"><IconAlertTriangle size={15} stroke={1.8} /> Ortiqcha: m+r={stability.mPlusR} &gt; 2j={stability.twoJ}</span>}
              </div>
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold">Natijalar</h3>
          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
          {warning && !error && (
            <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-snug text-amber-800">
              <IconAlertTriangle size={16} stroke={1.9} className="mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          )}
          {!solved && !error && (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 leading-5 text-[var(--ink-muted)]">
              Tugun (●) qo&apos;yib, a&apos;zo (╱) bilan ulang, tayanch va yuk belgilang, so&apos;ng &quot;Tahlil qilish&quot;ni bosing.
              Tugagach, COMPETITION tabida &quot;Monster Truck Rally&quot; yuk sinovidan o&apos;tkazing.
            </p>
          )}
          {solved && (
            <div className="flex flex-col gap-2">
              <div className={`rounded-lg p-3 font-semibold ${worstMember && worstMember.safetyFactor < 1 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                <span className="inline-flex items-center gap-1.5">{worstMember && worstMember.safetyFactor < 1 ? <><IconAlertTriangle size={15} stroke={1.8} /> Truss sinadi!</> : <><IconCheck size={15} stroke={2} /> Truss xavfsiz</>}</span>
              </div>
              {Array.from(solved.values()).map((m) => (
                <div key={m.id} className="border-b border-[var(--line)] py-2">
                  <span className={m.inTension ? "text-blue-600" : "text-red-600"}>{m.inTension ? "Tension" : "Compression"}</span>
                  {" "}| {Math.abs(m.forceN).toFixed(1)} N, SF={m.safetyFactor.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
