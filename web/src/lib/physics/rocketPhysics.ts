// Water-rocket flight model.
//
// The whole point of the Rockets module is that the numbers are real: a student
// changes the water fill and sees the height curve peak and fall the way a real
// bottle rocket does, moves clay into the nose and watches the rocket go from
// tumbling to stable. So this is not a lookup table - it is a proper simulation:
//
//   * thrust from adiabatic expansion of the trapped air pushing water out the
//     nozzle, then a short air-blowdown phase, integrated at 50 microseconds
//     because the whole water burn lasts about a tenth of a second;
//   * a drag coefficient built up from the nose fineness, the wetted skin and
//     the fins, so fin geometry actually costs something;
//   * Barrowman centre-of-pressure against a mass-summed centre-of-gravity, so
//     stability is measured in calibers the way real rocketry does it, instead
//     of being invented.
//
// Every simplification is called out where it is made.

import { airDensityAtAltitude, dragForce } from "./aerodynamics";

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------
export interface PropulsionParams {
  pressurePsi: number;
  waterVolumeL: number;
  bottleSize: "20oz_coke" | "1L" | "2L_coke" | "2L_pepsi";
}

export interface RecoveryParams {
  system: "parachute" | "backslider";
  parachuteSizeMm: number;
}

export interface NoseParams {
  materialCode: string;
  /** Only two ball sizes are stocked, matching the real parts bin. */
  ballSizeMm: 38 | 40 | number;
  clayMassG: number;
  /** Cone length. Drives both the nose's lift contribution and its drag. */
  lengthMm: number;
}

export interface ConeTubeParams {
  lengthMm: number;
  /**
   * Body-tube stock code. The tube's diameter is a property of the material,
   * not a free number - "Diameter is changed by selecting a different
   * material", exactly as the Design Specifications notes put it.
   */
  material: string;
  /** Legacy free diameter; ignored when `material` names a known tube. */
  diameterMm: number | null;
}

/**
 * Body tube stock, by the Estes codes the app uses (BT-50, BT-55, ...). The
 * outside diameter is what sets both the payload bay volume and the nose base.
 */
export const TUBE_STOCK: Record<string, { diameterMm: number; gPerCm2: number; partNo: string; costPerCm: number }> = {
  "BT-50": { diameterMm: 24.8, gPerCm2: 0.055, partNo: "ES-TB5", costPerCm: 0.055 },
  "BT-55": { diameterMm: 34.0, gPerCm2: 0.055, partNo: "ES-TB55", costPerCm: 0.062 },
  "BT-60": { diameterMm: 41.6, gPerCm2: 0.060, partNo: "ES-TB6", costPerCm: 0.070 },
  "BT-70": { diameterMm: 56.0, gPerCm2: 0.065, partNo: "ES-TB7", costPerCm: 0.082 },
  "BT-80": { diameterMm: 66.0, gPerCm2: 0.070, partNo: "ES-TB8", costPerCm: 0.095 },
};

/** Nose ball stock: the two sizes the Nose work area offers. */
const BALL_STOCK: Record<number, { massG: number; partNo: string; costUsd: number }> = {
  38: { massG: 1.75, partNo: "WRK-PP1", costUsd: 0.30 },
  40: { massG: 1.94, partNo: "WRK-PP2", costUsd: 0.32 },
};

export interface ConeTransitionParams {
  transitionLengthMm: number;
}

/**
 * One corner of the fin outline, in the fin editor's own frame:
 *   x = span, measured outward from the body surface
 *   y = station along the body, measured up from the tail
 * So y increases towards the nose, and the launcher sits at the origin corner.
 */
export interface FinPoint { x: number; y: number }

/** The drawing envelope the editor rules off, in mm. */
export const FIN_ENVELOPE = { spanMm: 140, stationMm: 220 };

/**
 * The launcher clamps the bottle neck, and the fin editor draws that corner as a
 * red "Launcher (Off Limits)" box. A fin reaching into it fails the
 * Fin/Launcher Interference check.
 */
export const LAUNCHER_ZONE = { spanMm: 30, stationMm: 55 };

export interface FinsParams {
  count: number;
  /** 4-point or 5-point template - how many corners the outline has. */
  shapePoints: number;
  /** The outline itself. Everything aerodynamic is derived from this. */
  points: FinPoint[];
  /**
   * Straight edges, or curved ones. In "curves" mode each edge carries a Bézier
   * control point; the aerodynamics flattens the curve before measuring it, so a
   * curved fin's area and stability are as honest as a straight one's.
   */
  edgeMode: "lines" | "curves";
  /**
   * One control point per edge, in the same frame as `points`. Edge i runs from
   * points[i] to points[i+1]. Ignored while `edgeMode` is "lines".
   */
  controls?: FinPoint[];
  /** Fin stock thickness - the dominant term in fin drag. */
  thicknessMm: number;
  material: string;
  color: string;
}

/** How finely a curved edge is chopped up before it is measured or extruded. */
const CURVE_STEPS = 14;

/**
 * The outline as a plain polygon: in "lines" mode the corners themselves, in
 * "curves" mode the corners with each edge's Bézier flattened into segments.
 * Every consumer - area, Barrowman, the 3D extrusion, the print template - works
 * from this one function, so the drawing, the physics and the paper agree.
 */
export function finOutline(f: FinsParams): FinPoint[] {
  const pts = f.points?.length >= 3 ? f.points : DEFAULT_FIN_POINTS;
  if (f.edgeMode !== "curves") return pts;

  const controls = f.controls ?? defaultControls(pts);
  const out: FinPoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const c = controls[i] ?? midpoint(a, b);
    for (let s = 0; s < CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS;
      const u = 1 - t;
      out.push({
        x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
      });
    }
  }
  return out;
}

function midpoint(a: FinPoint, b: FinPoint): FinPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Controls that sit on the edges, so switching to curves changes nothing yet. */
export function defaultControls(points: FinPoint[]): FinPoint[] {
  return points.map((p, i) => midpoint(p, points[(i + 1) % points.length]));
}

