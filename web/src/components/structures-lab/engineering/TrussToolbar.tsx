"use client";

import { BuilderMode, MATERIALS } from "./types";
import {
  Icon,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBox,
  IconCircle,
  IconCopy,
  IconEraser,
  IconEye,
  IconLine,
  IconPlayerPlay,
  IconRulerMeasure,
  IconTrash,
  IconTriangle,
  IconVectorBezier,
} from "@tabler/icons-react";

const MODES: { id: BuilderMode; label: string; shortcut: string; icon: Icon }[] = [
  { id: "node", label: "Tugun", shortcut: "N", icon: IconCircle },
  { id: "member", label: "A'zo", shortcut: "M", icon: IconLine },
  { id: "support", label: "Tayanch", shortcut: "S", icon: IconTriangle },
  { id: "load", label: "Yuk", shortcut: "L", icon: IconVectorBezier },
  { id: "delete", label: "O'chirish", shortcut: "D", icon: IconEraser },
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
  onLoadExample,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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
  onLoadExample: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  solving: boolean;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  const editing = view === "2d";
  const secondaryButton = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]";

  return (
    <div className="shrink-0 border-b border-[var(--line)] bg-white">
      <div className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
        <div className="flex rounded-lg bg-[var(--surface-muted)] p-1">
          <button onClick={() => onViewChange("2d")} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${editing ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgba(24,33,43,0.08)]" : "text-[var(--ink-muted)]"}`}>
            <IconRulerMeasure size={15} stroke={1.8} /> 2D qurish
          </button>
          <button onClick={() => onViewChange("3d")} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${!editing ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgba(24,33,43,0.08)]" : "text-[var(--ink-muted)]"}`}>
            <IconBox size={15} stroke={1.8} /> 3D tekshirish
          </button>
        </div>

        <span className="mx-1 h-7 w-px bg-[var(--line)]" />

        {editing ? (
          <div className="flex flex-wrap gap-1" aria-label="Qurish asboblari">
            {MODES.map((item) => {
              const ModeIcon = item.icon;
              return (
                <button key={item.id} onClick={() => onModeChange(item.id)} title={`${item.label} (${item.shortcut})`} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${mode === item.id ? "bg-[var(--accent)] text-white" : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"}`}>
                  <ModeIcon size={15} stroke={1.8} /> {item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-800">
            <IconEye size={15} stroke={1.8} /> 3D sahna faqat ko‘rish uchun — obyekt qo‘shilmaydi
          </div>
        )}

        <span className="flex-1" />

        {editing && (
          <>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-medium text-[var(--ink-muted)]">
              Material
              <select value={materialId} onChange={(e) => onMaterialChange(e.target.value)} className="bg-transparent font-semibold text-[var(--ink)] outline-none">
                {MATERIALS.map((material) => <option key={material.id} value={material.id}>{material.label}</option>)}
              </select>
            </label>
            {mode === "load" && (
              <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-medium text-[var(--ink-muted)]">
                Yuk
                <input type="number" value={loadMagnitude} onChange={(e) => onLoadMagnitudeChange(Number(e.target.value))} className="w-16 bg-transparent font-mono font-semibold text-[var(--ink)] outline-none" /> N
              </label>
            )}
          </>
        )}
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-2 border-t border-[var(--line)] px-4 py-1.5">
        <div className="flex items-center gap-1" aria-label="Amallar tarixi">
          <button onClick={onUndo} disabled={!canUndo} title="Bekor qilish (Ctrl+Z)" aria-label="Bekor qilish" className={`${secondaryButton} w-9 justify-center px-0 disabled:cursor-not-allowed disabled:opacity-35`}><IconArrowBackUp size={16} stroke={1.8} /></button>
          <button onClick={onRedo} disabled={!canRedo} title="Qayta qilish (Ctrl+Y)" aria-label="Qayta qilish" className={`${secondaryButton} w-9 justify-center px-0 disabled:cursor-not-allowed disabled:opacity-35`}><IconArrowForwardUp size={16} stroke={1.8} /></button>
        </div>
        <span className="mx-1 h-6 w-px bg-[var(--line)]" />
        <button onClick={onLoadExample} className={secondaryButton}><IconRulerMeasure size={15} stroke={1.8} /> Namuna</button>
        <button onClick={onMirror} disabled={!editing} className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-40`}><IconCopy size={15} stroke={1.8} /> Ko‘zgulash</button>
        <button onClick={onClear} disabled={!editing} className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-40`}><IconTrash size={15} stroke={1.8} /> Tozalash</button>
        <span className="flex-1" />
        <button onClick={onSolve} disabled={solving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#0e5846] disabled:opacity-50">
          <IconPlayerPlay size={15} stroke={1.8} /> {solving ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
        </button>
      </div>
    </div>
  );
}
