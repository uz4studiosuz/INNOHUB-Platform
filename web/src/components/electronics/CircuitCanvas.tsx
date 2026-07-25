"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useElectronicsStore } from "../../store/electronicsStore";
import { COMPONENT_LIBRARY } from "./componentLibrary";
import { PlacedComponent, Terminal, ComponentType } from "./types";
import ComponentView, { CompVisual } from "./ComponentView";

const CANVAS_W = 2600;
const CANVAS_H = 1700;
const SNAP_WIRE = 15; // px to snap a wire endpoint to a hole
const SNAP_COMP = 12; // px to snap a component leg onto a hole

export function terminalWorldPos(comp: PlacedComponent, term: Terminal) {
  const def = COMPONENT_LIBRARY[comp.type];
  const cx = comp.x + def.width / 2;
  const cy = comp.y + def.height / 2;
  const dx = term.x - def.width / 2;
  const dy = term.y - def.height / 2;
  const th = (comp.rotation * Math.PI) / 180;
  return {
    x: cx + dx * Math.cos(th) - dy * Math.sin(th),
    y: cy + dx * Math.sin(th) + dy * Math.cos(th),
  };
}

interface WT { compId: string; term: Terminal; x: number; y: number; }

function allTerminals(components: PlacedComponent[]): WT[] {
  const out: WT[] = [];
  for (const c of components) {
    for (const t of COMPONENT_LIBRARY[c.type].terminals) {
      const p = terminalWorldPos(c, t);
      out.push({ compId: c.id, term: t, x: p.x, y: p.y });
    }
  }
  return out;
}

interface Props { visuals: Record<string, CompVisual>; }