/** Fin stock, with the areal density and price the parts bin charges. */
export const FIN_STOCK: Record<string, { gPerCm2: number; thicknessMm: number; partNo: string; costPerCm2: number }> = {
  "40pt Card Stock": { gPerCm2: 0.052, thicknessMm: 1.0, partNo: "WRK-FS1", costPerCm2: 0.0040 },
  "70pt Card Stock": { gPerCm2: 0.091, thicknessMm: 1.8, partNo: "WRK-FS2", costPerCm2: 0.0082 },
  "Balsa 2mm": { gPerCm2: 0.032, thicknessMm: 2.0, partNo: "WRK-FB2", costPerCm2: 0.0125 },
  "Polystyrene 2mm": { gPerCm2: 0.210, thicknessMm: 2.0, partNo: "WRK-FP2", costPerCm2: 0.0150 },
};

export const FIN_COLORS = ["Royal Blue", "Black", "Yellow", "Red", "White"];

export interface RocketDesign {
  propulsion: PropulsionParams;
  recovery: RecoveryParams;
  nose: NoseParams;
  coneTube: ConeTubeParams;
  coneTransition: ConeTransitionParams;
  fins: FinsParams;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
/** One integration sample. `a` and `thrust` are what the graphs plot. */
export interface FlightSample {
  t: number;
  h: number;
  v: number;
  a: number;
  thrust: number;
  massG: number;
}

export type Stability = "STABLE" | "MARGINAL" | "UNSTABLE";

export interface MassItem { label: string; massG: number; xMm: number }

export interface RocketAnalysis {
  // --- mass ---
  emptyMassG: number;
  waterMassG: number;
  totalMassG: number;
  massBreakdown: MassItem[];

  // --- aerodynamics ---
  dragCoefficient: number;
  frontalAreaCm2: number;
  /** Drag force at burnout, the worst case during ascent. */
  dragN: number;

  // --- stability (Barrowman) ---
  bodyDiameterMm: number;
  bodyLengthMm: number;
  /** Centre of gravity at launch, water included, from the nose tip. */
  cgMm: number;
  /** Centre of gravity once the water is gone - what stability is judged on. */
  cgDryMm: number;
  /** Centre of pressure, measured from the nose tip. */
  cpMm: number;
  staticMarginMm: number;
  /**
   * Static margin in calibers at burnout. The water leaves in about 30 ms and
   * the launch tube holds the rocket straight for that moment, so the burnout
   * configuration is the one that governs the flight - and it is the number
   * model rocketry quotes.
   */
  staticMarginCal: number;
  /** The same margin at liftoff, when the water is still sitting on the tail. */
  staticMarginWetCal: number;
  stability: Stability;

  // --- propulsion ---
  peakThrustN: number;
  impulseNs: number;
  burnTimeS: number;
  burnoutVelocityMs: number;
  burnoutAltitudeM: number;

  // --- trajectory ---
  maxHeightM: number;
  ascentTimeS: number;
  descentTimeS: number;
  totalFlightTimeS: number;
  descentRateMs: number;

  // --- rules ---
  designCostUsd: number;
  /** Payload bay capacity vs packed parachute, both cm³, as Recovery shows. */
  tubeVolumeCm3: number;
  deployVolumeCm3: number;
  /** Nose ball plus clay - the mass the 20 g deploy rule applies to. */
  noseMassG: number;
  specStatus: "IN_SPEC" | "OUT_OF_SPEC";
  deployStatus: "Will Deploy" | "Will NOT Deploy";
  specErrors: string[];
  /** Advice that does not fail the design, in Uzbek. */
  hints: string[];

  flightPath: FlightSample[];
}

/**
 * Real bottle dimensions. `bodyLengthMm` is the pressure vessel's own length,
 * which the stability maths needs; `volumeCm3` is what it actually holds. The
 * 2 L figures are the ones the Propulsion work area reports: 45.00 g empty,
 * 839.40 cm² of surface. Coke and Pepsi differ in profile, which is why
 * swapping between them moves the drag.
 */
const BOTTLE_PROPS = {
  "20oz_coke": { emptyMass: 25.0, volumeCm3: 591, diameterMm: 70, bodyLengthMm: 165, surfaceCm2: 357.6, cdShape: 1.0 },
  "1L": { emptyMass: 35.0, volumeCm3: 1000, diameterMm: 84, bodyLengthMm: 200, surfaceCm2: 520.0, cdShape: 1.0 },
  "2L_coke": { emptyMass: 45.0, volumeCm3: 2000, diameterMm: 110, bodyLengthMm: 280, surfaceCm2: 832.9, cdShape: 1.0 },
  "2L_pepsi": { emptyMass: 45.0, volumeCm3: 2000, diameterMm: 110, bodyLengthMm: 285, surfaceCm2: 839.4, cdShape: 1.06 },
} as const;

/**
 * Competition limits, straight off the Design Specifications report. Note there
 * is deliberately no budget ceiling: the report tracks Design Cost but its
 * Minimum and Maximum columns are both blank.
 */
export const SPEC = {
  maxPressurePsi: 75,
  maxNoseLengthMm: 228.0,
  maxFins: 5,
  maxParachuteMm: 304.8,
  allowedBottles: ["20oz_coke", "1L", "2L_coke", "2L_pepsi"] as const,
  /** The nose ball plus its clay has to reach this or the parachute stays in. */
  minNoseMassG: 20,
} as const;

export const BOTTLE_INFO = BOTTLE_PROPS;

// --- physical constants ---
const P_ATM = 101325; // Pa
const RHO_WATER = 1000; // kg/m3
const RHO_AIR_SL = 1.225; // kg/m3 at sea level
const G = 9.80665; // m/s2
const GAMMA = 1.4; // adiabatic index of air
const R_AIR = 287.05; // J/(kg*K)
const T_AIR = 293.15; // K - pumped air, near enough to room temperature
const PSI_TO_PA = 6894.757;
/** A standard PET bottle neck, which is what the launcher seals against. */
const NOZZLE_DIAMETER_MM = 21.6;
/** Discharge coefficient of that neck - a rounded orifice, not a sharp one. */
const NOZZLE_CD = 0.97;
/** Turbulent skin-friction coefficient at the Reynolds numbers here. */
const SKIN_CF = 0.005;

/**
 * Everything the aerodynamics needs, read back off the outline the student drew
 * rather than held as separate numbers that can contradict each other. A slider
 * for "tip chord" could be set longer than the root chord, describing a fin that
 * cannot exist; a polygon simply cannot lie about its own shape.
 */
export interface FinGeometry {
  areaMm2: number;
  spanMm: number;
  rootChordMm: number;
  tipChordMm: number;
  /** Leading-edge sweep: how far aft the tip's forward corner sits. */
  sweepMm: number;
  /** Station of the fin's forward-most root corner, from the tail. */
  rootLeadingStationMm: number;
  /** True when any part of the outline reaches into the launcher's corner. */
  hitsLauncher: boolean;
}

/** The y span the outline covers at a given x, or null if it does not reach it. */
function yRangeAt(points: FinPoint[], x: number): { min: number; max: number } | null {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (Math.abs(a.x - x) < 1e-9) { min = Math.min(min, a.y); max = Math.max(max, a.y); }
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
    if (x > lo && x < hi) {
      const t = (x - a.x) / (b.x - a.x);
      const y = a.y + (b.y - a.y) * t;
      min = Math.min(min, y); max = Math.max(max, y);
    }
  }
  return Number.isFinite(min) && max > -Infinity ? { min, max } : null;
}

