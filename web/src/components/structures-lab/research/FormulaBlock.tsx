"use client";

export function FormulaBlock({ title, formula, note }: { title?: string; formula: string; note?: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 my-3">
      {title && <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">{title}</div>}
      <pre className="font-mono text-sm text-amber-900 whitespace-pre-wrap">{formula}</pre>
      {note && <div className="text-xs text-amber-700 mt-2">{note}</div>}
    </div>
  );
}
