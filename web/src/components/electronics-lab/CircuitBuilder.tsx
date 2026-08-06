"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { IconSettings, IconBolt, IconBulb, IconPower, IconTrash } from "@tabler/icons-react";

type ComponentType = "battery" | "led" | "switch";

interface CircuitNode {
  id: string;
  x: number;
  y: number;
}

interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  state?: boolean; // for switch (closed/open)
}

interface CircuitWire {
  id: string;
  fromComp: string;
  fromPin: string; // e.g. 'pos', 'neg', 'in', 'out'
  toComp: string;
  toPin: string;
}

// Fixed pins for components relative to their center
const PIN_OFFSETS = {
  battery: { pos: { x: 0, y: -30 }, neg: { x: 0, y: 30 } },
  led: { anode: { x: 0, y: 25 }, cathode: { x: -20, y: 25 } }, // Anode (+), Cathode (-)
  switch: { in: { x: -25, y: 0 }, out: { x: 25, y: 0 } },
};

const COMP_DIMENSIONS = {
  battery: { w: 40, h: 80 },
  led: { w: 40, h: 50 },
  switch: { w: 60, h: 30 },
};

export default function CircuitBuilder() {
  const [components, setComponents] = useState<CircuitComponent[]>([
    { id: "bat1", type: "battery", x: 100, y: 200 },
    { id: "led1", type: "led", x: 400, y: 150 },
    { id: "sw1", type: "switch", x: 250, y: 300, state: false },
  ]);
  const [wires, setWires] = useState<CircuitWire[]>([]);

  const [draggingComp, setDraggingComp] = useState<string | null>(null);
  const [drawingWire, setDrawingWire] = useState<{ comp: string; pin: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Simulation: graph traversal to find if battery is connected to LED
  const simulationResult = useMemo(() => {
    // Build adjacency list
    const adj = new Map<string, Set<string>>(); // "compId:pinId"
    const addEdge = (u: string, v: string) => {
      if (!adj.has(u)) adj.set(u, new Set());
      if (!adj.has(v)) adj.set(v, new Set());
      adj.get(u)!.add(v);
      adj.get(v)!.add(u);
    };

    wires.forEach(w => {
      addEdge(`${w.fromComp}:${w.fromPin}`, `${w.toComp}:${w.toPin}`);
    });

    // Also connect internal pins if the component allows current flow
    components.forEach(c => {
      if (c.type === "switch" && c.state) {
        addEdge(`${c.id}:in`, `${c.id}:out`);
      }
      if (c.type === "led") {
        // LED allows current from anode to cathode (one direction), but for simple undirected graph we just connect them
        addEdge(`${c.id}:anode`, `${c.id}:cathode`);
      }
    });

    // Check path from battery pos to battery neg
    const bat = components.find(c => c.type === "battery");
    if (!bat) return { onLeds: new Set<string>() };

    const start = `${bat.id}:pos`;
    const end = `${bat.id}:neg`;
    
    // BFS to find all reachable nodes from start
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (adj.has(curr)) {
        for (const next of Array.from(adj.get(curr)!)) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    }

    const onLeds = new Set<string>();
    if (visited.has(end)) {
      // Current flows! Any LED in the path is ON? Wait, if start is connected to end, and LED is in the visited set, it's ON.
      components.forEach(c => {
        if (c.type === "led" && visited.has(`${c.id}:anode`) && visited.has(`${c.id}:cathode`)) {
          // It's part of the connected component. Ideally check if it's on a path, but this is a simple approximation.
          onLeds.add(c.id);
        }
      });
    }

    return { onLeds };
  }, [components, wires]);

  const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const screenToSVG = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  const handlePointerDownSVG = (e: React.PointerEvent) => {
    // If clicking on empty space, we can do something like pan/zoom later
  };

  const handlePointerMoveSVG = (e: React.PointerEvent) => {
    if (draggingComp) {
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      setComponents(comps => comps.map(c => c.id === draggingComp ? { ...c, x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 } : c));
    } else if (drawingWire) {
      const { x, y } = screenToSVG(e.clientX, e.clientY);
      setDrawingWire(w => w ? { ...w, x, y } : null);
    }
  };

  const handlePointerUpSVG = () => {
    setDraggingComp(null);
    setDrawingWire(null);
  };

  const handlePinDown = (e: React.PointerEvent, compId: string, pinId: string) => {
    e.stopPropagation();
    const { x, y } = screenToSVG(e.clientX, e.clientY);
    setDrawingWire({ comp: compId, pin: pinId, x, y });
  };

  const handlePinUp = (e: React.PointerEvent, compId: string, pinId: string) => {
    e.stopPropagation();
    if (drawingWire && (drawingWire.comp !== compId || drawingWire.pin !== pinId)) {
      // Prevent duplicate wires
      const exists = wires.find(w => 
        (w.fromComp === drawingWire.comp && w.fromPin === drawingWire.pin && w.toComp === compId && w.toPin === pinId) ||
        (w.toComp === drawingWire.comp && w.toPin === drawingWire.pin && w.fromComp === compId && w.fromPin === pinId)
      );
      if (!exists) {
        setWires([...wires, {
          id: `wire_${Date.now()}`,
          fromComp: drawingWire.comp,
          fromPin: drawingWire.pin,
          toComp: compId,
          toPin: pinId
        }]);
      }
    }
    setDrawingWire(null);
  };

  const toggleSwitch = (id: string) => {
    setComponents(comps => comps.map(c => c.id === id ? { ...c, state: !c.state } : c));
  };

  const deleteComponent = (id: string) => {
    setComponents(comps => comps.filter(c => c.id !== id));
    setWires(ws => ws.filter(w => w.fromComp !== id && w.toComp !== id));
  };

  const deleteWire = (id: string) => {
    setWires(ws => ws.filter(w => w.id !== id));
  };

  const addComponent = (type: ComponentType) => {
    setComponents([...components, {
      id: `${type}_${Date.now()}`,
      type,
      x: 300,
      y: 200,
      state: type === "switch" ? false : undefined
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1321] text-white rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#0a0e18]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center">
            <IconBolt size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Build & Test</h1>
            <p className="text-xs text-slate-400">Elektron zanjirlarni yig'ing va tekshiring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => addComponent("battery")} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 flex items-center gap-1.5"><IconBolt size={14}/> Batareya</button>
          <button onClick={() => addComponent("led")} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 flex items-center gap-1.5"><IconBulb size={14}/> LED</button>
          <button onClick={() => addComponent("switch")} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 flex items-center gap-1.5"><IconPower size={14}/> Kalit</button>
          <button onClick={() => { setComponents([]); setWires([]); }} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 flex items-center gap-1.5"><IconTrash size={14}/> Tozalash</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ touchAction: 'none' }}>
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDownSVG}
          onPointerMove={handlePointerMoveSVG}
          onPointerUp={handlePointerUpSVG}
          onPointerLeave={handlePointerUpSVG}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.05)" />
            </pattern>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Wires */}
          {wires.map(w => {
            const fromC = components.find(c => c.id === w.fromComp);
            const toC = components.find(c => c.id === w.toComp);
            if (!fromC || !toC) return null;
            const fp = (PIN_OFFSETS as any)[fromC.type][w.fromPin];
            const tp = (PIN_OFFSETS as any)[toC.type][w.toPin];
            const fx = fromC.x + fp.x;
            const fy = fromC.y + fp.y;
            const tx = toC.x + tp.x;
            const ty = toC.y + tp.y;
            return (
              <g key={w.id} onClick={(e) => { e.stopPropagation(); deleteWire(w.id); }} style={{ cursor: 'pointer' }}>
                <path d={`M ${fx} ${fy} L ${tx} ${ty}`} stroke="transparent" strokeWidth="15" fill="none" />
                <path d={`M ${fx} ${fy} L ${tx} ${ty}`} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="none" className="hover:stroke-red-400 transition-colors" />
              </g>
            );
          })}

          {/* Drawing Wire */}
          {drawingWire && (
            <path
              d={`M ${components.find(c => c.id === drawingWire.comp)!.x + (PIN_OFFSETS as any)[components.find(c => c.id === drawingWire.comp)!.type][drawingWire.pin].x} ${components.find(c => c.id === drawingWire.comp)!.y + (PIN_OFFSETS as any)[components.find(c => c.id === drawingWire.comp)!.type][drawingWire.pin].y} L ${drawingWire.x} ${drawingWire.y}`}
              stroke="#fb923c"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
            />
          )}

          {/* Components */}
          {components.map(c => {
            const dims = (COMP_DIMENSIONS as any)[c.type];
            const pins = (PIN_OFFSETS as any)[c.type];
            const isOn = c.type === "led" && simulationResult.onLeds.has(c.id);

            return (
              <g key={c.id} transform={`translate(${c.x}, ${c.y})`} onPointerDown={(e) => { e.stopPropagation(); setDraggingComp(c.id); }} style={{ cursor: 'grab' }}>
                {c.type === "battery" && (
                  <g>
                    <rect x={-dims.w/2} y={-dims.h/2} width={dims.w} height={dims.h} rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                    <rect x={-dims.w/2} y={-dims.h/2} width={dims.w} height={dims.h*0.3} rx="4" fill="#ef4444" />
                    <text x="0" y="-10" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle">+</text>
                    <text x="0" y="15" fill="#94a3b8" fontSize="14" fontWeight="bold" textAnchor="middle">-</text>
                    <text x="0" y="-38" fill="white" fontSize="10" textAnchor="middle">9V</text>
                  </g>
                )}

                {c.type === "led" && (
                  <g>
                    {/* Bulb */}
                    <circle cx="0" cy="-15" r="15" fill={isOn ? "#fbbf24" : "#cbd5e1"} filter={isOn ? "url(#glow)" : undefined} opacity={isOn ? 1 : 0.4} stroke={isOn ? "#f59e0b" : "#94a3b8"} strokeWidth="2" />
                    {/* Legs */}
                    <path d="M 0 0 L 0 25" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M -10 0 L -10 15 L -20 25" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "switch" && (
                  <g onClick={(e) => { if (!draggingComp) { e.stopPropagation(); toggleSwitch(c.id); } }}>
                    <rect x={-dims.w/2} y={-dims.h/2} width={dims.w} height={dims.h} rx="2" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                    <circle cx="-15" cy="0" r="4" fill="#94a3b8" />
                    <circle cx="15" cy="0" r="4" fill="#94a3b8" />
                    <path d={c.state ? "M -15 0 L 15 0" : "M -15 0 L 12 -12"} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className="transition-all duration-200" />
                  </g>
                )}

                {/* Pins */}
                {Object.keys(pins).map(pinId => (
                  <circle
                    key={pinId}
                    cx={pins[pinId].x}
                    cy={pins[pinId].y}
                    r="6"
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                    onPointerDown={(e) => handlePinDown(e, c.id, pinId)}
                    onPointerUp={(e) => handlePinUp(e, c.id, pinId)}
                    className="hover:fill-blue-400 hover:scale-125 transition-transform cursor-crosshair"
                  />
                ))}

                {/* Delete Button */}
                {!draggingComp && (
                  <g transform={`translate(${dims.w/2 + 10}, ${-dims.h/2 - 10})`} onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }} style={{ cursor: 'pointer' }} className="opacity-0 hover:opacity-100 group">
                    <circle cx="0" cy="0" r="10" fill="#ef4444" />
                    <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </g>
                )}
                {/* Invisible hover area to reveal delete */}
                <rect x={-dims.w/2-10} y={-dims.h/2-20} width={dims.w+30} height={dims.h+30} fill="transparent" />
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-[#0a0e18]/80 backdrop-blur border border-white/10 rounded-lg p-3 text-xs text-slate-400 max-w-xs">
          Sim ulanishi uchun tugunlarni (ko'k nuqtalar) bosing va torting. Komponentlarni surish uchun markazidan torting. Kalitni yoqish/o'chirish uchun uning ustiga bosing. Simni o'chirish uchun ustiga bosing.
        </div>
      </div>
    </div>
  );
}