export function finGeometry(f: FinsParams): FinGeometry {
  // Curved edges are flattened first, so everything below measures the shape the
  // student actually sees rather than the corners it was built from.
  const pts = finOutline(f);

  // Shoelace area.
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area2 += a.x * b.y - b.x * a.y;
  }
  const areaMm2 = Math.abs(area2) / 2;

  const spanMm = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
  const root = yRangeAt(pts, Math.min(...pts.map((p) => p.x)));
  const tip = yRangeAt(pts, Math.max(...pts.map((p) => p.x)));
  const rootChordMm = root ? root.max - root.min : 0;
  const tipChordMm = tip ? tip.max - tip.min : 0;
  // Leading edge is the forward one, i.e. the larger station.
  const sweepMm = root && tip ? Math.max(0, root.max - tip.max) : 0;

  // Launcher interference: does the outline dip into the off-limits corner?
  let hitsLauncher = false;
  for (let x = 0; x <= LAUNCHER_ZONE.spanMm; x += 1) {
    const r = yRangeAt(pts, x);
    if (r && r.min < LAUNCHER_ZONE.stationMm) { hitsLauncher = true; break; }
  }

  return {
    areaMm2, spanMm, rootChordMm, tipChordMm, sweepMm,
    rootLeadingStationMm: root ? root.max : 0,
    hitsLauncher,
  };
}

/** The starting 4-point outline: a swept trapezoid clear of the launcher. */
export const DEFAULT_FIN_POINTS: FinPoint[] = [
  { x: 0, y: 150 },
  { x: 0, y: 60 },
  { x: 65, y: 62 },
  { x: 65, y: 112 },
];

/** A 5-point outline adds a clipped forward corner. */
export const DEFAULT_FIN_POINTS_5: FinPoint[] = [
  { x: 0, y: 150 },
  { x: 0, y: 60 },
  { x: 65, y: 62 },
  { x: 65, y: 100 },
  { x: 30, y: 140 },
];

// ---------------------------------------------------------------------------
// Geometry: where every part sits, measured from the nose tip
// ---------------------------------------------------------------------------
interface Layout {
  noseLen: number;
  tubeLen: number;
  transLen: number;
  bottleLen: number;
  total: number;
  tubeDia: number;
  bottleDia: number;
  /** x of the fin root leading edge from the nose tip. */
  finRootX: number;
  /** The fin outline resolved into the numbers the aerodynamics wants. */
  fin: FinGeometry;
  /** Station where each section starts, from the nose tip. */
  xTubeStart: number;
  xTransStart: number;
  xBottleStart: number;
}

function layout(d: RocketDesign): Layout {
  const bottle = BOTTLE_PROPS[d.propulsion.bottleSize];
  const noseLen = Math.max(1, d.nose.lengthMm);
  const tubeLen = Math.max(0, d.coneTube.lengthMm);
  const transLen = Math.max(0, d.coneTransition.transitionLengthMm);
  const bottleLen = bottle.bodyLengthMm;
  const bottleDia = bottle.diameterMm;
  // The payload tube's diameter is a property of the stock it is made from.
  const stock = TUBE_STOCK[d.coneTube.material];
  const tubeDia = Math.max(5, Math.min(
    stock ? stock.diameterMm : (d.coneTube.diameterMm ?? bottleDia * 0.5),
    bottleDia
  ));

  const xTubeStart = noseLen;
  const xTransStart = noseLen + tubeLen;
  const xBottleStart = noseLen + tubeLen + transLen;
  const total = xBottleStart + bottleLen;
  // The fin outline already says where it sits along the body: its forward root
  // corner is at that station up from the tail, so there is no separate offset
  // to guess at any more.
  const fg = finGeometry(d.fins);
  const finRootX = total - fg.rootLeadingStationMm;

  return { noseLen, tubeLen, transLen, bottleLen, total, tubeDia, bottleDia, finRootX, fin: fg, xTubeStart, xTransStart, xBottleStart };
}

// ---------------------------------------------------------------------------
// Mass
// ---------------------------------------------------------------------------
/**
 * Every part with its mass and where its own centre sits, so the centre of
 * gravity is a real weighted sum rather than a guess. Areal densities are for
 * the materials these rockets are actually built from: card tube, PET, and
 * 2 mm polystyrene fin stock.
 */
