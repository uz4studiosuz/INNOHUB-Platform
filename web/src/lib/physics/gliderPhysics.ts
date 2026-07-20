/**
 * Glider Physics Engine — Pure TypeScript Formula Module
 * 
 * All dimensions are in MILLIMETERS (mm), masses in GRAMS (g), angles in DEGREES.
 * This module has zero dependencies and is fully unit-testable.
 * 
 * Reference: WhiteBox Learning "Gliders 2.0" engineering specifications.
 */

// ─── Constants ───────────────────────────────────────────────────

/** Balsa wood density in g/mm³ (approx 160 kg/m³ = 0.00016 g/mm³) */
const BALSA_DENSITY = 0.00016;

/** Air density at sea level, kg/m³ */
const RHO_AIR = 1.225;

// ─── Specification Limits ────────────────────────────────────────

export interface SpecRange {
  min: number;
  max: number;
  label: string;
  unit: string;
}

export const SPEC_LIMITS = {
  wingSpan:         { min: 50,    max: 300,   label: "Wing Span",              unit: "mm" },
  wingChord:        { min: 20,    max: 100,   label: "Wing Chord",             unit: "mm" },
  wingTrueLength:   { min: 50,    max: 310,   label: "Wing True Length",       unit: "mm" },
  hStabSpan:        { min: 30,    max: 150,   label: "H-Stab Span",            unit: "mm" },
  hStabChord:       { min: 15,    max: 80,    label: "H-Stab Chord",           unit: "mm" },
  vStabHeight:      { min: 10,    max: 60,    label: "V-Stab Height",          unit: "mm" },
  vStabChord:       { min: 15,    max: 80,    label: "V-Stab Chord",           unit: "mm" },
  fuselageLength:   { min: 150,   max: 400,   label: "Fuselage Length",        unit: "mm" },
  mass:             { min: 6,     max: 50,    label: "Glider Mass",            unit: "g"  },
  liftEfficiency:   { min: 18,    max: 100,   label: "Lift Efficiency Ratio",  unit: ""   },
  effectiveDihedral:{ min: 12,    max: 15,    label: "Effective Dihedral",      unit: "°"  },
  hsToWarRatio:     { min: 0.125, max: 0.17,  label: "HS/Wing Area Ratio",     unit: ""   },
  vhStabRatio:      { min: 0.3,   max: 0.4,   label: "V/H Stab Area Ratio",    unit: ""   },
  cgChordFraction:  { min: 0.33,  max: 0.50,  label: "CG Chord Fraction",      unit: ""   },
  staticMargin:     { min: 0,     max: 25.4,  label: "Static Margin",           unit: "mm" },
} as const;

// ─── Input Types ─────────────────────────────────────────────────

export interface FuselageParams {
  noseHeight: number;   // mm
  bodyHeight: number;   // mm
  rearHeight: number;   // mm
  length: number;       // mm
}

export interface WingParams {
  leadingEdgeXOffset: number;  // mm from nose
  span: number;                // mm
  chord: number;               // mm
  dihedralType: "dihedral" | "tipDihedral";
  dihedral: number;            // degrees
  tipDihedral: number;         // degrees
  shape: "rectangular" | "tapered" | "elliptical";
  sandingLevel: "none" | "light" | "medium" | "heavy";
  color?: string;
}

export interface HStabParams {
  span: number;   // mm
  chord: number;  // mm
  shape?: "rectangular" | "tapered" | "elliptical";
  sandingLevel?: "none" | "light" | "medium" | "heavy";
  color?: string;
}

export interface VStabParams {
  height: number; // mm
  chord: number;  // mm
  shape?: "rectangular" | "tapered" | "elliptical";
  sandingLevel?: "none" | "light" | "medium" | "heavy";
  color?: string;
}

// ─── Output Types ────────────────────────────────────────────────

