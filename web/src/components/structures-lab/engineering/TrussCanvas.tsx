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
  /** Disables editing (drag/click-to-add/click-to-delete) - used for read-only displays like Competition. */
  readOnly?: boolean;
  /** Color members by how close each is to ITS OWN failure point instead of the flat safetyFactor<1 scheme. */
  intensityMode?: boolean;
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
  readOnly = false,
  intensityMode = false,
}: TrussCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

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

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!readOnly && e.target === stage && mode === "node" && stage) {
        const pos = stage.getPointerPosition();
        if (pos) onAddNode(snap(pos.x), snap(pos.y));
      }
    },
    [mode, onAddNode, readOnly]
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const gridLines = [];
  for (let x = 0; x <= dimensions.width; x += GRID_SIZE) {
    gridLines.push(<Line key={`gx${x}`} points={[x, 0, x, dimensions.height]} stroke="#1e2a44" strokeWidth={0.5} />);
  }
  for (let y = 0; y <= dimensions.height; y += GRID_SIZE) {
    gridLines.push(<Line key={`gy${y}`} points={[0, y, dimensions.width, y]} stroke="#1e2a44" strokeWidth={0.5} />);
  }

  return (
    <div ref={containerRef} className="flex-1 relative" style={{ background: "#0f1e3d" }}>
      <Stage width={dimensions.width} height={dimensions.height} onClick={handleStageClick}>
        <Layer listening={false}>
          <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#0f1e3d" />
          {gridLines}
        </Layer>

        <Layer>
          {members.map((m) => {
            const a = nodeMap.get(m.nodeA);
            const b = nodeMap.get(m.nodeB);
            if (!a || !b) return null;
            const res = solved?.get(m.id);
            let color = "#94a3b8";
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
              <Group key={m.id} onClick={() => !readOnly && mode === "delete" && onMemberClick(m.id)}>
                <Line points={[a.x, a.y, b.x, b.y]} stroke={color} strokeWidth={res && res.safetyFactor < 1 ? 5 : 3} />
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
        </Layer>

        <Layer>
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
                onDragEnd={(e) => onNodeDrag(n.id, snap(e.target.x()), snap(e.target.y()))}
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