function massItems(d: RocketDesign, L: Layout): MassItem[] {
  const bottle = BOTTLE_PROPS[d.propulsion.bottleSize];
  const items: MassItem[] = [];

  // Clay ballast, packed right into the tip.
  if (d.nose.clayMassG > 0) {
    items.push({ label: "Loy balast", massG: d.nose.clayMassG, xMm: Math.min(L.noseLen * 0.25, L.noseLen) });
  }
  // Nose cone shell: a rolled cone of card, ~0.5 g per 1000 mm² of surface.
  const noseSurface = Math.PI * (L.tubeDia / 2) * Math.hypot(L.noseLen, L.tubeDia / 2);
  items.push({ label: "Nos konusi", massG: (noseSurface / 1000) * 0.5, xMm: (2 / 3) * L.noseLen });

  // Payload tube.
  const tubeSurface = Math.PI * L.tubeDia * L.tubeLen;
  items.push({ label: "Yuk trubasi", massG: (tubeSurface / 1000) * 0.6, xMm: L.xTubeStart + L.tubeLen / 2 });

  // Transition flare.
  const transSurface = Math.PI * ((L.tubeDia + L.bottleDia) / 2) * Math.hypot(L.transLen, (L.bottleDia - L.tubeDia) / 2);
  items.push({ label: "O'tish konusi", massG: (transSurface / 1000) * 0.6, xMm: L.xTransStart + L.transLen / 2 });

  // Recovery gear rides in the payload tube.
  const chuteMass = d.recovery.system === "parachute"
    ? (Math.PI / 4) * Math.pow(d.recovery.parachuteSizeMm, 2) * 0.05 * 0.92 / 1000 + 2
    : 1.0;
  items.push({ label: d.recovery.system === "parachute" ? "Parashyut" : "Backslider", massG: chuteMass, xMm: L.xTubeStart + L.tubeLen / 2 });

  // The pressure vessel itself.
  items.push({ label: "Butilka", massG: bottle.emptyMass, xMm: L.xBottleStart + L.bottleLen / 2 });

  // Fins: mass follows the stock's own areal density.
  if (d.fins.count > 0) {
    const stock = FIN_STOCK[d.fins.material] ?? FIN_STOCK["70pt Card Stock"];
    const oneFinG = (L.fin.areaMm2 / 100) * stock.gPerCm2;
    items.push({
      label: `Qanotlar (${d.fins.count})`,
      massG: oneFinG * d.fins.count,
      xMm: L.finRootX + L.fin.rootChordMm / 2,
    });
  }

  return items;
}

/** Centre of gravity of a set of masses, from the nose tip. */
function centreOfGravity(items: MassItem[]): number {
  const m = items.reduce((s, i) => s + i.massG, 0);
  if (m <= 0) return 0;
  return items.reduce((s, i) => s + i.massG * i.xMm, 0) / m;
}

// ---------------------------------------------------------------------------
// Aerodynamics
// ---------------------------------------------------------------------------
/**
 * Zero-lift drag coefficient, referenced to the bottle's frontal area. Built up
 * term by term so that every slider in the UI moves it: a stubbier nose costs
 * pressure drag, a longer body costs skin friction, and each fin costs both
 * skin friction over its two faces and edge drag proportional to its thickness.
 */
function dragCoefficient(d: RocketDesign, L: Layout): number {
  const refArea = Math.PI * Math.pow(L.bottleDia / 2, 2); // mm²

  // Nose pressure drag falls off with fineness ratio (length / diameter).
  const fineness = L.noseLen / Math.max(1, L.tubeDia);
  const cdNose = 0.8 / (1 + 2 * fineness);

  // Skin friction over the wetted body.
  const wetted = Math.PI * L.tubeDia * L.tubeLen
    + Math.PI * ((L.tubeDia + L.bottleDia) / 2) * L.transLen
    + Math.PI * L.bottleDia * L.bottleLen;
  const cdFriction = (SKIN_CF * wetted) / refArea;

  // Fins: two wetted faces each, plus a blunt leading/trailing edge.
  const cdFinFriction = (SKIN_CF * 2 * d.fins.count * L.fin.areaMm2) / refArea;
  const cdFinEdge = (1.28 * d.fins.count * d.fins.thicknessMm * L.fin.spanMm) / refArea;

  // Base drag behind the nozzle end.
  const cdBase = 0.12;

  return cdNose + cdFriction + cdFinFriction + cdFinEdge + cdBase;
}

/**
 * Barrowman centre of pressure. This is the textbook method every model
 * rocketeer uses: each body transition and the fin set contribute a normal-force
 * slope and a station, and the centre of pressure is their weighted average.
 */
function centreOfPressure(d: RocketDesign, L: Layout): number {
  const dRef = L.bottleDia;
  const terms: { cn: number; x: number }[] = [];

  // Nose cone, treated as a cone: CN scales with its base area.
  terms.push({ cn: 2 * Math.pow(L.tubeDia / dRef, 2), x: (2 / 3) * L.noseLen });

  // The flare from tube diameter up to bottle diameter.
  const d1 = L.tubeDia, d2 = L.bottleDia;
  if (L.transLen > 0 && d2 > d1) {
    const ratio = d1 / d2;
    const cn = 2 * (Math.pow(d2 / dRef, 2) - Math.pow(d1 / dRef, 2));
    const x = L.xTransStart + (L.transLen / 3) * (1 + (1 - ratio) / (1 - ratio * ratio));
    terms.push({ cn, x });
  }

  // Fin set.
  const f = d.fins;
  if (f.count > 0 && L.fin.spanMm > 0 && L.fin.rootChordMm + L.fin.tipChordMm > 0) {
    const a = L.fin.rootChordMm, b = L.fin.tipChordMm, s = L.fin.spanMm, m = L.fin.sweepMm;
    // Mid-chord sweep line length.
    const lm = Math.hypot(s, m + b / 2 - a / 2);
    let cn = (4 * f.count * Math.pow(s / dRef, 2)) / (1 + Math.sqrt(1 + Math.pow((2 * lm) / (a + b), 2)));
    // Body interference: the fins see flow already turned by the body.
    cn *= 1 + (dRef / 2) / (s + dRef / 2);
    const x = L.finRootX
      + (m * (a + 2 * b)) / (3 * (a + b))
      + (1 / 6) * (a + b - (a * b) / (a + b));
    terms.push({ cn, x });
  }

  const cnTotal = terms.reduce((sum, t) => sum + t.cn, 0);
  if (cnTotal <= 0) return L.total; // no restoring force at all
  return terms.reduce((sum, t) => sum + t.cn * t.x, 0) / cnTotal;
}

