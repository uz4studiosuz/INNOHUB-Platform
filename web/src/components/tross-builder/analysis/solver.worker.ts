/// <reference lib="webworker" />
/**
 * Structural analysis worker.
 *
 * Two jobs:
 *   'live' — one dead-load solve, used for the always-on 2D overlay.
 *   'test' — a full moving-load sweep. The stiffness matrix is factorised once
 *            and re-used for every vehicle position, so a 60-step crossing
 *            costs barely more than a single solve.
 */

import { buildModel, type SolverModel } from './model'
import {
  MODE_BUCKLE,
  MODE_NONE,
  MODE_YIELD_C,
  MODE_YIELD_T,
  assembleLoads,
  factorise,
  instabilityMessage,
  solveWith,
  type Factorisation,
  type LoadCase,
} from './solver'
import type {
  LiveResponse,
  ModelSummary,
  SolverRequest,
  TestResponse,
  TestStepData,
} from './protocol'

/** Ultimate vertical capacity assumed for one abutment / pier, N. */
const SUPPORT_CAPACITY = 900e3

function summarise(model: SolverModel, f: Factorisation): ModelSummary {
  return {
    nodeCount: model.nodeCount,
    memberCount: model.memberCount,
    determinacy: f.determinacy,
    totalMass: model.totalMass,
    totalCost: model.totalCost,
    selfWeightN: model.selfWeightN,
    massByMaterial: model.massByMaterial,
    costByMaterial: model.costByMaterial,
    lengths: f.geometry.length,
    pcr: f.geometry.pcr,
    deckMembers: model.deckMembers,
    deckY: model.deckY,
  }
}

function emptyLive(requestId: number, model: SolverModel, f: Factorisation, message: string): LiveResponse {
  const n = model.nodeCount
  const m = model.memberCount
  return {
    type: 'live',
    requestId,
    ok: false,
    stability: m === 0 ? 'empty' : 'unstable',
    message,
    summary: summarise(model, f),
    displacements: new Float64Array(2 * n),
    forces: new Float64Array(m),
    ratios: new Float64Array(m),
    modes: new Uint8Array(m),
    reactions: new Float64Array(2 * n),
    maxRatio: 0,
    maxRatioIndex: -1,
    maxDisplacement: 0,
    maxDisplacementNode: -1,
    solveMs: 0,
  }
}

function handleLive(req: Extract<SolverRequest, { type: 'live' }>): LiveResponse {
  const t0 = performance.now()
  const model = buildModel(req.design)
  const f = factorise(model)

  if (!f.ok) {
    return emptyLive(req.requestId, model, f, instabilityMessage(model, f))
  }

  const lc: LoadCase = {
    deadFactor: req.deadFactor,
    liveFactor: 0,
    vehicleX: NaN,
    axleOffsets: new Float64Array(0),
    axleLoads: new Float64Array(0),
    windSpeed: 0,
    windFactor: 0,
  }
  const F = assembleLoads(model, lc)
  const sol = solveWith(model, f, F)

  return {
    type: 'live',
    requestId: req.requestId,
    ok: true,
    stability: 'stable',
    message:
      f.determinacy === 0
        ? 'Statically determinate'
        : `Statically indeterminate (degree ${f.determinacy})`,
    summary: summarise(model, f),
    displacements: sol.displacements,
    forces: sol.forces,
    ratios: sol.ratios,
    modes: sol.modes,
    reactions: sol.reactions,
    maxRatio: sol.maxRatio,
    maxRatioIndex: sol.maxRatioIndex,
    maxDisplacement: sol.maxDisplacement,
    maxDisplacementNode: sol.maxDisplacementNode,
    solveMs: performance.now() - t0,
  }
}

const MODE_LABEL: Record<number, string> = {
  [MODE_YIELD_T]: 'yielded in tension',
  [MODE_YIELD_C]: 'crushed in compression',
  [MODE_BUCKLE]: 'buckled under compression',
}