export interface ComputedMetrics {
  wingArea: number;               // mm²
  hStabArea: number;              // mm²
  vStabArea: number;              // mm²
  wingTrueLength: number;         // mm (flattened span accounting for dihedral)
  mass: number;                   // grams
  liftEfficiencyRatio: number;
  effectiveDihedral: number;      // degrees
  hsToWingAreaRatio: number;
  vhStabAreaRatio: number;
  centerOfGravity: number;        // mm from nose
  neutralPoint: number;           // mm from nose
  staticMarginMm: number;         // mm
  cgChordFraction: number;
  flightTimeSec: number;          // seconds
  specStatus: "IN_SPEC" | "OUT_OF_SPEC";
  specViolations: string[];       // list of violated spec names
}

// ─── Calculation Functions ───────────────────────────────────────

/** Calculate wing planform area (mm²) */
export function calcWingArea(span: number, chord: number): number {
  return span * chord;
}

/** Calculate horizontal stabilizer area (mm²) */
export function calcHStabArea(span: number, chord: number): number {
  return span * chord;
}

/** Calculate vertical stabilizer area (mm²) */
export function calcVStabArea(height: number, chord: number): number {
  return height * chord;
}

/**
 * Calculate wing true (flattened) length accounting for dihedral angle.
 * When the wing has dihedral, the true span from tip to tip (measured flat)
 * is longer than the projected horizontal span.
 */
export function calcWingTrueLength(
  span: number,
  dihedralType: "dihedral" | "tipDihedral",
  dihedral: number,
  tipDihedral: number
): number {
  const halfSpan = span / 2;
  const dihedralRad = (dihedral * Math.PI) / 180;
  const tipDihedralRad = (tipDihedral * Math.PI) / 180;

  if (dihedralType === "dihedral") {
    // Full dihedral: each half-wing rises at the dihedral angle
    const trueHalf = halfSpan / Math.cos(dihedralRad);
    return trueHalf * 2;
  } else {
    // Tip dihedral: inner 70% is flat, outer 30% bends at tipDihedral
    const innerPortion = halfSpan * 0.7;
    const outerPortion = halfSpan * 0.3;
    const trueOuter = outerPortion / Math.cos(tipDihedralRad);
    const trueInner = innerPortion / Math.cos(dihedralRad);
    return (trueInner + trueOuter) * 2;
  }
}

/**
 * Calculate effective dihedral angle (degrees).
 * Combines full dihedral and tip dihedral into one effective value.
 */
export function calcEffectiveDihedral(
  dihedralType: "dihedral" | "tipDihedral",
  dihedral: number,
  tipDihedral: number
): number {
  if (dihedralType === "dihedral") {
    return dihedral;
  }
  // Weighted combination: inner wing contributes 70%, tip contributes 30%
  return dihedral * 0.7 + tipDihedral * 0.3;
}

/**
 * Estimate total glider mass (grams) from component volumes × balsa density.
 * Uses simplified volume calculations:
 * - Fuselage: tapered cylinder approximation
 * - Wing: slab volume with sanding reduction
 * - Stabilizers: flat plate volumes
 */
export function calcMass(
  fuselage: FuselageParams,
  wing: WingParams,
  hStab: HStabParams,
  vStab: VStabParams
): number {
  // Fuselage volume: average cross-section × length
  const fuseAvgHeight = (fuselage.noseHeight + fuselage.bodyHeight + fuselage.rearHeight) / 3;
  const fuseWidth = fuseAvgHeight * 0.8; // approximate width as fraction of height
  const fuseVolume = fuseAvgHeight * fuseWidth * fuselage.length;

  // Wing volume: span × chord × thickness (thickness ~12% of chord)
  const wingThickness = wing.chord * 0.12;
  let wingVolume = wing.span * wing.chord * wingThickness;
  // Sanding reduces volume
  const sandingReduction: Record<string, number> = {
    none: 1.0, light: 0.85, medium: 0.70, heavy: 0.55,
  };
  wingVolume *= sandingReduction[wing.sandingLevel] ?? 1.0;

  // Tapered/elliptical shapes reduce wing volume further
  if (wing.shape === "tapered") wingVolume *= 0.75;
  else if (wing.shape === "elliptical") wingVolume *= 0.785; // π/4

  // Stabilizer volumes
  const hStabThickness = hStab.chord * 0.10;
  const hStabVolume = hStab.span * hStab.chord * hStabThickness;

  const vStabThickness = vStab.chord * 0.10;
  const vStabVolume = vStab.height * vStab.chord * vStabThickness;

  const totalVolume = fuseVolume + wingVolume + hStabVolume + vStabVolume;
  return totalVolume * BALSA_DENSITY;
}

