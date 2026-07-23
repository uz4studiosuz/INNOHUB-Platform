"use client";

import { BuilderMode, MATERIALS } from "./types";

const MODES: { id: BuilderMode; label: string; icon: string }[] = [
  { id: "node", label: "Tugun", icon: "●" },
  { id: "member", label: "A'zo", icon: "╱" },
  { id: "support", label: "Tayanch", icon: "▲" },
  { id: "load", label: "Yuk", icon: "↓" },
  { id: "delete", label: "O'chirish", icon: "✕" },
];

export type ViewMode = "2d" | "3d";

export function TrussToolbar({
  mode,
  onModeChange,
  materialId,
  onMaterialChange,
  loadMagnitude,
  onLoadMagnitudeChange,
  onSolve,
  onClear,
  onMirror,
  solving,
  view,
  onViewChange,
}: {
  mode: BuilderMode;
  onModeChange: (m: BuilderMode) => void;
  materialId: string;
  onMaterialChange: (id: string) => void;
  loadMagnitude: number;
  onLoadMagnitudeChange: (v: number) => void;
  onSolve: () => void;
  onClear: () => void;
  onMirror: () => void;
  solving: boolean;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-[#e4e4e4] border-b border-gray-300">
      <div className="flex gap-1">
        <button
          onClick={() => onViewChange("2d")}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            view === "2d" ? "bg-violet-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          2D
        </button>
        <button
          onClick={() => onViewChange("3d")}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            view === "3d" ? "bg-violet-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
          }`}
        >
          🔄 3D
        </button>
      </div>

      <span className="h-6 w-px bg-gray-400 mx-1" />

      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              mode === m.id ? "bg-violet-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <span className="h-6 w-px bg-gray-400 mx-1" />

      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
        Material:
        <select
          value={materialId}
          onChange={(e) => onMaterialChange(e.target.value)}
          className="border border-gray-300 rounded px-1.5 py-1 text-xs"
        >
          {MATERIALS.map((mt) => (
            <option key={mt.id} value={mt.id}>{mt.label}</option>
          ))}
        </select>
      </label>

      {mode === "load" && (
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          Yuk (N):
          <input
            type="number"
            value={loadMagnitude}
            onChange={(e) => onLoadMagnitudeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-1.5 py-1 text-xs w-20"
          />
        </label>
      )}

      <span className="flex-1" />

      <button
        onClick={onMirror}
        title="Joriy dizaynni o'ng chetidan oynadek nusxalab, ko'prikning ikkinchi yarmini yaratadi"
        className="px-3 py-1.5 rounded text-xs font-bold bg-white text-gray-600 border border-gray-300 hover:bg-gray-100 cursor-pointer"
      >
        🪞 Nusxalash
      </button>
      <button
        onClick={onClear}
        className="px-3 py-1.5 rounded text-xs font-bold bg-white text-gray-600 border border-gray-300 hover:bg-gray-100 cursor-pointer"
      >
        Tozalash
      </button>
      <button
        onClick={onSolve}
        disabled={solving}
        className="px-4 py-1.5 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
      >
        {solving ? "Tahlil qilinmoqda..." : "▶ Tahlil qilish"}
      </button>
    </div>
  );
}