// ---------------------------------------------------------------------------
// Flight integration
// ---------------------------------------------------------------------------
/** Fine step while thrusting, coarse once coasting. */
const DT_BURN = 0.00005;
const DT_COAST = 0.002;
/** Never record more samples than a chart can use. */
const SAMPLE_BURN = 0.002;
const SAMPLE_COAST = 0.02;
const MAX_FLIGHT_S = 300;

export function computeRocketMetrics(design: RocketDesign): RocketAnalysis {
  const d = normalise(design);
  const bottle = BOTTLE_PROPS[d.propulsion.bottleSize];
  const L = layout(d);

  // ---- masses ----
  const items = massItems(d, L);
  const emptyMassG = items.reduce((s, i) => s + i.massG, 0);
  const waterMassG = d.propulsion.waterVolumeL * 1000; // 1 L of water = 1 kg
  const totalMassG = emptyMassG + waterMassG;

  // Water sits on the bottle floor, so it drags the centre of gravity aft.
  const waterHeight = (d.propulsion.waterVolumeL * 1e6) / (Math.PI * Math.pow(L.bottleDia / 2, 2)); // mm
  const wetItems: MassItem[] = waterMassG > 0
    ? [...items, { label: "Suv", massG: waterMassG, xMm: L.total - Math.min(waterHeight, L.bottleLen) / 2 }]
    : items;

  const cgDryMm = centreOfGravity(items);
  const cgMm = centreOfGravity(wetItems);
  const cpMm = centreOfPressure(d, L);
  const staticMarginMm = cpMm - cgDryMm;
  const staticMarginCal = staticMarginMm / L.bottleDia;
  const staticMarginWetCal = (cpMm - cgMm) / L.bottleDia;
  const stability: Stability =
    staticMarginCal >= 1 ? "STABLE" : staticMarginCal >= 0.5 ? "MARGINAL" : "UNSTABLE";

  // ---- aerodynamics ----
  const cd = dragCoefficient(d, L);
  const frontalAreaM2 = Math.PI * Math.pow(L.bottleDia / 2000, 2);

  // ---- integration ----
  const nozzleArea = Math.PI * Math.pow(NOZZLE_DIAMETER_MM / 2000, 2);
  const vBottle = bottle.volumeCm3 / 1e6; // m³
  let vWater = Math.min(d.propulsion.waterVolumeL / 1000, vBottle * 0.98);
  const vAir0 = Math.max(vBottle - vWater, vBottle * 0.02);
  const p0 = d.propulsion.pressurePsi * PSI_TO_PA + P_ATM; // absolute

  const massEmpty = emptyMassG / 1000;
  /** Air charge in the bottle. Constant while water is leaving, then it vents. */
  let airMass = (p0 * vAir0) / (R_AIR * T_AIR);
  let mass = massEmpty + vWater * RHO_WATER + airMass;
  let t = 0, v = 0, h = 0, a = 0, thrust = 0;
  let impulse = 0, peakThrust = 0;
  let burnTimeS = 0, burnoutVelocity = 0, burnoutAltitude = 0;

  const path: FlightSample[] = [];
  let nextSample = 0;
  const record = (interval: number) => {
    if (t + 1e-9 < nextSample) return;
    nextSample = t + interval;
    path.push({ t: round(t, 4), h: round(h, 3), v: round(v, 3), a: round(a, 2), thrust: round(thrust, 2), massG: round(mass * 1000, 1) });
  };
  record(SAMPLE_BURN);

  const step = (dt: number) => {
    const rho = airDensityAtAltitude(RHO_AIR_SL, h);
    // Drag always opposes motion, so it carries the sign of velocity.
    const drag = Math.sign(v) * dragForce(rho, Math.abs(v), frontalAreaM2, cd);
    a = (thrust - mass * G - drag) / mass;
    v += a * dt;
    h += v * dt;
    t += dt;
    if (h < 0) { h = 0; if (v < 0) v = 0; }
  };

  // --- 1. Water thrust -----------------------------------------------------
  // The trapped air expands adiabatically and drives water out of the nozzle.
  // Momentum thrust of an incompressible jet is 2*dP*A, which is why a bottle
  // rocket's thrust collapses as soon as the pressure bleeds off.
  while (vWater > 0 && t < MAX_FLIGHT_S) {
    const vAir = vBottle - vWater;
    const p = p0 * Math.pow(vAir0 / vAir, GAMMA);
    const dp = p - P_ATM;
    if (dp <= 0) break;

    const vExit = NOZZLE_CD * Math.sqrt((2 * dp) / RHO_WATER);
    const mdot = RHO_WATER * nozzleArea * vExit;
    thrust = mdot * vExit;

    // Never let a single step drain more water than is left: that overshoot is
    // what used to send the mass negative and the burnout velocity to 168 m/s.
    const dmWater = Math.min(mdot * DT_BURN, vWater * RHO_WATER);
    vWater = Math.max(0, vWater - dmWater / RHO_WATER);
    mass = massEmpty + vWater * RHO_WATER + airMass;

    peakThrust = Math.max(peakThrust, thrust);
    impulse += thrust * DT_BURN;
    step(DT_BURN);
    record(SAMPLE_BURN);
  }

  // --- 2. Air blowdown ----------------------------------------------------
  // Whatever pressure is left keeps pushing for a few tens of milliseconds.
  // The exit velocity is taken as an incompressible jet capped at the local
  // speed of sound: at these pressures that is within a few percent of the
  // isentropic result and it keeps the model readable.
  {
    const vAir = Math.max(vBottle - Math.max(0, vWater), 1e-9);
    // State at the start of blowdown, from which the gas expands isentropically
    // as mass leaves: p/p_ref = (rho/rho_ref)^gamma.
    const rhoRef = airMass / vAir;
    const pRef = Math.min(p0 * Math.pow(vAir0 / vAir, GAMMA), p0);
    for (;;) {
      const rhoBottle = airMass / vAir;
      const p = pRef * Math.pow(rhoBottle / rhoRef, GAMMA);
      if (!(p > P_ATM * 1.02) || t >= MAX_FLIGHT_S) break;
      const vExit = Math.min(Math.sqrt((2 * (p - P_ATM)) / rhoBottle), 340);
      const mdot = rhoBottle * nozzleArea * vExit * NOZZLE_CD;
      const dm = Math.min(mdot * DT_BURN, airMass);
      if (dm <= 0) break;
      thrust = mdot * vExit;
      airMass -= dm;
      mass = massEmpty + airMass;

      peakThrust = Math.max(peakThrust, thrust);
      impulse += thrust * DT_BURN;
      step(DT_BURN);
      record(SAMPLE_BURN);
    }
  }

  thrust = 0;
  burnTimeS = t;
  burnoutVelocity = v;
  burnoutAltitude = h;
  const dragN = dragForce(airDensityAtAltitude(RHO_AIR_SL, h), Math.abs(v), frontalAreaM2, cd);

  // --- 3. Coast to apogee -------------------------------------------------
  nextSample = t;
  while (v > 0 && t < MAX_FLIGHT_S) {
    step(DT_COAST);
    record(SAMPLE_COAST);
  }
  const maxHeightM = h;
  const ascentTimeS = t;

  // --- 4. Recovery --------------------------------------------------------
  const deploy = deployCheck(d, L);
  const cdDesc = deploy.deploys ? 1.5 : cd;
  const areaDesc = deploy.deploys
    ? Math.PI * Math.pow(d.recovery.parachuteSizeMm / 2000, 2)
    : frontalAreaM2;

  while (h > 0 && t < MAX_FLIGHT_S) {
    const rho = airDensityAtAltitude(RHO_AIR_SL, h);
    const drag = dragForce(rho, Math.abs(v), areaDesc, cdDesc); // pushes up
    a = (drag - mass * G) / mass;
    v += a * DT_COAST;
    h += v * DT_COAST;
    t += DT_COAST;
    if (h <= 0) { h = 0; break; }
    record(SAMPLE_COAST);
  }
  path.push({ t: round(t, 4), h: 0, v: round(v, 3), a: round(a, 2), thrust: 0, massG: round(mass * 1000, 1) });

  const descentTimeS = t - ascentTimeS;
  const totalFlightTimeS = t;
  const descentRateMs = Math.abs(v);

  // ---- cost and rules ----
  const designCostUsd = designCost(d, L);
  const { specErrors, hints } = validate(d, L, {
    staticMarginCal, staticMarginWetCal, stability, designCostUsd, deploy, maxHeightM, descentRateMs,
  });

  return {
    emptyMassG, waterMassG, totalMassG, massBreakdown: wetItems,
    dragCoefficient: cd,
    frontalAreaCm2: frontalAreaM2 * 1e4,
    dragN,
    bodyDiameterMm: L.bottleDia,
    bodyLengthMm: L.total,
    cgMm, cgDryMm, cpMm, staticMarginMm, staticMarginCal, staticMarginWetCal, stability,
    peakThrustN: peakThrust,
    impulseNs: impulse,
    burnTimeS,
    burnoutVelocityMs: burnoutVelocity,
    burnoutAltitudeM: burnoutAltitude,
    maxHeightM, ascentTimeS, descentTimeS, totalFlightTimeS, descentRateMs,
    designCostUsd,
    tubeVolumeCm3: deploy.tubeVolumeMm3 / 1000,
    deployVolumeCm3: deploy.deployVolumeMm3 / 1000,
    noseMassG: deploy.noseMassG,
    specStatus: specErrors.length === 0 ? "IN_SPEC" : "OUT_OF_SPEC",
    deployStatus: deploy.deploys ? "Will Deploy" : "Will NOT Deploy",
    specErrors, hints,
    flightPath: path,
  };
}