export default function CircuitCanvas({ visuals }: Props) {
  const { components, wires, selectedId, addComponent, moveComponent, commitMove, select, removeWire, setProp } =
    useElectronicsStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);
  const wiringRef = useRef<{ compId: string; term: Terminal } | null>(null);
  const [wiring, setWiring] = useState<{ compId: string; term: Terminal } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }, []);

  // snap a just-moved component so its nearest leg lands on the nearest hole of another component
  const snapComponent = useCallback((id: string) => {
    const comps = useElectronicsStore.getState().components;
    const me = comps.find((c) => c.id === id);
    if (!me) return;
    const myTerms = COMPONENT_LIBRARY[me.type].terminals.map((t) => terminalWorldPos(me, t));
    const others = allTerminals(comps.filter((c) => c.id !== id));
    let best: { dx: number; dy: number; d: number } | null = null;
    for (const mt of myTerms) {
      for (const ot of others) {
        const dx = ot.x - mt.x, dy = ot.y - mt.y;
        const d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { dx, dy, d };
      }
    }
    if (best && best.d < SNAP_COMP) moveComponent(id, me.x + best.dx, me.y + best.dy);
  }, [moveComponent]);

  // ---- component dragging ----
  const onBodyPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    select(id);
    const comp = useElectronicsStore.getState().components.find((c) => c.id === id);
    if (!comp) return;
    const p = toCanvas(e.clientX, e.clientY);
    dragRef.current = { id, offX: p.x - comp.x, offY: p.y - comp.y, moved: false };
  }, [select, toCanvas]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      if (dragRef.current) {
        dragRef.current.moved = true;
        moveComponent(dragRef.current.id, p.x - dragRef.current.offX, p.y - dragRef.current.offY);
      }
      if (wiringRef.current) setCursor(p);
    };
    const up = (e: PointerEvent) => {
      if (dragRef.current) {
        const { id, moved } = dragRef.current;
        dragRef.current = null;
        if (moved) { snapComponent(id); commitMove(); }
      }
      if (wiringRef.current) {
        // released on empty space: try snapping to nearest terminal
        const start = wiringRef.current;
        const p = toCanvas(e.clientX, e.clientY);
        const cands = allTerminals(useElectronicsStore.getState().components)
          .filter((t) => !(t.compId === start.compId && t.term.id === start.term.id));
        let nearest: WT | null = null; let nd = SNAP_WIRE;
        for (const t of cands) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < nd) { nd = d; nearest = t; } }
        if (nearest) {
          const color = useElectronicsStore.getState().wireColor;
          useElectronicsStore.getState().addWire(
            { compId: start.compId, terminalId: start.term.id },
            { compId: nearest.compId, terminalId: nearest.term.id },
            color
          );
        }
        wiringRef.current = null;
        setWiring(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [moveComponent, toCanvas, snapComponent, commitMove]);

  // ---- wiring ----
  const onTerminalPointerDown = useCallback((e: React.PointerEvent, compId: string, term: Terminal) => {
    e.preventDefault();
    wiringRef.current = { compId, term };
    setWiring({ compId, term });
    setCursor(toCanvas(e.clientX, e.clientY));
  }, [toCanvas]);

  const onTerminalPointerUp = useCallback((_e: React.PointerEvent, compId: string, term: Terminal) => {
    const start = wiringRef.current;
    if (start && !(start.compId === compId && start.term.id === term.id)) {
      const color = useElectronicsStore.getState().wireColor;
      useElectronicsStore.getState().addWire(
        { compId: start.compId, terminalId: start.term.id },
        { compId, terminalId: term.id },
        color
      );
    }
    wiringRef.current = null;
    setWiring(null);
  }, []);

  // ---- palette drop ----
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("component") as ComponentType;
    if (!type || !COMPONENT_LIBRARY[type]) return;
    const p = toCanvas(e.clientX, e.clientY);
    const def = COMPONENT_LIBRARY[type];
    const id = addComponent(type, p.x - def.width / 2, p.y - def.height / 2);
    requestAnimationFrame(() => snapComponent(id));
  }, [addComponent, toCanvas, snapComponent]);

  const pinToggle = useCallback((id: string, pressed: boolean) => {
    setProp(id, "pressed", pressed ? 1 : 0);
  }, [setProp]);

  // temp wire endpoint (with live snapping preview)
  let wireStart: { x: number; y: number } | null = null;
  let snapTarget: { x: number; y: number } | null = null;
  if (wiring) {
    const comp = components.find((c) => c.id === wiring.compId);
    if (comp) wireStart = terminalWorldPos(comp, wiring.term);
    let nd = SNAP_WIRE;
    for (const t of allTerminals(components)) {
      if (t.compId === wiring.compId && t.term.id === wiring.term.id) continue;
      const d = Math.hypot(t.x - cursor.x, t.y - cursor.y);
      if (d < nd) { nd = d; snapTarget = { x: t.x, y: t.y }; }
    }
  }
  const wireEnd = snapTarget ?? cursor;

  return (
    <div
      ref={canvasRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onPointerDown={(e) => { if (e.target === e.currentTarget) select(null); }}
      style={{
        position: "relative",
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "#eef1f4",
        backgroundImage: "radial-gradient(circle, #d3d9e0 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <svg width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {wires.map((w) => {
          const fc = components.find((c) => c.id === w.from.compId);
          const tc = components.find((c) => c.id === w.to.compId);
          if (!fc || !tc) return null;
          const fd = COMPONENT_LIBRARY[fc.type].terminals.find((t) => t.id === w.from.terminalId);
          const td = COMPONENT_LIBRARY[tc.type].terminals.find((t) => t.id === w.to.terminalId);
          if (!fd || !td) return null;
          const a = terminalWorldPos(fc, fd);
          const b = terminalWorldPos(tc, td);
          const dx = Math.abs(b.x - a.x);
          const c1 = { x: a.x, y: a.y + Math.max(30, dx * 0.3) };
          const c2 = { x: b.x, y: b.y + Math.max(30, dx * 0.3) };
          return (
            <g key={w.id} style={{ pointerEvents: "stroke" }}>
              <path d={`M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`}
                stroke="#00000022" strokeWidth={5.5} fill="none" strokeLinecap="round" />
              <path d={`M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`}
                stroke={w.color} strokeWidth={4} fill="none" strokeLinecap="round"
                style={{ cursor: "pointer" }} onClick={() => removeWire(w.id)} />
            </g>
          );
        })}
        {wireStart && wiring && (
          <>
            <path d={`M ${wireStart.x} ${wireStart.y} L ${wireEnd.x} ${wireEnd.y}`}
              stroke={useElectronicsStore.getState().wireColor} strokeWidth={3.5} fill="none" strokeLinecap="round"
              opacity={0.85} />
            {snapTarget && <circle cx={snapTarget.x} cy={snapTarget.y} r={7} fill="none" stroke="#16a34a" strokeWidth={2} />}
          </>
        )}
      </svg>

      {components.map((comp) => (
        <ComponentView
          key={comp.id}
          comp={comp}
          selected={comp.id === selectedId}
          visual={visuals[comp.id] ?? {}}
          onBodyPointerDown={onBodyPointerDown}
          onTerminalPointerDown={onTerminalPointerDown}
          onTerminalPointerUp={onTerminalPointerUp}
          pinToggle={pinToggle}
        />
      ))}
    </div>
  );
}
