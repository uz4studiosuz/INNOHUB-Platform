/**
 * Score calculation (spec 6.2).
 *
 *   Efficiency  = (Failure Load / Self Weight) * Material Bonus
 *   Cost Factor = 1 - (Total Cost / Max Allowable Cost)
 *   Score       = (Efficiency * 40) + (Cost Factor * 30) + (Pass/Fail * 30)
 *
 * Efficiency is a raw ratio, so it is normalised against EFFICIENCY_TARGET
 * before being scaled to its 40 points — otherwise the total would run past
 * 100.
 *
 * The target is calibrated empirically (see calibration.test.ts): on the
 * default 24 m span the deck slab dominates the dead load, so even a well
 * proportioned truss only carries about 3-4x its own weight in live load.
 * Setting the bar at 25 (a figure that suits balsa competition models, where
 * self weight is negligible) made the whole 40-point term unreachable and left
 * every design scoring within a few points of every other.
 */

import type { MaterialId, TestResult } from '../types'
import { MATERIALS } from '../data/materials'
import type { ModelSummary, TestResponse } from './protocol'

export const MAX_ALLOWABLE_COST = 50_000
export const EFFICIENCY_TARGET = 4

/** Mass-weighted average of the per-material score bonuses. */
export function materialBonus(massByMaterial: Record<MaterialId, number>): number {
  let mass = 0
  let weighted = 0
  for (const key of Object.keys(massByMaterial) as MaterialId[]) {
    const m = massByMaterial[key]
    mass += m
    weighted += m * MATERIALS[key].bonus
  }
  return mass > 0 ? weighted / mass : 1
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

export interface ScoreInputs {
  passed: boolean
  /** live load the structure can carry before the first member reaches 100%, N */
  capacityLoad: number
  /** self weight of the truss members, N */
  selfWeightN: number
  totalCost: number
  massByMaterial: Record<MaterialId, number>
}

export function computeScore(input: ScoreInputs) {
  const bonus = materialBonus(input.massByMaterial)
  const efficiency =
    input.selfWeightN > 0 ? (input.capacityLoad / input.selfWeightN) * bonus : 0
  const costFactor = clamp01(1 - input.totalCost / MAX_ALLOWABLE_COST)

  const efficiencyPoints = clamp01(efficiency / EFFICIENCY_TARGET) * 40
  const costPoints = costFactor * 30
  const passPoints = input.passed ? 30 : 0

  return {
    efficiency,
    costFactor,
    bonus,
    score: Math.round(efficiencyPoints + costPoints + passPoints),
    breakdown: {
      efficiency: efficiencyPoints,
      cost: costPoints,
      passFail: passPoints,
    },
  }
}

/**
 * Turn a raw worker test response into the user-facing result object.
 *
 * `capacityLoad` is back-figured from the worst utilisation seen during the
 * crossing: at ratio r the applied live load uses r of the available capacity,
 * so the load that would bring the worst member to exactly 100% is L / r.
 */
export function buildTestResult(
  res: TestResponse,
  summary: ModelSummary,
  memberIds: string[],
  nodeIds: string[],
): TestResult {
  const capacityLoad =
    res.maxRatio > 1e-9 ? res.liveLoadN / res.maxRatio : res.liveLoadN

  const scored = computeScore({
    passed: res.passed,
    capacityLoad,
    selfWeightN: summary.selfWeightN,
    totalCost: summary.totalCost,
    massByMaterial: summary.massByMaterial,
  })

  const modeNames: Record<number, TestResult['failureMode']> = {
    0: 'none',
    1: 'yield-tension',
    2: 'yield-compression',
    3: 'buckling',
  }

  return {
    passed: res.passed,
    failureStep: res.failureStep,
    failureMemberId: memberIds[res.failureMemberIndex] ?? '',
    failureMode: modeNames[res.failureMode] ?? 'none',
    failureReason: res.failureReason,
    maxRatio: res.maxRatio,
    maxRatioMemberId: memberIds[res.maxRatioIndex] ?? '',
    peakDeflection: res.peakDeflection,
    peakDeflectionNodeId: nodeIds[res.peakDeflectionNode] ?? '',
    capacityLoad,
    selfWeightN: summary.selfWeightN,
    efficiency: scored.efficiency,
    costFactor: scored.costFactor,
    score: scored.score,
    scoreBreakdown: scored.breakdown,
  }
}
