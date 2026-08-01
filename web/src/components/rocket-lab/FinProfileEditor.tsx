"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FinPoint, FIN_ENVELOPE, LAUNCHER_ZONE, finGeometry, finOutline, defaultControls,
  FinsParams, DEFAULT_FIN_POINTS,
} from "../../lib/physics/rocketPhysics";

/**
 * The fin drawn as an outline you drag, instead of four sliders that can
 * describe an impossible shape.
 *
 * The frame is the fin editor's own: x runs outward from the body as span, y
 * runs up the body from the tail towards the nose. Both axes are ruled in real
 * millimetres, and the launcher's corner is drawn as off limits - a corner the
 * outline may not reach into, which is exactly the Fin/Launcher Interference
 * rule the specification report checks.
 */

const PAD = 22;          // room for the rulers
const W = FIN_ENVELOPE.spanMm;
const H = FIN_ENVELOPE.stationMm;

interface Props {
  fins: FinsParams;
  onChange: (points: FinPoint[]) => void;
  /** Moves an edge's Bézier handle; only used in curves mode. */
  onChangeControls?: (controls: FinPoint[]) => void;
  /**
   * `overlay` draws it as a transparent sheet laid over the 3D viewport, the way
   * the original does - the rulers stay square to the screen while the rocket
   * sits behind them. `panel` is the compact form for the settings column.
   */
  variant?: "panel" | "overlay";
}

