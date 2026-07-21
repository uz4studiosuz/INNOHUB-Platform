export type SupportType = "none" | "pin" | "roller_h" | "roller_v";

export interface TrussNode {
  id: string;
  x: number; // canvas px (grid-snapped)
  y: number; // canvas px (grid-snapped)
  support: SupportType;
  loadFx: number; // N
  loadFy: number; // N (negative = downward)
}

export interface TrussMemberDraft {
  id: string;
  nodeA: string;
  nodeB: string;
  areaM2: number;
  yieldStrengthPa: number;
  E: number;
  materialLabel: string;
}

export type BuilderMode = "node" | "member" | "support" | "load" | "delete";

export interface MaterialOption {
  id: string;
  label: string;
  areaM2: number;
  yieldStrengthPa: number;
  E: number;
}

export const MATERIALS: MaterialOption[] = [
  { id: "balsa", label: "Balsa yog'och", areaM2: 0.00003, yieldStrengthPa: 14_893_000, E: 3.5e9 },
  { id: "aluminum_6061", label: "Alyuminiy 6061", areaM2: 0.00001, yieldStrengthPa: 276e6, E: 68.9e9 },
  { id: "carbon_fiber", label: "Uglerod tolasi", areaM2: 0.00001, yieldStrengthPa: 3500e6, E: 230e9 },
  { id: "steel_304", label: "Po'lat 304", areaM2: 0.00001, yieldStrengthPa: 215e6, E: 193e9 },
];

export interface SolvedMember {
  id: string;
  nodeA: string;
  nodeB: string;
  forceN: number;
  stressPa: number;
  safetyFactor: number;
  inTension: boolean;
}
