"use client";

function ArcDiagram() {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="180" height="130" viewBox="0 0 180 130">
        <text x="90" y="16" fontSize="12" fill="#374151" textAnchor="middle" fontWeight={700}>Load</text>
        <line x1="90" y1="20" x2="90" y2="42" stroke="#111827" strokeWidth={2} />
        <path d="M90 42 L82 32 M90 42 L98 32" stroke="#111827" strokeWidth={2} fill="none" />

        {/* Arch */}
        <path d="M20 115 A70 70 0 0 1 160 115" fill="none" stroke="#78716c" strokeWidth={10} strokeLinecap="round" />

        {/* Compression arrows along the arch, pointing along the curve toward the base */}
        <path d="M35 108 L45 118 M45 118 L37 118 M45 118 L45 110" stroke="#dc2626" strokeWidth={2} fill="none" />
        <path d="M145 108 L135 118 M135 118 L143 118 M135 118 L135 110" stroke="#dc2626" strokeWidth={2} fill="none" />

        <line x1="10" y1="122" x2="170" y2="122" stroke="#111827" strokeWidth={2} />
      </svg>
      <div className="text-xs font-bold text-gray-600">Arc Load</div>
    </div>
  );
}

function TriangleDiagram() {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="180" height="130" viewBox="0 0 180 130">
        <text x="90" y="16" fontSize="12" fill="#374151" textAnchor="middle" fontWeight={700}>Load</text>
        <line x1="90" y1="20" x2="90" y2="40" stroke="#111827" strokeWidth={2} />
        <path d="M90 40 L82 30 M90 40 L98 30" stroke="#111827" strokeWidth={2} fill="none" />

        <polygon points="90,42 25,112 155,112" fill="#a7f3d0" stroke="#0f766e" strokeWidth={3} />

        {/* Base arrows pointing outward */}
        <path d="M60 100 L45 100 M45 100 L52 95 M45 100 L52 105" stroke="#dc2626" strokeWidth={2} fill="none" />
        <path d="M120 100 L135 100 M135 100 L128 95 M135 100 L128 105" stroke="#dc2626" strokeWidth={2} fill="none" />
      </svg>
      <div className="text-xs font-bold text-gray-600">Triangle Load</div>
    </div>
  );
}

export function ArcLoadDiagram() {
  return <ArcDiagram />;
}

export function TriangleLoadDiagram() {
  return <TriangleDiagram />;
}