function handleTest(req: Extract<SolverRequest, { type: 'test' }>): TestResponse {
  const t0 = performance.now()
  const model = buildModel(req.design)
  const f = factorise(model)

  const base: Omit<TestResponse, 'steps'> = {
    type: 'test',
    requestId: req.requestId,
    ok: f.ok,
    message: f.ok ? '' : instabilityMessage(model, f),
    summary: summarise(model, f),
    failureStep: -1,
    failureMemberIndex: -1,
    failureMode: MODE_NONE,
    failureReason: '',
    passed: false,
    maxRatio: 0,
    maxRatioIndex: -1,
    criticalStep: -1,
    peakDeflection: 0,
    peakDeflectionNode: -1,
    deflectionLimit: 0,
    liveLoadN: 0,
    solveMs: 0,
  }

  if (!f.ok) return { ...base, steps: [], solveMs: performance.now() - t0 }

  // Spec 4.3: node displacement must stay under span/100, capped at 300 mm.
  const deflectionLimit = Math.min(model.span / 100, 0.3)
  const axleOffsets = Float64Array.from(req.axleOffsets)
  const axleLoads = Float64Array.from(req.axleLoads)
  const liveLoadN = req.axleLoads.reduce((a, b) => a + b, 0)

  // The vehicle nose sweeps from just before the left abutment to just past the
  // right one, so every axle gets a full crossing.
  const startX = -req.vehicleLength
  const endX = model.span + req.vehicleLength
  const stepCount = Math.max(50, req.steps)

  const steps: TestStepData[] = []
  let failureStep = -1
  let failureMemberIndex = -1
  let failureMode = MODE_NONE
  let failureReason = ''
  let maxRatio = 0
  let maxRatioIndex = -1
  let criticalStep = -1
  let peakDeflection = 0
  let peakDeflectionNode = -1

  // Load Combination 1 (1.2D + 1.6L), or Combination 2 when wind is on
  // (1.2D + 1.0L + 1.0W) — see spec 9.3.
  const windOn = req.windSpeed > 0
  const lc: LoadCase = {
    deadFactor: 1.2,
    liveFactor: windOn ? 1.0 : 1.6,
    vehicleX: startX,
    axleOffsets,
    axleLoads,
    windSpeed: req.windSpeed,
    windFactor: 1.0,
  }

  for (let s = 0; s < stepCount; s++) {
    const t = stepCount === 1 ? 0 : s / (stepCount - 1)
    lc.vehicleX = startX + (endX - startX) * t
    const F = assembleLoads(model, lc)
    const sol = solveWith(model, f, F)

    steps.push({
      vehicleX: lc.vehicleX,
      displacements: sol.displacements,
      forces: sol.forces,
      ratios: sol.ratios,
      reactions: sol.reactions,
      modes: sol.modes,
      maxRatio: sol.maxRatio,
      maxRatioIndex: sol.maxRatioIndex,
      maxDisplacement: sol.maxDisplacement,
      maxDisplacementNode: sol.maxDisplacementNode,
    })

    if (sol.maxRatio > maxRatio) {
      maxRatio = sol.maxRatio
      maxRatioIndex = sol.maxRatioIndex
      criticalStep = s
    }
    if (sol.maxDisplacement > peakDeflection) {
      peakDeflection = sol.maxDisplacement
      peakDeflectionNode = sol.maxDisplacementNode
    }

    // --- failure checks, in the order the spec lists them -----------------
    // Once the first member goes, the structure no longer exists and the
    // linear-elastic solution past that point is meaningless — so stop here.
    // That also keeps the headline "max stress ratio" consistent with the
    // failure message instead of reporting some larger post-collapse number.
    const overStressed = sol.maxRatioIndex >= 0 && sol.maxRatio >= 1
    if (overStressed) {
      failureStep = s
      failureMemberIndex = sol.maxRatioIndex
      failureMode = sol.modes[sol.maxRatioIndex] || MODE_YIELD_T
      failureReason = `Member #${sol.maxRatioIndex + 1} ${
        MODE_LABEL[failureMode] ?? 'failed'
      } at ${(sol.maxRatio * 100).toFixed(0)}% of capacity`
      break
    }
    if (sol.maxDisplacement > deflectionLimit) {
      failureStep = s
      failureMemberIndex = sol.maxRatioIndex
      failureMode = MODE_NONE
      failureReason = `Joint ${sol.maxDisplacementNode + 1} deflected ${(
        sol.maxDisplacement * 1000
      ).toFixed(0)} mm, over the ${(deflectionLimit * 1000).toFixed(0)} mm serviceability limit`
      break
    }
    let supportFailed = false
    for (let i = 0; i < model.nodeCount; i++) {
      const r = Math.hypot(sol.reactions[2 * i], sol.reactions[2 * i + 1])
      if (r > SUPPORT_CAPACITY) {
        failureStep = s
        failureMemberIndex = -1
        failureMode = MODE_NONE
        failureReason = `Support at joint ${i + 1} exceeded its ${(
          SUPPORT_CAPACITY / 1000
        ).toFixed(0)} kN capacity`
        supportFailed = true
        break
      }
    }
    if (supportFailed) break
  }

  return {
    ...base,
    steps,
    failureStep,
    failureMemberIndex,
    failureMode,
    failureReason,
    passed: failureStep < 0,
    maxRatio,
    maxRatioIndex,
    criticalStep,
    peakDeflection,
    peakDeflectionNode,
    deflectionLimit,
    liveLoadN,
    solveMs: performance.now() - t0,
  }
}

self.onmessage = (event: MessageEvent<SolverRequest>) => {
  const req = event.data
  try {
    const response = req.type === 'live' ? handleLive(req) : handleTest(req)
    ;(self as unknown as Worker).postMessage(response)
  } catch (error) {
    // Never let a bad geometry take the worker down — report and keep going.
    console.error('[solver]', error)
    ;(self as unknown as Worker).postMessage({
      type: req.type,
      requestId: req.requestId,
      ok: false,
      message: error instanceof Error ? error.message : 'Solver error',
    })
  }
}
