"use client";

import React from "react";
import { PlacedComponent, Terminal } from "./types";
import { ART, COMPONENT_LIBRARY, LED_COLORS } from "./componentLibrary";
import { BB } from "./breadboard";

export interface CompVisual {
  led?: number;
  rgb?: { r: number; g: number; b: number };
  servo?: number;
  buzzer?: number;
  warning?: string;
}

interface Props {
  comp: PlacedComponent;
  selected: boolean;
  visual: CompVisual;
  onBodyPointerDown: (e: React.PointerEvent, id: string) => void;
  onTerminalPointerDown: (e: React.PointerEvent, compId: string, term: Terminal) => void;
  onTerminalPointerUp: (e: React.PointerEvent, compId: string, term: Terminal) => void;
  pinToggle?: (id: string, pressed: boolean) => void;
}

/**
 * Hit target over each pin. The artwork already draws the pin holes and their
 * silkscreen labels, so the target itself stays invisible and only lights up on
 * hover (see `.elec-terminal` in globals.css) - painting a dot on all 420 holes
 * of a breadboard would bury the board underneath them.
 */
const TERMINAL_SIZE = 13;

function hex(v: number) {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return n.toString(16).padStart(2, "0");
}

export default function ComponentView({
  comp, selected, visual, onBodyPointerDown, onTerminalPointerDown, onTerminalPointerUp, pinToggle,
}: Props) {
  const def = COMPONENT_LIBRARY[comp.type];
  const w = def.width, h = def.height;

  return (
    <div
      style={{
        position: "absolute",
        left: comp.x,
        top: comp.y,
        width: w,
        height: h,
        transform: `rotate(${comp.rotation}deg)`,
        transformOrigin: "center",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        outline: selected ? "2px solid #2563eb" : undefined,
        outlineOffset: 3,
        borderRadius: 4,
      }}
    >
      <svg
        width={w}
        height={h}
        onPointerDown={(e) => onBodyPointerDown(e, comp.id)}
        style={{ overflow: "visible" }}
      >
        <Graphic comp={comp} visual={visual} selected={selected} pinToggle={pinToggle} />
      </svg>

      {def.terminals.map((t) => (
        <div
          key={t.id}
          title={t.label || t.id}
          onPointerDown={(e) => { e.stopPropagation(); onTerminalPointerDown(e, comp.id, t); }}
          onPointerUp={(e) => { e.stopPropagation(); onTerminalPointerUp(e, comp.id, t); }}
          className="elec-terminal"
          style={{
            position: "absolute",
            left: t.x - TERMINAL_SIZE / 2,
            top: t.y - TERMINAL_SIZE / 2,
            width: TERMINAL_SIZE,
            height: TERMINAL_SIZE,
            cursor: "crosshair",
            zIndex: 5,
          }}
        />
      ))}
    </div>
  );
}

/** Colour code of a 4-band resistor, so the bands match the value on screen. */
const BAND_DIGIT = [
  "#0d0d0d", "#8a3d06", "#c40808", "#e85b0c", "#e8c800",
  "#0b7a0b", "#1f44b7", "#7a2daf", "#8c8c8c", "#f2f2f2",
];
const BAND_GOLD = "#ad9f4e";

function resistorBands(ohms: number): [string, string, string] {
  const digits = String(Math.round(Math.max(1, Math.min(99e9, ohms))));
  if (digits.length < 2) return [BAND_DIGIT[0], BAND_DIGIT[Number(digits)], BAND_GOLD];
  return [
    BAND_DIGIT[Number(digits[0])],
    BAND_DIGIT[Number(digits[1])],
    BAND_DIGIT[Math.min(9, digits.length - 2)],
  ];
}