// ---------------------------------------------------------------------------
// Recovery, cost, rules
// ---------------------------------------------------------------------------
interface DeployResult {
  deploys: boolean;
  reason: string;
  /** Payload bay capacity, mm³ - the "Tube Volume" the Recovery panel shows. */
  tubeVolumeMm3: number;
  /** Packed parachute, mm³ - the "Deploy Volume" it is compared against. */
  deployVolumeMm3: number;
  /** Ball plus clay: the mass the 20 g rule is about. */
  noseMassG: number;
}

/**
 * Whether the parachute actually comes out. These are the two conditions the
 * Design Specifications report names, in its own words:
 *
 *   1. the internal volume of the nose cone tube is too small to allow the
 *      parachute to fit loosely;
 *   2. the mass of the nose (ball) is less than 20 g.
 *
 * The second one catches nearly every student - a nose with no clay in it has
 * nothing to pull the rocket over at apogee, so the bay never opens.
 */
function deployCheck(d: RocketDesign, L: Layout): DeployResult {
  const ball = BALL_STOCK[d.nose.ballSizeMm] ?? BALL_STOCK[38];
  const noseMassG = ball.massG + Math.max(0, d.nose.clayMassG);
  // Canopy film plus shroud lines. It has to sit *loosely*, hence the packing
  // allowance on top of the bare folded volume.
  const film = (Math.PI / 4) * Math.pow(d.recovery.parachuteSizeMm, 2) * 0.05;
  const lines = Math.PI * Math.pow(0.5, 2) * d.recovery.parachuteSizeMm * 8;
  const deployVolumeMm3 = (film / 0.35 + lines) * 1.6;
  const tubeVolumeMm3 = Math.PI * Math.pow(L.tubeDia / 2, 2) * L.tubeLen;
  const base = { tubeVolumeMm3, deployVolumeMm3, noseMassG };

  if (d.recovery.system !== "parachute") {
    return { ...base, deploys: false, reason: "Backslider tanlangan — parashyut yo'q" };
  }
  if (d.recovery.parachuteSizeMm <= 0) {
    return { ...base, deploys: false, reason: "Parashyut o'lchami nol" };
  }
  if (tubeVolumeMm3 <= deployVolumeMm3) {
    return {
      ...base, deploys: false,
      reason: "Yuk trubasining ichki hajmi kichik — parashyut erkin joylashmaydi. "
        + "Truba uzunligini oshiring yoki kengroq material tanlang.",
    };
  }
  if (noseMassG < SPEC.minNoseMassG) {
    return {
      ...base, deploys: false,
      reason: `Nos massasi ${noseMassG.toFixed(1)} g — ${SPEC.minNoseMassG} g dan kam. `
        + "Nos bo'limida loy massasini oshiring.",
    };
  }
  return { ...base, deploys: true, reason: "" };
}

