"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useElectronicsStore } from "../../store/electronicsStore";
import { COMPONENT_LIBRARY } from "./componentLibrary";
import { PlacedComponent, Terminal, ComponentType, Wire } from "./types";
import { acceptsLeads, findContacts, snapPosition, terminalWorldPos, worldTerminals, WorldTerminal } from "./geometry";
import ComponentView, { CompVisual } from "./ComponentView";
import { IconFocusCentered, IconHandMove, IconMinus, IconPlus } from "@tabler/icons-react";

const CANVAS_W = 2600;
const CANVAS_H = 1700;
/** Wire endpoints snap to a hole from under half a pitch, so the hole they pick
 *  is never ambiguous between two neighbours. */
const SNAP_WIRE = 9;
/** How far the pointer may be from a wire and still double-click it open. */
const WIRE_HIT = 8;
/** A bend within this of lining up with its neighbour is straightened to it. */
const ALIGN = 7;
/** Radius of the fillet drawn at a bend. */
const BEND_R = 9;

/**
 * Paint order on the canvas. Breadboards and boards are the surface everything
 * else is plugged into, so they sit at the bottom; without this a breadboard
 * dropped after an LED covered it, and its 420 hole hit-targets swallowed the
 * clicks meant for the parts sitting on top of it.
 */
const Z_SOCKET = 1;
const Z_WIRE = 2;
const Z_PART = 3;
const Z_CONTACT = 4;
/** While a wire is being routed it owns the canvas, so every click is a click
 *  on the wire rather than on whatever happens to be underneath. */
const Z_ROUTING = 6;

export { terminalWorldPos };

type Pt = { x: number; y: number };

/** The end-to-end shape of a wire: its two terminals with its bends between. */
function wirePoints(wire: Wire, components: PlacedComponent[]): Pt[] | null {
  const fc = components.find((c) => c.id === wire.from.compId);
  const tc = components.find((c) => c.id === wire.to.compId);
  if (!fc || !tc) return null;
  const fd = COMPONENT_LIBRARY[fc.type]?.terminals.find((t) => t.id === wire.from.terminalId);
  const td = COMPONENT_LIBRARY[tc.type]?.terminals.find((t) => t.id === wire.to.terminalId);
  if (!fd || !td) return null;
  return [terminalWorldPos(fc, fd), ...(wire.points ?? []), terminalWorldPos(tc, td)];
}