/**
 * Lift Efficiency Ratio — simplified aerodynamic coefficient.
 * Higher = better. Target: > 18.
 * Based on wing area per unit weight, adjusted by aspect ratio.
 */
export function calcLiftEfficiency(wingArea: number, mass: number): number {
  if (mass <= 0) return 0;
  // wingArea in mm², mass in grams
  // Normalize: area per gram, then scale by aspect-ratio-like factor
  const areaPerGram = wingArea / mass;
  return areaPerGram * 0.08; // Empirical scaling factor to target range ~15-25
}

/** HS to Wing Area Ratio — should be 0.125 to 0.17 */
export function calcHsToWarRatio(hStabArea: number, wingArea: number): number {
  if (wingArea <= 0) return 0;
  return hStabArea / wingArea;
}

/** V/H Stab Area Ratio — typically 0.3–0.4 */
export function calcVhStabRatio(vStabArea: number, hStabArea: number): number {
  if (hStabArea <= 0) return 0;
  return vStabArea / hStabArea;
}

/**
 * Calculate Center of Gravity position (mm from nose).
 * Uses weighted average of component positions.
 */
export function calcCenterOfGravity(
  fuselage: FuselageParams,
  wing: WingParams,
  hStab: HStabParams,
  vStab: VStabParams
): number {
  const fuseAvgHeight = (fuselage.noseHeight + fuselage.bodyHeight + fuselage.rearHeight) / 3;
  const fuseWidth = fuseAvgHeight * 0.8;
  const fuseVolume = fuseAvgHeight * fuseWidth * fuselage.length;
  const fuseCG = fuselage.length * 0.45; // CG of tapered body slightly forward of center

  const wingThickness = wing.chord * 0.12;
  let wingVolume = wing.span * wing.chord * wingThickness;
  if (wing.shape === "tapered") wingVolume *= 0.75;
  else if (wing.shape === "elliptical") wingVolume *= 0.785;
  const sandingReduction: Record<string, number> = {
    none: 1.0, light: 0.85, medium: 0.70, heavy: 0.55,
  };
  wingVolume *= sandingReduction[wing.sandingLevel] ?? 1.0;
  const wingCG = wing.leadingEdgeXOffset + wing.chord * 0.4; // ~40% chord from LE

  const hStabThickness = hStab.chord * 0.10;
  const hStabVolume = hStab.span * hStab.chord * hStabThickness;
  const hStabCG = fuselage.length - hStab.chord * 0.4; // near the tail

  const vStabThickness = vStab.chord * 0.10;
  const vStabVolume = vStab.height * vStab.chord * vStabThickness;
  const vStabCG = fuselage.length - vStab.chord * 0.35; // near the tail

  const totalVolume = fuseVolume + wingVolume + hStabVolume + vStabVolume;
  if (totalVolume <= 0) return 0;

  const weightedSum =
    fuseVolume * fuseCG +
    wingVolume * wingCG +
    hStabVolume * hStabCG +
    vStabVolume * vStabCG;

  return weightedSum / totalVolume;
}

/**
 * Calculate Neutral Point (aerodynamic center) position (mm from nose).
 * Simplified: weighted by aerodynamic surface contributions.
 */