/** Bill of materials, at the competition's own prices. */
function designCost(d: RocketDesign, L: Layout): number {
  const bottle = 1.0;
  const noseCone = 0.5 + (L.noseLen / 100) * 0.25;
  const clay = d.nose.clayMassG * 0.02;
  const tube = (L.tubeLen / 100) * 0.4;
  const transition = (L.transLen / 100) * 0.3;
  const stock = FIN_STOCK[d.fins.material] ?? FIN_STOCK["70pt Card Stock"];
  const finStock = d.fins.count * ((L.fin.areaMm2 / 100) * stock.costPerCm2 + 0.15);
  const chute = d.recovery.system === "parachute" ? 0.6 + (d.recovery.parachuteSizeMm / 100) * 0.35 : 0.3;
  return bottle + noseCone + clay + tube + transition + finStock + chute;
}

/** Competition limits, plus coaching that does not fail the design. */
function validate(
  d: RocketDesign,
  L: Layout,
  r: { staticMarginCal: number; staticMarginWetCal: number; stability: Stability; designCostUsd: number; deploy: DeployResult; maxHeightM: number; descentRateMs: number }
): { specErrors: string[]; hints: string[] } {
  const specErrors: string[] = [];
  const hints: string[] = [];

  // --- Rocket Design Inputs, exactly the four the report lists ---
  if (d.propulsion.pressurePsi > SPEC.maxPressurePsi) {
    specErrors.push(`Havo bosimi ${SPEC.maxPressurePsi} PSI dan oshdi`);
  }
  if (d.propulsion.pressurePsi <= 0) specErrors.push("Bosim berilmagan");
  if (d.nose.lengthMm > SPEC.maxNoseLengthMm) {
    specErrors.push(`Nos uzunligi ${SPEC.maxNoseLengthMm} mm dan oshdi`);
  }
  if (d.fins.count > SPEC.maxFins) specErrors.push(`Qanotlar soni ${SPEC.maxFins} dan oshdi`);
  if (d.recovery.parachuteSizeMm > SPEC.maxParachuteMm) {
    specErrors.push(`Parashyut diametri ${SPEC.maxParachuteMm} mm dan oshdi`);
  }

  // --- Allowables ---
  if (!r.deploy.deploys) specErrors.push("Parashyut ochilmaydi — izohlarga qarang");
  // Fin Validation: an outline that folds over itself, or has no area, is not a
  // fin. Drawing it as a polygon makes this the only way it can go wrong.
  if (d.fins.count > 0 && L.fin.areaMm2 < 100) {
    specErrors.push("Qanot shakli yaroqsiz: yuzasi juda kichik");
  }
  if (d.fins.count > 0 && L.fin.spanMm > FIN_ENVELOPE.spanMm) {
    specErrors.push(`Qanot span ${FIN_ENVELOPE.spanMm} mm chegaradan chiqdi`);
  }
  // Fin/Launcher Interference - now a real check, because the outline says where
  // the fin actually sits relative to the launcher's corner.
  if (d.fins.count > 0 && L.fin.hitsLauncher) {
    specErrors.push("Qanot uchirish qurilmasi zonasiga kirdi (qizil to'rtburchak)");
  }
  const bottleVolL = BOTTLE_PROPS[d.propulsion.bottleSize].volumeCm3 / 1000;
  if (d.propulsion.waterVolumeL > bottleVolL) {
    specErrors.push(`Suv butilkaga sig'maydi (maksimum ${bottleVolL.toFixed(2)} L)`);
  }
  // Design Cost is reported but deliberately not capped - the specification
  // report leaves its Minimum and Maximum columns blank.

  // --- coaching ---
  if (d.propulsion.waterVolumeL <= 0) {
    hints.push("Suv yo'q — faqat havo bilan raketa deyarli ko'tarilmaydi");
  } else {
    const fill = d.propulsion.waterVolumeL / bottleVolL;
    if (fill < 0.15) hints.push(`Suv juda kam (${(fill * 100).toFixed(0)}%) — eng yaxshi natija 25–35% atrofida`);
    if (fill > 0.5) hints.push(`Suv juda ko'p (${(fill * 100).toFixed(0)}%) — havo siqilishi uchun joy qolmayapti`);
  }
  if (r.stability === "MARGINAL") {
    hints.push(`Statik zapas ${r.staticMarginCal.toFixed(2)} kalibr — 1.0 dan yuqori bo'lsa ishonchli`);
  }
  if (r.staticMarginCal < 1 && d.nose.clayMassG < 30) {
    hints.push("Nosga loy qo'shsangiz og'irlik markazi oldinga siljiydi va barqarorlik ortadi");
  }
  if (r.staticMarginCal > 3) {
    hints.push("Statik zapas juda katta — raketa shamolga qarshi burilib, balandlikni yo'qotadi");
  }
  if (r.staticMarginWetCal < 0 && r.staticMarginCal >= 0.5) {
    hints.push(
      `Ko'tarilish paytida zapas ${r.staticMarginWetCal.toFixed(2)} kalibr — suv orqada turgani uchun. ` +
      "Shu bir lahzada raketani uchirish trubasi to'g'ri tutib turadi."
    );
  }
  if (!r.deploy.deploys && r.deploy.reason) hints.push(r.deploy.reason);
  if (r.deploy.deploys && r.descentRateMs > 6) {
    hints.push(`Qo'nish tezligi ${r.descentRateMs.toFixed(1)} m/s — parashyutni kattalashtiring`);
  }
  if (d.fins.count > 0 && d.fins.count < 3) {
    hints.push("3 yoki 4 qanot bilan raketa ancha barqaror bo'ladi");
  }
  if (d.fins.count === 0) hints.push("Qanotsiz raketa boshqarilmaydi");

  return { specErrors, hints };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
/** Guard against the NaN and negative values a half-typed input field emits. */
function normalise(d: RocketDesign): RocketDesign {
  const n = (v: number, fallback: number, min = 0) =>
    Number.isFinite(v) ? Math.max(min, v) : fallback;
  return {
    propulsion: {
      bottleSize: BOTTLE_PROPS[d.propulsion.bottleSize] ? d.propulsion.bottleSize : "20oz_coke",
      pressurePsi: n(d.propulsion.pressurePsi, 60),
      waterVolumeL: n(d.propulsion.waterVolumeL, 0.2),
    },
    recovery: {
      system: d.recovery.system === "backslider" ? "backslider" : "parachute",
      parachuteSizeMm: n(d.recovery.parachuteSizeMm, 200),
    },
    nose: {
      materialCode: d.nose.materialCode ?? "BT55",
      ballSizeMm: n(d.nose.ballSizeMm, 38, 1),
      clayMassG: n(d.nose.clayMassG, 0),
      lengthMm: n(d.nose.lengthMm, 80, 1),
    },
    coneTube: {
      lengthMm: n(d.coneTube.lengthMm, 120),
      material: TUBE_STOCK[d.coneTube.material] ? d.coneTube.material : "BT-60",
      diameterMm: d.coneTube.diameterMm == null || !Number.isFinite(d.coneTube.diameterMm)
        ? null : Math.max(5, d.coneTube.diameterMm),
    },
    coneTransition: { transitionLengthMm: n(d.coneTransition.transitionLengthMm, 120) },
    fins: {
      count: Math.round(n(d.fins.count, 4)),
      shapePoints: d.fins.shapePoints === 5 ? 5 : 4,
      points: (d.fins.points ?? []).length >= 3
        ? d.fins.points.map((p) => ({
            x: Math.max(0, Math.min(FIN_ENVELOPE.spanMm, Number.isFinite(p.x) ? p.x : 0)),
            y: Math.max(0, Math.min(FIN_ENVELOPE.stationMm, Number.isFinite(p.y) ? p.y : 0)),
          }))
        : structuredClone(DEFAULT_FIN_POINTS),
      edgeMode: d.fins.edgeMode === "curves" ? "curves" : "lines",
      controls: d.fins.controls?.map((p) => ({
        x: Math.max(0, Math.min(FIN_ENVELOPE.spanMm, Number.isFinite(p.x) ? p.x : 0)),
        y: Math.max(0, Math.min(FIN_ENVELOPE.stationMm, Number.isFinite(p.y) ? p.y : 0)),
      })),
      thicknessMm: n(d.fins.thicknessMm, 1.8, 0.2),
      material: FIN_STOCK[d.fins.material] ? d.fins.material : "70pt Card Stock",
      color: d.fins.color ?? "Royal Blue",
    },
  };
}

function round(v: number, digits: number): number {
  const k = Math.pow(10, digits);
  return Math.round(v * k) / k;
}

/** Height at a given time, for the launch animation. */
export function sampleFlight(path: FlightSample[], t: number): FlightSample | null {
  if (!path.length) return null;
  if (t <= path[0].t) return path[0];
  const last = path[path.length - 1];
  if (t >= last.t) return last;
  let lo = 0, hi = path.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid].t <= t) lo = mid; else hi = mid;
  }
  const p1 = path[lo], p2 = path[hi];
  const span = p2.t - p1.t;
  const f = span > 0 ? (t - p1.t) / span : 0;
  return {
    t,
    h: p1.h + (p2.h - p1.h) * f,
    v: p1.v + (p2.v - p1.v) * f,
    a: p1.a + (p2.a - p1.a) * f,
    thrust: p1.thrust + (p2.thrust - p1.thrust) * f,
    massG: p1.massG + (p2.massG - p1.massG) * f,
  };
}

/**
 * The design a fresh student starts from: a 2 litre bottle at the pressure the
 * specification report's own worked example uses, in spec, stable, and with
 * enough clay in the nose that the parachute actually comes out.
 */
export const DEFAULT_DESIGN: RocketDesign = {
  propulsion: { pressurePsi: 65, waterVolumeL: 0.5, bottleSize: "2L_coke" },
  recovery: { system: "parachute", parachuteSizeMm: 280 },
  nose: { materialCode: "BT-60", ballSizeMm: 38, clayMassG: 40, lengthMm: 150 },
  coneTube: { lengthMm: 170, material: "BT-60", diameterMm: null },
  coneTransition: { transitionLengthMm: 75 },
  fins: {
    count: 4,
    shapePoints: 4,
    points: structuredClone(DEFAULT_FIN_POINTS),
    edgeMode: "lines",
    thicknessMm: 1.8,
    material: "70pt Card Stock",
    color: "Royal Blue",
  },
};
