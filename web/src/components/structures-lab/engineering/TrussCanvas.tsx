"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { TrussNode, TrussMemberDraft, BuilderMode, SolvedMember } from "./types";

const GRID_SIZE = 30;

function snap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function supportGlyph(support: TrussNode["support"], x: number, y: number) {
  if (support === "none") return null;
  if (support === "pin") {
    return <RegularTriangle x={x} y={y + 10} size={16} fill="#475569" />;
  }
  // rollers: triangle + small circles underneath
  return (
    <Group>
      <RegularTriangle x={x} y={y + 10} size={16} fill="#94a3b8" />
      <Circle x={x - 6} y={y + 22} radius={3} fill="#94a3b8" />
      <Circle x={x + 6} y={y + 22} radius={3} fill="#94a3b8" />
    </Group>
  );
}

function RegularTriangle({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  const points = [x, y, x - size / 2, y + size, x + size / 2, y + size];
  return <Line points={points} closed fill={fill} />;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function blendHex(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * A'zoning materiali bo'yicha rangi (tahlildan oldin).
 *
 * Ranglar 3D ko'rinishdagi material ranglariga mos: yog'och issiq jigarrang,
 * alyuminiy och kumush, po'lat to'q kulrang, uglerod tolasi deyarli qora —
 * shunda 2D chizma va 3D model bir xil "tilda" gapiradi.
 */
export const MATERIAL_SWATCHES: { match: string; label: string; color: string }[] = [
  { match: "alyuminiy", label: "Alyuminiy", color: "#cbd5e1" },
  { match: "po'lat", label: "Po'lat", color: "#7c8b99" },
  { match: "uglerod", label: "Uglerod tolasi", color: "#5b6bd6" },
  { match: "balsa", label: "Balsa yog'och", color: "#c19a6b" },
];

export function materialStrokeColor(label?: string): string {
  const normalized = (label ?? "").toLowerCase().replace("‘", "'");
  return MATERIAL_SWATCHES.find((s) => normalized.includes(s.match))?.color ?? "#94a3b8";
}

/** Gradient color by how close a member is to ITS OWN failure point (0 = unloaded, 1 = at limit). */
function intensityColor(inTension: boolean, fraction: number): string {
  const t = Math.max(0, Math.min(1, fraction));
  return inTension ? blendHex("#facc15", "#1d4ed8", t) : blendHex("#f59e0b", "#b91c1c", t);
}

function LoadArrow({ x, y, fx, fy }: { x: number; y: number; fx: number; fy: number }) {
  if (fx === 0 && fy === 0) return null;
  // Screen y grows downward; a negative fy (downward load) draws an arrow pointing down.
  const scale = 0.03;
  const dx = fx * scale;
  const dy = -fy * scale;
  const endX = x + dx;
  const endY = y + dy;
  return (
    <Group>
      <Line points={[x, y, endX, endY]} stroke="#dc2626" strokeWidth={2} />
      <RegularTriangle x={endX} y={endY - 6} size={10} fill="#dc2626" />
    </Group>
  );
}

interface TrussCanvasProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  mode: BuilderMode;
  memberFirstNode: string | null;
  solved: Map<string, SolvedMember> | null;
  onAddNode: (x: number, y: number) => void;
  onNodeClick: (id: string) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onMemberClick: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onDeleteMember?: (id: string) => void;
  /** Disables editing (drag/click-to-add/click-to-delete) - used for read-only displays like Competition. */
  readOnly?: boolean;
  /** Color members by how close each is to ITS OWN failure point instead of the flat safetyFactor<1 scheme. */
  intensityMode?: boolean;
  /** Re-centres the current truss whenever this token changes. */
  fitRequest?: number;
  /** Also scale the truss to fill the viewport, not just centre it. The builder
   * leaves this off so its grid stays 1:1 with the snap grid; read-only views
   * (the rally, results) turn it on so a small design isn't a speck in one
   * corner of a large canvas. */
  fitZoom?: boolean;
}

export default function TrussCanvas({
  nodes,
  members,
  mode,
  memberFirstNode,
  solved,
  onAddNode,
  onNodeClick,
  onNodeDrag,
  onMemberClick,
  onDeleteNode,
  onDeleteMember,
  readOnly = false,
  intensityMode = false,
  fitRequest = 0,
  fitZoom = false,
}: TrussCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [viewportScale, setViewportScale] = useState(1);
  const appliedFitRef = useRef("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // A window "resize" event alone misses flex-layout reflows that don't
    // resize the window itself (e.g. entering/leaving fullscreen, a sidebar
    // toggling) - a ResizeObserver on the container catches those too, so
    // the canvas can't get stuck at whatever size it happened to measure
    // on first mount.
    const resize = () => setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fitRequest <= 0 || nodes.length === 0) return;
    // Deliberately NOT keyed on the node list: in the builder the user adds
    // nodes one at a time, and re-fitting on every addition would yank the
    // view out from under them mid-drawing. A re-fit is always an explicit
    // request (the token) or a viewport resize.
    const fitKey = `${fitRequest}:${dimensions.width}:${dimensions.height}`;
    if (appliedFitRef.current === fitKey) return;
    appliedFitRef.current = fitKey;

    const minX = Math.min(...nodes.map((node) => node.x));
    const maxX = Math.max(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxY = Math.max(...nodes.map((node) => node.y));
    const centreX = (minX + maxX) / 2;
    const centreY = (minY + maxY) / 2;

    // Padding leaves room for the node glyphs and support triangles, which are
    // drawn outside the raw node bounding box.
    const padding = 90;
    const scale = fitZoom
      ? Math.max(
          0.35,
          Math.min(
            2.5,
            Math.min(
              (dimensions.width - padding * 2) / Math.max(maxX - minX, 1),
              (dimensions.height - padding * 2) / Math.max(maxY - minY, 1)
            )
          )
        )
      : 1;

    setViewportScale(scale);
    // Group transform is screen = offset + scale * model, so to land the truss
    // centre on the viewport centre the offset has to absorb the scale too.
    setViewportOffset({
      x: dimensions.width / 2 - centreX * scale,
      y: dimensions.height / 2 - centreY * scale,
    });
  }, [dimensions.height, dimensions.width, fitRequest, fitZoom, nodes]);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!readOnly && e.target === stage && mode === "node" && stage) {
        const pos = stage.getPointerPosition();
        // Inverse of the group transform above: model = (screen - offset) / scale.
        if (pos) {
          onAddNode(
            snap((pos.x - viewportOffset.x) / viewportScale),
            snap((pos.y - viewportOffset.y) / viewportScale)
          );
        }
      }
    },
    [mode, onAddNode, readOnly, viewportOffset, viewportScale]
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const gridLines = [];
  for (let x = 0; x <= dimensions.width; x += GRID_SIZE) {
    gridLines.push(<Line key={`gx${x}`} points={[x, 0, x, dimensions.height]} stroke="#263845" strokeWidth={0.5} />);
  }
  for (let y = 0; y <= dimensions.height; y += GRID_SIZE) {
    gridLines.push(<Line key={`gy${y}`} points={[0, y, dimensions.width, y]} stroke="#263845" strokeWidth={0.5} />);
  }

  // Faqat chizmada haqiqatan ishlatilgan materiallar ko'rsatiladi — to'liq
  // ro'yxat bo'sh ko'prikda ham joy egallab turardi.
  const usedMaterials = MATERIAL_SWATCHES.filter((swatch) =>
    members.some((m) => (m.materialLabel ?? "").toLowerCase().replace("‘", "'").includes(swatch.match))
  );

  return (
    <div ref={containerRef} className="relative flex-1" style={{ background: "#17212b" }}>
      {!solved && usedMaterials.length > 0 && (
        <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Material</div>
          <div className="flex flex-col gap-1">
            {usedMaterials.map((swatch) => (
              <div key={swatch.match} className="flex items-center gap-2">
                <span className="h-[3px] w-5 rounded-full" style={{ background: swatch.color }} />
                <span className="text-[10px] font-medium text-slate-300">{swatch.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onContextMenu={(event) => event.evt.preventDefault()}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#17212b" />
          {gridLines}
        </Layer>

        <Layer>
          <Group x={viewportOffset.x} y={viewportOffset.y} scaleX={viewportScale} scaleY={viewportScale}>
          {members.map((m) => {
            const a = nodeMap.get(m.nodeA);
            const b = nodeMap.get(m.nodeB);
            if (!a || !b) return null;
            const res = solved?.get(m.id);
            // Tahlildan oldin a'zo o'z materialining rangi bilan chiziladi.
            // Avval hammasi bir xil kulrang edi va aralash materialli
            // ko'prikda qaysi a'zo nimadan qilinganini bilib bo'lmasdi —
            // holbuki material a'zoning kuchini belgilaydigan asosiy tanlov.
            let color = materialStrokeColor(m.materialLabel);
            if (res) {
              if (intensityMode) {
                const fraction = res.safetyFactor > 0 ? 1 / res.safetyFactor : 1;
                color = intensityColor(res.inTension, fraction);
              } else {
                color = res.safetyFactor < 1 ? "#ff0000" : res.inTension ? "#3b82f6" : "#ef4444";
              }
            }
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            return (
              <Group
                key={m.id}
                onClick={() => !readOnly && mode === "delete" && onMemberClick(m.id)}
                onContextMenu={(event) => {
                  if (readOnly || !onDeleteMember) return;
                  event.evt.preventDefault();
                  event.cancelBubble = true;
                  onDeleteMember(m.id);
                }}
              >
                <Line points={[a.x, a.y, b.x, b.y]} stroke={color} strokeWidth={res && res.safetyFactor < 1 ? 5 : 3} hitStrokeWidth={14} />
                {res && (
                  <Text
                    x={midX - 16}
                    y={midY - 8}
                    text={res.safetyFactor < 1 ? "FAIL" : res.safetyFactor.toFixed(1)}
                    fontSize={9}
                    fill="#e2e8f0"
                    fontStyle="bold"
                  />
                )}
              </Group>
            );
          })}
          </Group>
        </Layer>

        <Layer>
          <Group x={viewportOffset.x} y={viewportOffset.y} scaleX={viewportScale} scaleY={viewportScale}>
          {memberFirstNode && nodeMap.get(memberFirstNode) && (
            <Circle x={nodeMap.get(memberFirstNode)!.x} y={nodeMap.get(memberFirstNode)!.y} radius={12} stroke="#facc15" strokeWidth={2} />
          )}
          {nodes.map((n) => (
            <Group key={n.id}>
              <LoadArrow x={n.x} y={n.y} fx={n.loadFx} fy={n.loadFy} />
              {supportGlyph(n.support, n.x, n.y)}
              <Circle
                x={n.x}
                y={n.y}
                radius={7}
                fill="#e2e8f0"
                stroke="#0f1e3d"
                strokeWidth={2}
                draggable={!readOnly && mode === "node"}
                onClick={() => !readOnly && onNodeClick(n.id)}
                onContextMenu={(event) => {
                  if (readOnly || !onDeleteNode) return;
                  event.evt.preventDefault();
                  event.cancelBubble = true;
                  onDeleteNode(n.id);
                }}
                onDragEnd={(e) => onNodeDrag(n.id, snap(e.target.x()), snap(e.target.y()))}
              />
            </Group>
          ))}
          </Group>
        </Layer>
      </Stage>
      {!readOnly && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] font-medium text-slate-300">
          Chap tugma: qo‘shish yoki tanlash · o‘ng tugma: elementni o‘chirish · Ctrl+Z: bekor qilish
        </div>
      )}
    </div>
  );
}