function Graphic({ comp, visual, selected, pinToggle }: {
  comp: PlacedComponent; visual: CompVisual; selected: boolean; pinToggle?: (id: string, p: boolean) => void;
}) {
  const def = COMPONENT_LIBRARY[comp.type];
  const stroke = selected ? "#2563eb" : "#475569";
  // Fritzing draws each part complete - silkscreen, headers, chip, leads - so
  // for most types the whole graphic is just its artwork, and all we add on top
  // is the live state the simulation produces.
  const art = (src: string) => (
    <image href={`/electronics/${src}`} x={0} y={0} width={def.width} height={def.height} />
  );
  const readout = (text: string, above: boolean) => (
    <text
      x={def.width / 2}
      y={above ? -5 : def.height + 12}
      textAnchor="middle"
      fontSize={11}
      fontFamily="monospace"
      fill="#334155"
    >
      {text}
    </text>
  );

  switch (comp.type) {
    case "arduino-uno":
      return art("arduino-uno.svg");

    case "breadboard":
      // The Fritzing half-breadboard is printed bare, so the coloured power-rail
      // stripes a real board carries are drawn over it here.
      return (
        <g>
          {art("breadboard.svg")}
          {BB.railMarks.map((m) => (
            <g key={m.y}>
              <line x1={BB.railFromX} y1={m.y} x2={BB.railToX} y2={m.y} stroke={m.color} strokeWidth={1.6} opacity={0.8} />
              <text x={BB.railFromX - 9} y={m.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={m.color}>{m.sign}</text>
              <text x={BB.railToX + 9} y={m.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={m.color}>{m.sign}</text>
            </g>
          ))}
        </g>
      );

    case "led": {
      const b = visual.led ?? 0;
      const name = String(comp.props.color ?? "red");
      const key = name in LED_COLORS ? name : "red";
      const color = LED_COLORS[key];
      const a = ART.led;
      return (
        <g>
          {b > 0 && <circle cx={a.cx} cy={a.cy} r={a.r * (1.2 + 0.7 * b)} fill={color} opacity={0.1 + 0.26 * b} />}
          {art(`led-${key}.svg`)}
          {b > 0 && <circle cx={a.cx} cy={a.cy} r={a.r} fill={color} opacity={0.15 + 0.4 * b} />}
          {visual.warning && <text x={a.cx} y={-4} textAnchor="middle" fontSize={14}>⚠️</text>}
        </g>
      );
    }

    case "rgb-led": {
      const c = visual.rgb ?? { r: 0, g: 0, b: 0 };
      const peak = Math.max(c.r, c.g, c.b);
      const fill = `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
      const a = ART.rgb;
      return (
        <g>
          {peak > 0 && <circle cx={a.cx} cy={a.cy} r={a.r * (1.5 + 0.9 * peak)} fill={fill} opacity={0.12 + 0.3 * peak} />}
          {art("rgb-led.svg")}
          {peak > 0 && <circle cx={a.cx} cy={a.cy} r={a.r} fill={fill} opacity={0.2 + 0.5 * peak} />}
        </g>
      );
    }

    case "resistor": {
      // Inlined rather than served as a file so the bands can be recoloured to
      // whatever value the part is set to; the paths are Fritzing's own.
      const ohms = Number(comp.props.ohms ?? 220);
      const [b1, b2, b3] = resistorBands(ohms);
      return (
        <g>
          <g transform={`scale(${ART.resistor.scale})`}>
            <line strokeLinecap="round" x1={1.455} y1={5.045} x2={2.91} y2={5.045} stroke="#8C8C8C" fill="none" strokeWidth={2.91} />
            <line strokeLinecap="round" x1={41.462} y1={5.045} x2={40.007} y2={5.045} stroke="#8C8C8C" fill="none" strokeWidth={2.91} />
            <path fill="none" stroke="#8C8C8C" strokeWidth={2.91} d="M1.455,5.045l39.398,0" />
            <path fill="#D9B477" d="M14.233,0.688c-0.5-0.23-1.36-0.41-1.91-0.41h-2.76c-0.55,0-1,0.45-1,1v7.439c0,0.551,0.45,1,1,1
              h2.76c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.5-0.23,1.36-0.41,1.91-0.41h9.98c0.551,0,1.409,0.189,1.909,0.41l0.101,0.049
              c0.5,0.23,1.358,0.41,1.91,0.41h2.76c0.552,0,1-0.449,1-1V1.278c0-0.55-0.448-1-1-1h-2.76c-0.552,0-1.41,0.19-1.91,0.41
              l-0.101,0.05c-0.5,0.23-1.358,0.41-1.909,0.41h-9.98c-0.55,0-1.41-0.19-1.91-0.41L14.233,0.688z" />
            <rect x={30.582} y={0.269} fill={BAND_GOLD} width={0.976} height={9.438} />
            <rect x={22.462} y={1.148} fill={b3} width={2.57} height={7.69} />
            <rect x={17.323} y={1.148} fill={b2} width={2.57} height={7.69} />
            <path fill={b1} d="M14.762,0.888c-0.16-0.05-0.31-0.1-0.43-0.16l-0.1-0.05c-0.5-0.229-1.36-0.41-1.91-0.41
              h-0.12v9.439h0.12c0.55,0,1.41-0.189,1.91-0.41l0.1-0.049c0.12-0.062,0.27-0.111,0.43-0.16V0.888z" />
            <path opacity={0.3} d="M32.932,5.68L32.932,5.68c0,0.527-0.181,0.971-0.41,0.971h-2.67
              c-0.528,0-1.358-0.078-1.851-0.17L27.9,6.459c-0.479-0.09-1.318-0.17-1.852-0.17H16.4c-0.53,0-1.36,0.08-1.85,0.17l-0.1,0.021
              c-0.48,0.091-1.31,0.17-1.85,0.17h-0.44h-1.39h-0.43c-0.53,0-0.97,0.408-0.97,0.896v0.343V8.11v0.24c0,0.5,0.44,0.896,0.97,0.896
              h2.25c0.53,0,1.36-0.17,1.85-0.371l0.1-0.039c0.48-0.196,1.32-0.368,1.85-0.368h9.648c0.527,0,1.357,0.172,1.853,0.369l0.103,0.039
              c0.479,0.201,1.312,0.371,1.852,0.371h3.09c0.529,0,0.971-0.41,0.971-0.896V7.6V6.249V3.688C33.522,3.838,32.932,4.258,32.932,5.68z" />
            <rect x={30.582} y={4.838} opacity={0.4} width={0.976} height={4.379} />
            <path opacity={0.25} fill="#FFFFFF" d="M27.432,1.508c0.319,0,0.682-0.14,0.92-0.24
              c0.28-0.11,0.801-0.2,1.342-0.2h2.029c0.312,0,0.312,0.34,0.312,0.52c0,0.18-0.021,0.53-0.312,0.53h-4.25
              c-0.149,0-0.32-0.16-0.32-0.311C27.162,1.688,27.262,1.508,27.432,1.508z" />
            <circle opacity={0.35} fill="#FFFFFF" cx={9.722} cy={1.578} r={0.6} />
            <rect x={30.582} y={0.588} opacity={0.5} fill="#FFFF33" width={0.976} height={2.25} />
            <rect x={30.582} y={1.088} opacity={0.5} fill="#FFFFFF" width={0.976} height={1.04} />
          </g>
          {readout(ohms >= 1000 ? `${ohms / 1000}kΩ` : `${ohms}Ω`, true)}
        </g>
      );
    }

    case "pushbutton": {
      const pressed = !!comp.props.pressed;
      const a = ART.button;
      return (
        <g>
          {art("pushbutton.svg")}
          <circle
            cx={a.cx} cy={a.cy} r={a.r}
            fill="#000000"
            opacity={pressed ? 0.4 : 0}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => { e.stopPropagation(); pinToggle?.(comp.id, true); }}
            onPointerUp={(e) => { e.stopPropagation(); pinToggle?.(comp.id, false); }}
            onPointerLeave={() => pinToggle?.(comp.id, false)}
          />
        </g>
      );
    }

    case "buzzer": {
      const on = (visual.buzzer ?? 0) > 0;
      const a = ART.piezo;
      return (
        <g>
          {art("piezo.svg")}
          {on && (
            <>
              <circle cx={a.cx} cy={a.cy} r={a.r * 1.14} fill="none" stroke="#22d3ee" strokeWidth={3} opacity={0.7} />
              <circle cx={a.cx} cy={a.cy} r={a.r * 1.34} fill="none" stroke="#22d3ee" strokeWidth={3} opacity={0.35} />
            </>
          )}
        </g>
      );
    }

    case "potentiometer": {
      // The artwork is a side view, so the wiper position gets its own little
      // dial above the shaft rather than a knob mark that would never be seen.
      const v = Number(comp.props.value ?? 512);
      const ang = (-135 + (v / 1023) * 270 - 90) * Math.PI / 180;
      return (
        <g>
          {art("potentiometer.svg")}
          <g transform={`translate(${def.width / 2}, -14)`}>
            <circle r={10} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} />
            <line x1={0} y1={0} x2={7 * Math.cos(ang)} y2={7 * Math.sin(ang)} stroke="#0f172a" strokeWidth={2} strokeLinecap="round" />
          </g>
          {readout(String(v), false)}
        </g>
      );
    }

    case "servo": {
      // servo-horn.svg shares the body's viewBox, so rotating it about the hub
      // sweeps the real horn artwork exactly where a real one would travel.
      const ang = visual.servo ?? 0;
      const a = ART.servo;
      return (
        <g>
          {art("servo-body.svg")}
          <g transform={`rotate(${ang - 90}, ${a.hubX}, ${a.hubY})`}>
            {art("servo-horn.svg")}
          </g>
          {readout(`${Math.round(ang)}°`, false)}
        </g>
      );
    }

    case "bb-node":
      // Our own simplification of a breadboard column, so this one is drawn.
      return (
        <g>
          <rect x={1} y={1} width={def.width - 2} height={def.height - 2} rx={4} fill="#f1f5f9" stroke={stroke} strokeWidth={1} />
          {def.terminals.map((t) => (
            <rect key={t.id} x={t.x - 4} y={t.y - 6} width={8} height={12} rx={1.5} fill="#94a3b8" />
          ))}
        </g>
      );

    default:
      return <rect width={def.width} height={def.height} fill="#e2e8f0" stroke={stroke} />;
  }
}
