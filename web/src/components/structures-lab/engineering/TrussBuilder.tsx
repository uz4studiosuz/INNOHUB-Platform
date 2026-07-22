"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TrussToolbar } from "./TrussToolbar";
import { TrussNode, TrussMemberDraft, BuilderMode, MATERIALS, SolvedMember, SupportType } from "./types";
import { buildTrussApiParams } from "./trussApiParams";
import { loadTrussDesign, saveTrussDesign } from "../../../store/trussDesignStore";

const TrussCanvas = dynamic(() => import("./TrussCanvas"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-[#0f1e3d] text-gray-400">Canvas yuklanmoqda...</div>,
});

let nodeCounter = 1;
let memberCounter = 1;

function maxIdNum(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

const SUPPORT_CYCLE: SupportType[] = ["none", "pin", "roller_h", "roller_v"];

export default function TrussBuilder() {
  const [nodes, setNodes] = useState<TrussNode[]>(() => {
    const saved = loadTrussDesign();
    if (saved) {
      nodeCounter = Math.max(nodeCounter, maxIdNum(saved.nodes.map((n) => n.id), "n") + 1);
      return saved.nodes;
    }
    return [];
  });
  const [members, setMembers] = useState<TrussMemberDraft[]>(() => {
    const saved = loadTrussDesign();
    if (saved) {
      memberCounter = Math.max(memberCounter, maxIdNum(saved.members.map((m) => m.id), "m") + 1);
      return saved.members;
    }
    return [];
  });
  const [designName, setDesignName] = useState(() => loadTrussDesign()?.name ?? "Mening ko'prigim");
  const [mode, setMode] = useState<BuilderMode>("node");
  const [memberFirstNode, setMemberFirstNode] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState(MATERIALS[0].id);
  const [loadMagnitude, setLoadMagnitude] = useState(500);
  const [solved, setSolved] = useState<Map<string, SolvedMember> | null>(null);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];

  // Keep the design synced to storage so the Competition tab can pick up
  // whatever was last built here, whenever the user navigates away.
  useEffect(() => {
    saveTrussDesign({ name: designName, nodes, members });
  }, [designName, nodes, members]);

  const handleAddNode = useCallback((x: number, y: number) => {
    setNodes((prev) => [...prev, { id: `n${nodeCounter++}`, x, y, support: "none", loadFx: 0, loadFy: 0 }]);
    setSolved(null);
  }, []);

  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    setSolved(null);
  }, []);

  const handleNodeClick = useCallback(
    (id: string) => {
      setSolved(null);
      if (mode === "member") {
        if (!memberFirstNode) {
          setMemberFirstNode(id);
        } else if (memberFirstNode === id) {
          setMemberFirstNode(null);
        } else {
          setMembers((prev) => [
            ...prev,
            {
              id: `m${memberCounter++}`,
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
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== id) return n;
            const next = SUPPORT_CYCLE[(SUPPORT_CYCLE.indexOf(n.support) + 1) % SUPPORT_CYCLE.length];
            return { ...n, support: next };
          })
        );
      } else if (mode === "load") {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== id) return n;
            const applied = -loadMagnitude;
            return { ...n, loadFy: n.loadFy === applied ? 0 : applied };
          })
        );
      } else if (mode === "delete") {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setMembers((prev) => prev.filter((m) => m.nodeA !== id && m.nodeB !== id));
      }
    },
    [mode, memberFirstNode, material, loadMagnitude]
  );

  const handleMemberClick = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setSolved(null);
  }, []);

  const handleClear = useCallback(() => {
    setNodes([]);
    setMembers([]);
    setMemberFirstNode(null);
    setSolved(null);
    setError(null);
  }, []);

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
  }, [nodes, members]);

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
        solving={solving}
      />

      <div className="flex flex-1 min-h-0">
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
        />

        <aside className="w-64 shrink-0 bg-[#0a0e18] text-white p-4 overflow-y-auto text-xs">
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-gray-500">Dizayn nomi</span>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="bg-[#141a2b] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-white"
            />
          </label>

          <h3 className="font-bold text-sm mb-2">Natijalar</h3>
          {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded p-2 mb-2">{error}</div>}
          {!solved && !error && (
            <p className="text-gray-500">
              Tugun (●) qo&apos;yib, a&apos;zo (╱) bilan ulang, tayanch va yuk belgilang, so&apos;ng &quot;Tahlil qilish&quot;ni bosing.
              Tugagach, COMPETITION tabida &quot;Monster Truck Rally&quot; yuk sinovidan o&apos;tkazing.
            </p>
          )}
          {solved && (
            <div className="flex flex-col gap-2">
              <div className={`rounded p-2 font-bold ${worstMember && worstMember.safetyFactor < 1 ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                {worstMember && worstMember.safetyFactor < 1 ? "⚠ Truss sinadi!" : "✓ Truss xavfsiz"}
              </div>
              {Array.from(solved.values()).map((m) => (
                <div key={m.id} className="border-b border-gray-800 pb-1">
                  <span className={m.inTension ? "text-blue-400" : "text-red-400"}>{m.inTension ? "Tension" : "Compression"}</span>
                  {" "}— {Math.abs(m.forceN).toFixed(1)} N, SF={m.safetyFactor.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
