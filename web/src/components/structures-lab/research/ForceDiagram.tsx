"use client";

function ArrowUp() {
  return (
    <svg width="16" height="22" viewBox="0 0 16 22">
      <path d="M8 0 L15 12 L10 12 L10 22 L6 22 L6 12 L1 12 Z" fill="#facc15" />
    </svg>
  );
}
function ArrowDown() {
  return (
    <svg width="16" height="22" viewBox="0 0 16 22">
      <path d="M8 22 L1 10 L6 10 L6 0 L10 0 L10 10 L15 10 Z" fill="#facc15" />
    </svg>
  );
}
function ArrowLeft() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16">
      <path d="M0 8 L12 1 L12 6 L22 6 L22 10 L12 10 L12 15 Z" fill="#facc15" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16">
      <path d="M22 8 L10 15 L10 10 L0 10 L0 6 L10 6 L10 1 Z" fill="#facc15" />
    </svg>
  );
}

function TensionGraphic() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <ArrowUp />
      <div className="w-6 h-16 rounded-sm" style={{ background: "#2563eb" }} />
      <ArrowDown />
    </div>
  );
}

function CompressionGraphic() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <ArrowDown />
      <div className="w-6 h-16 rounded-sm" style={{ background: "#dc2626" }} />
      <ArrowUp />
    </div>
  );
}

function ShearGraphic() {
  return (
    <div className="flex items-center gap-0.5 -rotate-1">
      <div className="flex flex-col items-center">
        <ArrowRight />
        <div className="w-5 h-9 rounded-sm mt-1" style={{ background: "#16a34a" }} />
      </div>
      <div className="flex flex-col items-center mt-4">
        <div className="w-5 h-9 rounded-sm mb-1" style={{ background: "#16a34a" }} />
        <ArrowLeft />
      </div>
    </div>
  );
}

function TorsionGraphic() {
  return (
    <div
      className="w-8 h-16 rounded-full border border-gray-400"
      style={{
        background:
          "repeating-linear-gradient(50deg, #cbd5e1 0px, #94a3b8 4px, #cbd5e1 8px), repeating-linear-gradient(-50deg, transparent 0 6px, rgba(0,0,0,0.15) 6px 8px)",
      }}
    />
  );
}

const FORCE_TYPES = [
  { key: "tension", label: "Tension", color: "#2563eb", Graphic: TensionGraphic, desc: "when a member is being pulled apart." },
  { key: "compression", label: "Compression", color: "#dc2626", Graphic: CompressionGraphic, desc: "when a member is being pushed together or crushed." },
  { key: "shear", label: "Shear", color: "#16a34a", Graphic: ShearGraphic, desc: "when a member is exposed to forces cross-ways." },
  { key: "torsion", label: "Torsion", color: "#64748b", Graphic: TorsionGraphic, desc: "when a member is being twisted." },
] as const;

export function ForceDiagram() {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
        {FORCE_TYPES.map(({ key, label, Graphic }) => (
          <div key={key} className="flex flex-col items-center gap-2 py-3">
            <Graphic />
            <div className="text-sm font-semibold text-gray-800">{label}</div>
          </div>
        ))}
      </div>
      <table className="w-full text-sm text-gray-700">
        <tbody>
          {FORCE_TYPES.map(({ key, label, color, desc }) => (
            <tr key={key} className="border-t border-gray-100">
              <td className="py-1.5 pr-4 font-bold whitespace-nowrap" style={{ color }}>{label}</td>
              <td className="py-1.5 text-gray-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