export function calcNeutralPoint(
  wing: WingParams,
  hStab: HStabParams,
  fuselageLength: number
): number {
  const wingArea = wing.span * wing.chord;
  const hStabArea = hStab.span * hStab.chord;

  // Wing aerodynamic center at ~25% chord from leading edge
  const wingAC = wing.leadingEdgeXOffset + wing.chord * 0.25;

  // H-Stab aerodynamic center near the tail
  const hStabAC = fuselageLength - hStab.chord * 0.25;

  // Tail volume coefficient influence (simplified)
  const tailEfficiency = 0.9; // typical downwash efficiency factor

  const totalInfluence = wingArea + hStabArea * tailEfficiency;
  if (totalInfluence <= 0) return 0;

  return (wingArea * wingAC + hStabArea * tailEfficiency * hStabAC) / totalInfluence;
}

/** Static Margin = Neutral Point - Center of Gravity (mm). Positive = stable. */
export function calcStaticMargin(neutralPoint: number, centerOfGravity: number): number {
  return neutralPoint - centerOfGravity;
}

/** CG position as fraction of wing chord (0 = leading edge, 1 = trailing edge) */
export function calcCgChordFraction(
  centerOfGravity: number,
  wingLeadingEdgeX: number,
  wingChord: number
): number {
  if (wingChord <= 0) return 0;
  return (centerOfGravity - wingLeadingEdgeX) / wingChord;
}

/**
 * Estimate flight time (seconds) using simplified glide physics.
 * Based on: launch height, glide ratio (L/D), sink rate.
 */
export function calcFlightTime(
  mass: number,        // grams
  wingArea: number,    // mm²
  liftEfficiency: number,
  staticMargin: number // mm
): number {
  if (mass <= 0 || wingArea <= 0) return 0;

  // Convert to SI for physics
  const massKg = mass / 1000;
  const areaSqM = wingArea / 1_000_000;

  // Wing loading (N/m²)
  const wingLoading = (massKg * 9.81) / areaSqM;

  // Estimated L/D ratio (proportional to lift efficiency, capped)
  const ldRatio = Math.min(liftEfficiency * 0.6, 15);

  // Sink rate (m/s) — from equilibrium glide: Vs = sqrt(2 * W/S / (rho * Cl)) / L/D
  const clApprox = 0.8; // approximate lift coefficient
  const vSink = Math.sqrt((2 * wingLoading) / (RHO_AIR * clApprox)) / ldRatio;

  // Launch height approximation (standard catapult ~3m)
  const launchHeight = 3.0;

  // Static margin penalty: negative or excessive margin reduces performance
  let stabilityFactor = 1.0;
  if (staticMargin < 0) {
    stabilityFactor = 0.3; // unstable = crash quickly
  } else if (staticMargin > 25.4) {
    stabilityFactor = 0.7; // over-stable = sluggish
  } else {
    // Optimal around 5-15mm
    stabilityFactor = 0.8 + 0.2 * Math.min(staticMargin / 15, 1);
  }

  if (vSink <= 0) return 0;
  const rawTime = (launchHeight / vSink) * stabilityFactor;
  return Math.max(0, Math.round(rawTime * 100) / 100);
}

// ─── Normalization for Optimization Bars ─────────────────────────

/**
 * Normalize a metric value to 0.0–1.0 scale for optimization bar display.
 * 0.0 = worst (red/unstable), 1.0 = best (green).
 */
export function normalizeMetric(
  value: number,
  spec: SpecRange,
  higherIsBetter: boolean = true
): number {
  const { min, max } = spec;
  const range = max - min;
  if (range <= 0) return 0.5;

  if (higherIsBetter) {
    // Value below min = 0, at max = 1
    return Math.max(0, Math.min(1, (value - min * 0.5) / (max * 1.2 - min * 0.5)));
  } else {
    // Value at min = 1, above max = 0 (lower is better)
    return Math.max(0, Math.min(1, 1 - (value - min * 0.5) / (max * 1.5 - min * 0.5)));
  }
}

/**
 * Normalize a metric that has an optimal CENTER range (not just higher/lower is better).
 * E.g., effectiveDihedral should be 12°–15° — both below 12 and above 15 are bad.
 */
