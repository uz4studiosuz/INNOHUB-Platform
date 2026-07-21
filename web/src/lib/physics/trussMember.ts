// Truss member stress/yield model for the Structures 2.0 Research module.
// Source: WhiteBox Learning-style truss engineering curriculum (Method of Joints).

export type ForceType = "tension" | "compression" | "shear" | "torsion";

export interface TrussMemberInput {
  id: string;
  jointA: string;
  jointB: string;
  forceType: ForceType;
  forceN: number;
  areaM2: number;
  yieldStrengthPa: number;
}

export interface TrussMember extends TrussMemberInput {
  stressPa: number;
  syRatio: number;
  isFailing: boolean;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** sigma = F / A */
export function computeStressPa(forceN: number, areaM2: number): number {
  if (areaM2 <= 0) return 0;
  return Math.abs(forceN) / areaM2;
}

/** S/Y = stress / yield strength */
export function computeSYRatio(stressPa: number, yieldStrengthPa: number): number {
  if (yieldStrengthPa <= 0) return Infinity;
  return stressPa / yieldStrengthPa;
}

export function buildTrussMember(input: TrussMemberInput): TrussMember {
  const stressPa = computeStressPa(input.forceN, input.areaM2);
  const syRatio = computeSYRatio(stressPa, input.yieldStrengthPa);
  return {
    ...input,
    stressPa,
    syRatio,
    isFailing: syRatio >= 1.0,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function interpolate(fromHex: string, toHex: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Compression: orange (#FFA500) -> red (#FF0000) as S/Y approaches 1.0 (failure).
 * Tension: yellow (#FFFF00) -> blue (#0000FF) as S/Y approaches 1.0 (failure).
 */
export function memberColor(m: Pick<TrussMember, "forceType" | "syRatio">): string {
  const t = clamp(m.syRatio, 0, 1);
  if (m.forceType === "compression") {
    return interpolate("#FFA500", "#FF0000", t);
  }
  if (m.forceType === "tension") {
    return interpolate("#FFFF00", "#0000FF", t);
  }
  // Shear / torsion don't participate in the S/Y compression-tension gradient.
  return "#22c55e";
}

export function isFailurePoint(m: Pick<TrussMember, "syRatio">): boolean {
  return m.syRatio >= 1.0;
}

export function arrowColor(forceType: ForceType): string {
  if (forceType === "compression") return "#ef4444"; // red, inward
  if (forceType === "tension") return "#3b82f6"; // blue, outward
  if (forceType === "shear") return "#22c55e"; // green, transverse
  return "#a855f7"; // torsion, purple spiral
}
