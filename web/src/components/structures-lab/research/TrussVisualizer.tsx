"use client";

import { useMemo } from "react";
import { TrussMemberInput, buildTrussMember, memberColor, arrowColor } from "../../../lib/physics/trussMember";

interface Node {
  id: string;
  x: number; // meters
  y: number; // meters, up-positive (engineering convention)
}

// Illustrative Warren-truss bridge span, tuned so the color range spans the
// full S/Y spectrum (safe green/yellow members through a bright-red failure).
const DEFAULT_NODES: Node[] = [
  { id: "A", x: 0, y: 0 },
  { id: "B", x: 2, y: 2 },
  { id: "C", x: 4, y: 0 },
  { id: "D", x: 6, y: 2 },
  { id: "E", x: 8, y: 0 },
  { id: "F", x: 10, y: 2 },
  { id: "G", x: 12, y: 0 },
];

// Forces tuned (at area=0.00001 m^2) to spread across the full S/Y range,
// with member m9 pushed just past 1.0 to demonstrate a failure point.
const DEFAULT_MEMBERS: TrussMemberInput[] = [
  { id: "m1", jointA: "A", jointB: "B", forceType: "compression", forceN: 37, areaM2: 0.00001, yieldStrengthPa: 14_893_000 },
  { id: "m2", jointA: "B", jointB: "C", forceType: "tension", forceN: 32, areaM2: 0.00001, yieldStrengthPa: 21_600_000 },
  { id: "m3", jointA: "C", jointB: "D", forceType: "compression", forceN: 82, areaM2: 0.00001, yieldStrengthPa: 14_893_000 },
  { id: "m4", jointA: "D", jointB: "E", forceType: "tension", forceN: 162, areaM2: 0.00001, yieldStrengthPa: 21_600_000 },
  { id: "m5", jointA: "E", jointB: "F", forceType: "compression", forceN: 15, areaM2: 0.00001, yieldStrengthPa: 14_893_000 },
  { id: "m6", jointA: "F", jointB: "G", forceType: "tension", forceN: 76, areaM2: 0.00001, yieldStrengthPa: 21_600_000 },
  { id: "m7", jointA: "A", jointB: "C", forceType: "tension", forceN: 130, areaM2: 0.00001, yieldStrengthPa: 21_600_000 },
  { id: "m8", jointA: "C", jointB: "E", forceType: "compression", forceN: 60, areaM2: 0.00001, yieldStrengthPa: 14_893_000 },
  { id: "m9", jointA: "E", jointB: "G", forceType: "compression", forceN: 201, areaM2: 0.00001, yieldStrengthPa: 14_893_000 },
];

const SCALE = 40; // px per meter
const PAD_LEFT = 34;
const PAD = 20;

export function TrussVisualizer({
  nodes = DEFAULT_NODES,
  members = DEFAULT_MEMBERS,
}: {
  nodes?: Node[];
  members?: TrussMemberInput[];
}) {
  const built = useMemo(() => members.map(buildTrussMember), [members]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const width = maxX * SCALE + PAD_LEFT + PAD;
  const height = maxY * SCALE + PAD * 2;

  // Flip y (engineering up-positive -> SVG down-positive)
  const px = (x: number) => x * SCALE + PAD_LEFT;
  const py = (y: number) => height - (y * SCALE + PAD);

  return (
    <div className="rounded-xl border border-gray-800 p-4 my-4 overflow-x-auto" style={{ background: "#0f1e3d" }}>
      <svg width={width + 20} height={height + 24} className="block">
        {/* Ruler ticks along the bottom */}
        {Array.from({ length: Math.floor(maxX) + 1 }, (_, i) => i).map((m) => (
          <g key={`tick-x-${m}`}>
            <line x1={px(m)} y1={height - 4} x2={px(m)} y2={height + 4} stroke="#64748b" strokeWidth={1} />
            <text x={px(m)} y={height + 18} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="monospace">
              {m * SCALE}
            </text>
          </g>
        ))}
        {/* Ruler ticks along the left */}
        {Array.from({ length: Math.floor(maxY) + 1 }, (_, i) => i).map((m) => (
          <g key={`tick-y-${m}`}>
            <line x1={PAD_LEFT - 4} y1={py(m)} x2={PAD_LEFT + 4} y2={py(m)} stroke="#64748b" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={py(m) + 3} fontSize={9} fill="#94a3b8" textAnchor="end" fontFamily="monospace">
              {m * SCALE}
            </text>
          </g>
        ))}

        {/* Members */}
        {built.map((m) => {
          const a = nodeMap.get(m.jointA);
          const b = nodeMap.get(m.jointB);
          if (!a || !b) return null;
          const color = memberColor(m);
          const midX = (px(a.x) + px(b.x)) / 2;
          const midY = (py(a.y) + py(b.y)) / 2;
          const failing = m.isFailing;
          return (
            <g key={m.id}>
              <line
                x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)}
                stroke={color}
                strokeWidth={failing ? 5 : 3}
                strokeDasharray={failing ? "6 3" : undefined}
              />
              <circle cx={midX} cy={midY} r={9} fill="#000" stroke={arrowColor(m.forceType)} strokeWidth={1.5} />
              <text x={midX} y={midY + 3} fontSize={8} fill={arrowColor(m.forceType)} textAnchor="middle" fontFamily="monospace" fontWeight={700}>
                {m.syRatio.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Nodes (joints) */}
        {nodes.map((n) => (
          <circle key={n.id} cx={px(n.x)} cy={py(n.y)} r={4} fill="#e2e8f0" stroke="#000" strokeWidth={1} />
        ))}
      </svg>

      <div className="text-center text-[11px] font-bold text-gray-400 mt-1">Direction and Color of Arrows</div>
    </div>
  );
}
