// Core data model for the interactive electronics (Tinkercad-style) editor.

export type ComponentType =
  | "arduino-uno"
  | "led"
  | "rgb-led"
  | "resistor"
  | "pushbutton"
  | "buzzer"
  | "potentiometer"
  | "servo"
  | "breadboard" // full breadboard with hole-level nets
  | "bb-node"; // simplified breadboard tie-point (all its holes share one net)

/** A connection point on a component, positioned relative to the component origin. */
export interface Terminal {
  id: string;
  label: string;
  x: number; // px offset from component top-left
  y: number;
  /** For Arduino: the electrical role of this pin. */
  role?: "digital" | "analog" | "power5v" | "power3v3" | "gnd" | "vin";
  /** For Arduino digital/analog pins: the pin number used in code (e.g. 13, or "A0"). */
  pin?: string;
}

export interface ComponentDef {
  type: ComponentType;
  name: string;
  category: "boards" | "output" | "input" | "general" | "breadboards";
  width: number;
  height: number;
  terminals: Terminal[];
  /** Groups of terminal ids that are internally the same electrical net (e.g. breadboard columns). */
  internalGroups?: string[][];
  /** Editable per-instance defaults (e.g. resistance, LED colour). */
  defaults?: Record<string, number | string>;
  icon: string; // emoji shown in palette
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number; // degrees (0/90/180/270)
  props: Record<string, number | string>;
}

export interface WireEnd {
  compId: string;
  terminalId: string;
}

export interface Wire {
  id: string;
  from: WireEnd;
  to: WireEnd;
  color: string;
}

/** Live per-frame simulation state, produced by the engine and consumed by the render layer. */
export interface SimState {
  running: boolean;
  /** LED / RGB brightness per component id (0..1); for rgb: {r,g,b}. */
  ledBrightness: Record<string, number>;
  rgb: Record<string, { r: number; g: number; b: number }>;
  /** buzzer frequency per component id (Hz, 0 = silent). */
  buzzer: Record<string, number>;
  /** servo angle per component id (0..180). */
  servo: Record<string, number>;
  /** short-circuit / over-current warnings, per component id. */
  warnings: Record<string, string>;
  serial: string[];
  timeMs: number;
}

export function terminalKey(compId: string, terminalId: string): string {
  return `${compId}:${terminalId}`;
}
