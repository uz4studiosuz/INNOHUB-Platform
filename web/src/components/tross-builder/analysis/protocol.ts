/** Message contract between the UI thread and `solver.worker.ts`. */

import type { BridgeDesign, MaterialId, Stability } from '../types'

export interface LiveRequest {
  type: 'live'
  requestId: number
  design: BridgeDesign
  /** Dead-load factor for the always-on design check (1.0 = service load). */
  deadFactor: number
}

export interface TestRequest {
  type: 'test'
  requestId: number
  design: BridgeDesign
  /** Axle offsets behind the nose, m */
  axleOffsets: number[]
  /** Axle loads, N (unfactored) */
  axleLoads: number[]
  vehicleLength: number
  windSpeed: number
  /** Number of vehicle positions to solve. Spec minimum is 50. */
  steps: number
}

export type SolverRequest = LiveRequest | TestRequest

export interface ModelSummary {
  nodeCount: number
  memberCount: number
  determinacy: number
  totalMass: number
  totalCost: number
  selfWeightN: number
  massByMaterial: Record<MaterialId, number>
  costByMaterial: Record<MaterialId, number>
  /** member lengths, m */
  lengths: Float64Array
  /** Euler critical loads, N */
  pcr: Float64Array
  /** indices of deck members */
  deckMembers: Uint32Array
  deckY: number
}

export interface LiveResponse {
  type: 'live'
  requestId: number
  ok: boolean
  stability: Stability
  message: string
  summary: ModelSummary
  displacements: Float64Array
  forces: Float64Array
  ratios: Float64Array
  modes: Uint8Array
  reactions: Float64Array
  maxRatio: number
  maxRatioIndex: number
  maxDisplacement: number
  maxDisplacementNode: number
  solveMs: number
}

export interface TestStepData {
  vehicleX: number
  displacements: Float64Array
  forces: Float64Array
  ratios: Float64Array
  /** support reactions, 2*nodeCount (zero at free dofs) — for the report */
  reactions: Float64Array
  /** per-member failure mode at this step (MODE_* constants) */
  modes: Uint8Array
  maxRatio: number
  maxRatioIndex: number
  maxDisplacement: number
  maxDisplacementNode: number
}

export interface TestResponse {
  type: 'test'
  requestId: number
  ok: boolean
  message: string
  summary: ModelSummary
  steps: TestStepData[]
  /** index into `steps` where the first failure happened, -1 if none */
  failureStep: number
  failureMemberIndex: number
  /** MODE_* constant from solver.ts */
  failureMode: number
  failureReason: string
  passed: boolean
  /** worst utilisation seen over the whole crossing */
  maxRatio: number
  maxRatioIndex: number
  /** step at which that worst utilisation occurred — the governing position */
  criticalStep: number
  peakDeflection: number
  peakDeflectionNode: number
  /** deflection limit that was checked against, m */
  deflectionLimit: number
  /** total unfactored live load applied, N */
  liveLoadN: number
  solveMs: number
}

export type SolverResponse = LiveResponse | TestResponse