export function normalizeMetricCentered(
  value: number,
  optimalMin: number,
  optimalMax: number
): number {
  const optCenter = (optimalMin + optimalMax) / 2;
  const optRange = (optimalMax - optimalMin) / 2;
  const deviation = Math.abs(value - optCenter);
  const maxDeviation = optRange * 3; // 3× the optimal range = fully red
  return Math.max(0, Math.min(1, 1 - deviation / maxDeviation));
}

// ─── Compute All Metrics ─────────────────────────────────────────

/** Compute all derived metrics from a full glider design. */
export function computeAllMetrics(
  fuselage: FuselageParams,
  wing: WingParams,
  hStab: HStabParams,
  vStab: VStabParams
): ComputedMetrics {
  const wingArea = calcWingArea(wing.span, wing.chord);
  const hStabArea = calcHStabArea(hStab.span, hStab.chord);
  const vStabArea = calcVStabArea(vStab.height, vStab.chord);
  const wingTrueLength = calcWingTrueLength(wing.span, wing.dihedralType, wing.dihedral, wing.tipDihedral);
  const mass = calcMass(fuselage, wing, hStab, vStab);
  const liftEfficiencyRatio = calcLiftEfficiency(wingArea, mass);
  const effectiveDihedral = calcEffectiveDihedral(wing.dihedralType, wing.dihedral, wing.tipDihedral);
  const hsToWingAreaRatio = calcHsToWarRatio(hStabArea, wingArea);
  const vhStabAreaRatio = calcVhStabRatio(vStabArea, hStabArea);
  const centerOfGravity = calcCenterOfGravity(fuselage, wing, hStab, vStab);
  const neutralPoint = calcNeutralPoint(wing, hStab, fuselage.length);
  const staticMarginMm = calcStaticMargin(neutralPoint, centerOfGravity);
  const cgChordFraction = calcCgChordFraction(centerOfGravity, wing.leadingEdgeXOffset, wing.chord);
  const flightTimeSec = calcFlightTime(mass, wingArea, liftEfficiencyRatio, staticMarginMm);

  // Check spec violations
  const specViolations: string[] = [];
  if (wing.span > SPEC_LIMITS.wingSpan.max) specViolations.push("wingSpan");
  if (wingTrueLength > SPEC_LIMITS.wingTrueLength.max) specViolations.push("wingTrueLength");
  if (mass < SPEC_LIMITS.mass.min) specViolations.push("mass");
  if (liftEfficiencyRatio < SPEC_LIMITS.liftEfficiency.min) specViolations.push("liftEfficiency");
  if (effectiveDihedral < SPEC_LIMITS.effectiveDihedral.min || effectiveDihedral > SPEC_LIMITS.effectiveDihedral.max) {
    specViolations.push("effectiveDihedral");
  }
  if (hsToWingAreaRatio < SPEC_LIMITS.hsToWarRatio.min || hsToWingAreaRatio > SPEC_LIMITS.hsToWarRatio.max) {
    specViolations.push("hsToWarRatio");
  }
  if (staticMarginMm < SPEC_LIMITS.staticMargin.min || staticMarginMm > SPEC_LIMITS.staticMargin.max) {
    specViolations.push("staticMargin");
  }
  if (cgChordFraction < SPEC_LIMITS.cgChordFraction.min || cgChordFraction > SPEC_LIMITS.cgChordFraction.max) {
    specViolations.push("cgChordFraction");
  }

  return {
    wingArea,
    hStabArea,
    vStabArea,
    wingTrueLength,
    mass,
    liftEfficiencyRatio,
    effectiveDihedral,
    hsToWingAreaRatio,
    vhStabAreaRatio,
    centerOfGravity,
    neutralPoint,
    staticMarginMm,
    cgChordFraction,
    flightTimeSec,
    specStatus: specViolations.length === 0 ? "IN_SPEC" : "OUT_OF_SPEC",
    specViolations,
  };
}
