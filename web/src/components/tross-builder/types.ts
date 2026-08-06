/**
 * BridgeCraft Studio — core domain types.
 *
 * UNITS: everything is SI internally.
 *   length  m
 *   force   N
 *   stress  Pa
 *   mass    kg
 *   density kg/m^3
 * The UI converts to kN / MPa / mm at the presentation layer only.
 */

export type MaterialId = 'steel' | 'wood' | 'composite'

/** Shape family, used both for section property maths and 3D extrusion. */
export type SectionShape = 'ibeam' | 'tube' | 'angle' | 'rect' | 'box'

export interface Material {
  id: MaterialId
  name: string
  /** kg/m^3 */
  density: number
  /** Elastic modulus, Pa */
  E: number
  /** Allowable/yield stress in tension, Pa */
  fyTension: number
  /** Allowable/yield stress in compression (before buckling), Pa */
  fyCompression: number
  /** $ per kg */
  costPerKg: number
  /** Base sRGB hex used in 2D and as the 3D albedo tint */
  color: string
  /** PBR hints for the 3D renderer */
  metalness: number
  roughness: number
  /** Score multiplier from the spec's scoring formula */
  bonus: number
}

export interface CrossSection {
  id: string
  name: string
  materialId: MaterialId
  shape: SectionShape
  /** Cross-sectional area, m^2 */
  area: number
  /** Strong-axis second moment of area, m^4 */
  Ix: number
  /** Weak-axis second moment of area, m^4 — governs Euler buckling */
  Iy: number
  /** Overall depth (in-plane height), m — used for 3D extrusion */
  depth: number
  /** Overall width (out-of-plane), m */
  width: number
  /** Wall / web thickness where meaningful, m */
  thickness: number
}

export type SupportType = 'none' | 'pin' | 'roller'

export interface BridgeNode {
  id: string
  /** metres, origin at the left abutment, +y up */
  x: number
  y: number
  support: SupportType
  /** Locked nodes cannot be dragged or deleted (abutments are always locked) */
  locked: boolean
}

export interface Member {
  id: string
  /** node ids */
  a: string
  b: string
  materialId: MaterialId
  sectionId: string
}

/** The serialisable part of the design — this is what the undo stack snapshots. */
export interface BridgeDesign {
  nodes: BridgeNode[]
  members: Member[]
  /** clear span between abutments, m */
  span: number
  /** deck height above the water, m */
  clearance: number
  /** snap resolution, m */
  gridStep: number
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export type FailureMode = 'none' | 'yield-tension' | 'yield-compression' | 'buckling'

export interface MemberResult {
  id: string
  /** Axial force, N. Positive = tension, negative = compression. */
  force: number
  /** Axial stress, Pa (signed) */
  stress: number
  /**
   * |stress| / allowable. Allowable in compression is the lesser of the
   * material's compressive yield and the Euler critical stress.
   */
  stressRatio: number
  /** Euler critical load for this member, N (positive magnitude) */
  pcr: number
  /** Length, m */
  length: number
  mode: FailureMode
}

export interface NodeDisplacement {
  id: string
  dx: number
  dy: number
}

export interface Reaction {
  nodeId: string
  fx: number
  fy: number
}

export type Stability = 'stable' | 'unstable' | 'empty'

export interface SolveResult {
  ok: boolean
  stability: Stability
  /** Human readable explanation when unstable */
  message: string
  /** m + r - 2j.  <0 mechanism, 0 determinate, >0 indeterminate */
  determinacy: number
  displacements: NodeDisplacement[]
  reactions: Reaction[]
  members: MemberResult[]
  /** Largest nodal resultant displacement, m */
  maxDisplacement: number
  maxDisplacementNodeId: string
  maxStressRatio: number
  maxStressRatioMemberId: string
  /** ms spent in the solver, for the perf readout */
  solveMs: number
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export type VehicleType = 'truck' | 'train' | 'custom'

export interface Axle {
  /** distance behind the vehicle nose, m */
  offset: number
  /** N */
  load: number
}

export interface VehicleSpec {
  id: VehicleType
  name: string
  /** m */
  length: number
  axles: Axle[]
  /** total load, N (sum of axles) */
  totalLoad: number
}

export interface LoadConfig {
  vehicle: VehicleType
  /** custom total live load in N, used when vehicle === 'custom' */
  customLoad: number
  windEnabled: boolean
  /** km/h */
  windSpeed: number
  /** Playback rate for the animation, not a physics quantity */
  speed: number
}

/** One solved position of the moving load. */
export interface LoadStep {
  /** nose position of the vehicle along the span, m (can be negative/over-span) */
  vehicleX: number
  displacements: Float64Array
  memberForces: Float64Array
  memberRatios: Float64Array
  maxRatio: number
  maxRatioIndex: number
  maxDisplacement: number
  maxDisplacementNode: number
  failed: boolean
  failureMode: FailureMode
  failureMemberIndex: number
}

export interface TestResult {
  passed: boolean
  /** index into steps where failure occurred, -1 if none */
  failureStep: number
  failureMemberId: string
  failureMode: FailureMode
  failureReason: string
  maxRatio: number
  maxRatioMemberId: string
  peakDeflection: number
  peakDeflectionNodeId: string
  /** N — live load the structure could carry (extrapolated if it passed) */
  capacityLoad: number
  selfWeightN: number
  efficiency: number
  costFactor: number
  score: number
  scoreBreakdown: {
    efficiency: number
    cost: number
    passFail: number
  }
}

export type ToolId = 'select' | 'node' | 'member' | 'delete' | 'paint' | 'support'
export type ViewMode = '2d' | '3d' | 'split'
export type TestPhase = 'idle' | 'solving' | 'running' | 'paused' | 'collapsing' | 'complete'