/** A polyline with its corners rounded off, so a routed wire still reads as wire. */
function wirePath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    if (!la || !lb) continue;
    const ra = Math.min(BEND_R, la / 2), rb = Math.min(BEND_R, lb / 2);
    d += ` L ${p.x + ((a.x - p.x) / la) * ra} ${p.y + ((a.y - p.y) / la) * ra}`;
    d += ` Q ${p.x} ${p.y} ${p.x + ((b.x - p.x) / lb) * rb} ${p.y + ((b.y - p.y) / lb) * rb}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/** Distance from `p` to segment ab, and the closest point on it. */
function projectOnSegment(p: Pt, a: Pt, b: Pt): { d: number; at: Pt } {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0;
  const at = { x: a.x + vx * t, y: a.y + vy * t };
  return { d: Math.hypot(p.x - at.x, p.y - at.y), at };
}

interface Props { visuals: Record<string, CompVisual>; }

/** A wire being routed: where it started, and the bends placed so far. */
interface Routing {
  compId: string;
  term: Terminal;
  points: Pt[];
  /** Where the pointer went down, to tell a click apart from a drag. */
  origin: Pt;
  /** True once the pointer has been released: the wire now trails the cursor. */
  sticky: boolean;
}

/** Under this much pointer travel the gesture was a click, not a drag. */
const CLICK_SLOP = 6;

export default function CircuitCanvas({ visuals }: Props) {
  const {
    components, wires, selectedId, selectedWireId, wireColor, addComponent, moveComponent, commitMove,
    select, selectWire, setProp, addWireBend, moveWireBend, removeWireBend,
  } = useElectronicsStore();

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);
  const bendRef = useRef<{ wireId: string; index: number; moved: boolean } | null>(null);
  const routingRef = useRef<Routing | null>(null);
  const [routing, setRouting] = useState<Routing | null>(null);
  const [cursor, setCursor] = useState<Pt>({ x: 0, y: 0 });
  /** Holes the part being dragged is about to be seated in, highlighted live. */
  const [snapHoles, setSnapHoles] = useState<Pt[]>([]);
  const [viewport, setViewport] = useState({ zoom: 0.72, x: 28, y: 24 });
  const [isPanning, setIsPanning] = useState(false);
  const viewportStateRef = useRef(viewport);
  const spacePressedRef = useRef(false);
  const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => { viewportStateRef.current = viewport; }, [viewport]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space" || (event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      spacePressedRef.current = true;
      event.preventDefault();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") spacePressedRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const setRoute = useCallback((r: Routing | null) => {
    routingRef.current = r;
    setRouting(r);
  }, []);

  /**
   * Client coordinates in canvas space, or null when there is no canvas to
   * measure against. React detaches refs during the commit phase but only
   * cleans up passive effects afterwards, so the window-level drag listeners
   * below outlive the element by a moment on unmount - a pointer moving during
   * that gap used to land here with a null ref.
   */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const el = viewportRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const view = viewportStateRef.current;
    return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
  }, []);

  const zoomAt = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const current = viewportStateRef.current;
    const zoom = Math.max(0.3, Math.min(2.2, nextZoom));
    const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const anchorY = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const worldX = (anchorX - current.x) / current.zoom;
    const worldY = (anchorY - current.y) / current.zoom;
    setViewport({ zoom, x: anchorX - worldX * zoom, y: anchorY - worldY * zoom });
  }, []);

  const resetViewport = useCallback(() => setViewport({ zoom: 0.72, x: 28, y: 24 }), []);

  const beginPan = useCallback((event: React.PointerEvent) => {
    if (!spacePressedRef.current && event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    const current = viewportStateRef.current;
    panRef.current = { startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const movePan = useCallback((event: React.PointerEvent) => {
    const start = panRef.current;
    if (!start) return;
    setViewport((current) => ({ ...current, x: start.originX + event.clientX - start.startX, y: start.originY + event.clientY - start.startY }));
  }, []);

  const endPan = useCallback(() => { panRef.current = null; setIsPanning(false); }, []);

  /**
   * Place a part at (x, y) but let the breadboard grid pull it into line, the
   * way Tinkercad does: the part follows the pointer in whole tie points once
   * it is over a board, so its legs are always in holes rather than between
   * them. Returns the holes it landed in, for the highlight.
   */
  const placeSnapped = useCallback((id: string, x: number, y: number) => {
    const comps = useElectronicsStore.getState().components;
    const me = comps.find((c) => c.id === id);
    if (!me) return [];
    const snapped = snapPosition(comps, me, x, y);
    moveComponent(id, snapped.x, snapped.y);
    return snapped.holes;
  }, [moveComponent]);

  /** The terminal a wire end would land on if it were dropped at `p`. */
  const terminalAt = useCallback((p: Pt): WorldTerminal | null => {
    let best: WorldTerminal | null = null;
    let bd = SNAP_WIRE;
    for (const t of worldTerminals(useElectronicsStore.getState().components)) {
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }, []);

  const finishWire = useCallback((start: Routing, compId: string, terminalId: string) => {
    useElectronicsStore.getState().addWire(
      { compId: start.compId, terminalId: start.term.id },
      { compId, terminalId },
      useElectronicsStore.getState().wireColor,
      start.points,
    );
    setRoute(null);
  }, [setRoute]);

  // ---- component dragging ----
  const onBodyPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    select(id);
    const comp = useElectronicsStore.getState().components.find((c) => c.id === id);
    const p = toCanvas(e.clientX, e.clientY);
    if (!comp || !p) return;
    dragRef.current = { id, offX: p.x - comp.x, offY: p.y - comp.y, moved: false };
  }, [select, toCanvas]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      if (!p) return;
      if (dragRef.current) {
        dragRef.current.moved = true;
        setSnapHoles(placeSnapped(dragRef.current.id, p.x - dragRef.current.offX, p.y - dragRef.current.offY));
      }
      const bend = bendRef.current;
      if (bend) {
        bend.moved = true;
        // Line the bend up with whichever neighbour it is nearly level with, so
        // dragging one produces a clean right angle instead of a near-miss.
        const wire = useElectronicsStore.getState().wires.find((w) => w.id === bend.wireId);
        const pts = wire ? wirePoints(wire, useElectronicsStore.getState().components) : null;
        let { x, y } = p;
        if (pts) {
          for (const n of [pts[bend.index], pts[bend.index + 2]]) {
            if (!n) continue;
            if (Math.abs(n.x - x) < ALIGN) x = n.x;
            if (Math.abs(n.y - y) < ALIGN) y = n.y;
          }
        }
        moveWireBend(bend.wireId, bend.index, x, y);
      }
      // A wire being routed follows the pointer with no button held.
      if (routingRef.current) setCursor(p);
    };
    const up = (e: PointerEvent) => {
      if (dragRef.current) {
        const { moved } = dragRef.current;
        dragRef.current = null;
        setSnapHoles([]);
        if (moved) commitMove();
      }
      if (bendRef.current) {
        const { moved } = bendRef.current;
        bendRef.current = null;
        if (moved) commitMove();
      }
      const start = routingRef.current;
      if (start && !start.sticky) {
        // Released after dragging out of a terminal: land on a terminal if the
        // pointer is over one, otherwise the wire stays attached to the cursor
        // and waits to be clicked into place. A release that never travelled is
        // a click, and must not be read as a drag onto the hole next door.
        const p = toCanvas(e.clientX, e.clientY);
        const dragged = p && Math.hypot(p.x - start.origin.x, p.y - start.origin.y) > CLICK_SLOP;
        const hit = dragged && p ? terminalAt(p) : null;
        if (hit && !(hit.compId === start.compId && hit.term.id === start.term.id)) {
          finishWire(start, hit.compId, hit.term.id);
        } else {
          setRoute({ ...start, sticky: true });
        }
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [toCanvas, placeSnapped, commitMove, moveWireBend, terminalAt, finishWire, setRoute]);

  // Escape drops a half-routed wire rather than leaving it stuck to the cursor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && routingRef.current) setRoute(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setRoute]);

  // ---- wiring ----
  const onTerminalPointerDown = useCallback((e: React.PointerEvent, compId: string, term: Terminal) => {
    e.preventDefault();
    const p = toCanvas(e.clientX, e.clientY);
    const start = routingRef.current;
    if (start) {
      if (start.compId === compId && start.term.id === term.id) setRoute(null); // back to the start: cancel
      else finishWire(start, compId, term.id);
      return;
    }
    if (!p) return;
    setRoute({ compId, term, points: [], origin: p, sticky: false });
    setCursor(p);
  }, [toCanvas, finishWire, setRoute]);

  const onTerminalPointerUp = useCallback((e: React.PointerEvent, compId: string, term: Terminal) => {
    const start = routingRef.current;
    if (!start || start.sticky) return;
    if (start.compId === compId && start.term.id === term.id) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (p && Math.hypot(p.x - start.origin.x, p.y - start.origin.y) <= CLICK_SLOP) return;
    finishWire(start, compId, term.id);
  }, [finishWire, toCanvas]);

  /** A click anywhere on the canvas while a wire is attached to the cursor. */
  const onRoutingClick = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const start = routingRef.current;
    const p = toCanvas(e.clientX, e.clientY);
    if (!start || !p) return;
    const hit = terminalAt(p);
    if (hit) {
      if (hit.compId === start.compId && hit.term.id === start.term.id) setRoute(null);
      else finishWire(start, hit.compId, hit.term.id);
      return;
    }
    // Empty space: drop a bend here and keep going, the way Tinkercad routes.
    setRoute({ ...start, points: [...start.points, { x: Math.round(p.x), y: Math.round(p.y) }] });
  }, [toCanvas, terminalAt, finishWire, setRoute]);

  // ---- palette drop ----
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("component") as ComponentType;
    const p = toCanvas(e.clientX, e.clientY);
    if (!type || !COMPONENT_LIBRARY[type] || !p) return;
    const def = COMPONENT_LIBRARY[type];
    const x = p.x - def.width / 2;
    const y = p.y - def.height / 2;
    const id = addComponent(type, x, y);
    // addComponent has already committed, so the snap has to run against the
    // state that now holds this part.
    placeSnapped(id, x, y);
  }, [addComponent, toCanvas, placeSnapped]);

  /** Double-clicking a wire breaks it open where it was hit. */
  const onWireDoubleClick = useCallback((e: React.MouseEvent, wire: Wire) => {
    e.stopPropagation();
    const p = toCanvas(e.clientX, e.clientY);
    const pts = wirePoints(wire, components);
    if (!p || !pts) return;
    let bestIdx = 0, bestD = Infinity, bestAt: Pt = p;
    for (let i = 0; i < pts.length - 1; i++) {
      const { d, at } = projectOnSegment(p, pts[i], pts[i + 1]);
      if (d < bestD) { bestD = d; bestIdx = i; bestAt = at; }
    }
    if (bestD > WIRE_HIT * 3) return;
    addWireBend(wire.id, bestIdx, bestAt.x, bestAt.y);
    selectWire(wire.id);
  }, [toCanvas, components, addWireBend, selectWire]);

  // Legs currently seated in a hole, marked so a placement that looks right can
  // be told apart from one that only nearly is.
  const contacts = useMemo(() => {
    const seen = new Set<string>();
    return findContacts(components).filter((c) => {
      const k = `${Math.round(c.hole.x)},${Math.round(c.hole.y)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [components]);

  // Sockets first so they paint (and hit-test) underneath everything plugged in.
  const ordered = useMemo(() => [
    ...components.filter((c) => acceptsLeads(c.type)),
    ...components.filter((c) => !acceptsLeads(c.type)),
  ], [components]);

  // The wire attached to the cursor, previewed through its bends so far.
  let preview: Pt[] | null = null;
  let snapTarget: Pt | null = null;
  if (routing) {
    const comp = components.find((c) => c.id === routing.compId);
    if (comp) {
      const start = terminalWorldPos(comp, routing.term);
      let nd = SNAP_WIRE;
      for (const t of worldTerminals(components)) {
        if (t.compId === routing.compId && t.term.id === routing.term.id) continue;
        const d = Math.hypot(t.x - cursor.x, t.y - cursor.y);
        if (d < nd) { nd = d; snapTarget = { x: t.x, y: t.y }; }
      }
      preview = [start, ...routing.points, snapTarget ?? cursor];
    }
  }

  return (
    <div
      ref={viewportRef}
      onPointerDownCapture={beginPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onWheel={(event) => {
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.0014);
        zoomAt(viewportStateRef.current.zoom * factor, event.clientX, event.clientY);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#edf1f2",
        cursor: isPanning ? "grabbing" : undefined,
        touchAction: "none",
      }}
    >
    <div
      ref={canvasRef}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDrop={onDrop}
      onPointerDown={(e) => { if (e.target === e.currentTarget && !spacePressedRef.current) { select(null); selectWire(null); } }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: CANVAS_W,
        height: CANVAS_H,
        transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
        transformOrigin: "0 0",
        backgroundColor: "#f7f8f9",
        backgroundImage: "radial-gradient(circle, #cfd7de 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        cursor: routing ? "crosshair" : undefined,
      }}
    >
      <svg width={CANVAS_W} height={CANVAS_H}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: Z_WIRE }}>
        {wires.map((w) => {
          const pts = wirePoints(w, components);
          if (!pts) return null;
          const d = wirePath(pts);
          const on = w.id === selectedWireId;
          return (
            <g key={w.id}>
              {/* A fat invisible stroke under the wire, so it can be hit without
                  having to land on 4px of line. */}
              <path d={d} stroke="transparent" strokeWidth={WIRE_HIT * 2} fill="none"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={(e) => { e.stopPropagation(); selectWire(w.id); }}
                onDoubleClick={(e) => onWireDoubleClick(e, w)} />
              {on && <path d={d} stroke="#2563eb" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.35} />}
              <path d={d} stroke="#00000022" strokeWidth={5.5} fill="none" strokeLinecap="round" />
              <path d={d} stroke={w.color} strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>

      {ordered.map((comp) => (
        <ComponentView
          key={comp.id}
          comp={comp}
          z={acceptsLeads(comp.type) ? Z_SOCKET : Z_PART}
          selected={comp.id === selectedId}
          visual={visuals[comp.id] ?? {}}
          onBodyPointerDown={onBodyPointerDown}
          onTerminalPointerDown={onTerminalPointerDown}
          onTerminalPointerUp={onTerminalPointerUp}
          setProp={setProp}
        />
      ))}

      {/* Plugged-in markers, drawn over the parts: a leg tip is hidden under the
          body it belongs to, so this is the only signal that it really landed. */}
      <svg width={CANVAS_W} height={CANVAS_H}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: Z_CONTACT }}>
        {snapHoles.map((h, i) => (
          <circle key={`s${i}`} cx={h.x} cy={h.y} r={6} fill="#16a34a22" stroke="#16a34a" strokeWidth={2} />
        ))}
        {!snapHoles.length && contacts.map((c) => (
          <circle key={`${c.lead.compId}:${c.lead.term.id}`} cx={c.hole.x} cy={c.hole.y} r={4}
            fill="none" stroke="#16a34a" strokeWidth={1.6} opacity={0.75} />
        ))}

        {/* Grab handles on the selected wire's bends: drag to route, double-click
            to straighten that corner back out. */}
        {(() => {
          const w = wires.find((x) => x.id === selectedWireId);
          if (!w?.points?.length) return null;
          return w.points.map((p, i) => (
            <circle key={`b${i}`} cx={p.x} cy={p.y} r={6}
              fill="#ffffff" stroke="#2563eb" strokeWidth={2}
              style={{ pointerEvents: "all", cursor: "grab" }}
              onPointerDown={(e) => { e.stopPropagation(); bendRef.current = { wireId: w.id, index: i, moved: false }; }}
              onDoubleClick={(e) => { e.stopPropagation(); removeWireBend(w.id, i); }} />
          ));
        })()}
      </svg>

      {/* While a wire is attached to the cursor this layer takes every click, so
          the next click always means "route here" and never "grab that part". */}
      {routing?.sticky && (
        <div
          onPointerDown={onRoutingClick}
          onContextMenu={(e) => { e.preventDefault(); setRoute(null); }}
          style={{ position: "absolute", inset: 0, zIndex: Z_ROUTING, cursor: "crosshair" }}
        />
      )}

      {preview && (
        <svg width={CANVAS_W} height={CANVAS_H}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: Z_ROUTING + 1 }}>
          <path d={wirePath(preview)} stroke={wireColor}
            strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
          {routing?.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={wireColor} />
          ))}
          {snapTarget && <circle cx={snapTarget.x} cy={snapTarget.y} r={7} fill="none" stroke="#16a34a" strokeWidth={2} />}
        </svg>
      )}
    </div>

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white p-1 shadow-[0_4px_16px_rgba(24,33,43,0.08)]">
        <button type="button" onClick={() => zoomAt(viewport.zoom / 1.16)} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]" aria-label="Kichraytirish"><IconMinus size={16} stroke={1.8} /></button>
        <span className="w-12 text-center font-mono text-[11px] font-semibold text-[var(--ink)]">{Math.round(viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => zoomAt(viewport.zoom * 1.16)} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]" aria-label="Kattalashtirish"><IconPlus size={16} stroke={1.8} /></button>
        <span className="mx-1 h-5 w-px bg-[var(--line)]" />
        <button type="button" onClick={resetViewport} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]" title="Ko‘rinishni tiklash" aria-label="Ko‘rinishni tiklash"><IconFocusCentered size={16} stroke={1.8} /></button>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white/95 px-3 py-2 text-[11px] font-medium text-[var(--ink-muted)]">
        <IconHandMove size={15} stroke={1.8} /> Space + sudrash: pan · g‘altak: zoom
      </div>
    </div>
  );
}