export function FinProfileEditor({ fins, onChange, onChangeControls, variant = "panel" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** Which handle is held: a corner, or an edge's curve control. */
  const [drag, setDrag] = useState<{ kind: "corner" | "control"; index: number } | null>(null);
  // Never assume the outline is there: a design restored from an older save may
  // predate it, and an editor that throws takes the whole page down with it.
  const points = fins.points?.length >= 3 ? fins.points : DEFAULT_FIN_POINTS;
  const curved = fins.edgeMode === "curves";
  // Memoised so the drag callback below is not rebuilt on every render.
  const controls = useMemo(
    () => (curved ? (fins.controls ?? defaultControls(points)) : []),
    [curved, fins.controls, points]
  );
  const geo = finGeometry({ ...fins, points });
  /** The flattened outline, i.e. exactly what the physics measures. */
  const outlinePts = finOutline({ ...fins, points, controls });

  /** Pointer position in millimetres of the editor's own frame. */
  const toMm = useCallback((clientX: number, clientY: number): FinPoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    // The viewBox is padded on all sides and y is flipped: station grows upward.
    const vbW = W + PAD * 2, vbH = H + PAD * 2;
    const x = ((clientX - r.left) / r.width) * vbW - PAD;
    const yTop = ((clientY - r.top) / r.height) * vbH - PAD;
    return {
      x: Math.max(0, Math.min(W, x)),
      y: Math.max(0, Math.min(H, H - yTop)),
    };
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const p = toMm(e.clientX, e.clientY);
    if (!p) return;
    const at = { x: Math.round(p.x), y: Math.round(p.y) };
    if (drag.kind === "corner") {
      onChange(points.map((q, i) => (i === drag.index ? at : q)));
    } else if (onChangeControls) {
      const base = controls.length ? controls : defaultControls(points);
      onChangeControls(base.map((q, i) => (i === drag.index ? at : q)));
    }
  }, [drag, points, controls, onChange, onChangeControls, toMm]);

  const outline = outlinePts.map((p) => `${p.x},${H - p.y}`).join(" ");
  const tick = (n: number, along: "x" | "y") => {
    const marks = [];
    for (let v = 0; v <= n; v += 10) {
      const major = v % 50 === 0;
      marks.push(
        along === "x"
          ? <line key={v} x1={v} y1={H} x2={v} y2={H + (major ? 7 : 4)} stroke="#eab308" strokeWidth={major ? 1 : 0.6} />
          : <line key={v} x1={0} y1={H - v} x2={-(major ? 7 : 4)} y2={H - v} stroke="#eab308" strokeWidth={major ? 1 : 0.6} />
      );
    }
    return marks;
  };

  return (
    <div className={variant === "overlay" ? "fin-editor fin-editor-overlay" : "fin-editor"}>
      <svg
        ref={svgRef}
        viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
        style={{ touchAction: "none" }}
      >
        {/* Allowed envelope. Over the 3D view it has to stay see-through so the
            rocket behind it is still readable. */}
        <rect
          x={0} y={0} width={W} height={H}
          fill={variant === "overlay" ? "#0f254055" : "#0f2540"}
          stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="5 4"
        />

        {/* Rulers */}
        {tick(W, "x")}
        {tick(H, "y")}
        <text x={0} y={H + 17} fontSize={9} fill="#eab308" textAnchor="middle">0</text>
        <text x={W} y={H + 17} fontSize={9} fill="#eab308" textAnchor="middle">{W}</text>
        <text x={-11} y={H + 3} fontSize={9} fill="#eab308" textAnchor="end">0</text>
        <text x={-11} y={3} fontSize={9} fill="#eab308" textAnchor="end">{H}</text>

        {/* Launcher, off limits */}
        <rect
          x={0}
          y={H - LAUNCHER_ZONE.stationMm}
          width={LAUNCHER_ZONE.spanMm}
          height={LAUNCHER_ZONE.stationMm}
          fill={geo.hitsLauncher ? "#7f1d1d" : "none"}
          stroke="#dc2626"
          strokeWidth={1.2}
        />
        <text x={LAUNCHER_ZONE.spanMm + 5} y={H - 16} fontSize={8.5} fill="#dc2626">
          Uchirish qurilmasi
        </text>
        <text x={LAUNCHER_ZONE.spanMm + 5} y={H - 6} fontSize={8.5} fill="#dc2626">
          (tegmasin)
        </text>

        {/* The fin itself */}
        <polygon
          points={outline}
          fill={geo.hitsLauncher ? "#dc262633" : "#22d3ee22"}
          stroke={geo.hitsLauncher ? "#dc2626" : "#22d3ee"}
          strokeWidth={1.6}
        />

        {/* Curve handles, one per edge, smaller than the corners so the two are
            never confused. Only present in curves mode. */}
        {curved && controls.map((c, i) => {
          const held = drag?.kind === "control" && drag.index === i;
          return (
            <g key={`c${i}`}>
              <line
                x1={points[i].x} y1={H - points[i].y}
                x2={c.x} y2={H - c.y}
                stroke="#f9731655" strokeWidth={0.8} strokeDasharray="3 2"
              />
              <circle
                cx={c.x} cy={H - c.y} r={held ? 5.5 : 3.8}
                fill={held ? "#f97316" : "#f9731688"}
                stroke="#f97316" strokeWidth={1.2}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: "control", index: i }); }}
              />
            </g>
          );
        })}

        {/* Draggable corners */}
        {points.map((p, i) => {
          const held = drag?.kind === "corner" && drag.index === i;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={H - p.y}
                r={held ? 7 : 5}
                fill={held ? "#f97316" : "#0f2540"}
                stroke="#22d3ee"
                strokeWidth={1.6}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: "corner", index: i }); }}
              />
              {held && (
                <text x={p.x + 10} y={H - p.y - 8} fontSize={9} fill="#f97316" fontFamily="monospace">
                  {p.x.toFixed(0)}, {p.y.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="fin-editor-legend">
        <span>span <b>{geo.spanMm.toFixed(0)}</b></span>
        <span>ildiz <b>{geo.rootChordMm.toFixed(0)}</b></span>
        <span>uch <b>{geo.tipChordMm.toFixed(0)}</b></span>
        <span>siljish <b>{geo.sweepMm.toFixed(0)}</b> mm</span>
      </div>
    </div>
  );
}
