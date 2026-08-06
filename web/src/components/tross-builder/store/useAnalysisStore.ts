/**
 * Analysis + simulation state.
 *
 * The render loop needs the playback cursor every frame, but React does not —
 * pushing 60 store updates per second would thrash the panels. So the cursor
 * lives in a plain mutable singleton (`playback`) that the 3D scene reads
 * directly, and is mirrored into the store at ~12 Hz for the HUD readouts.
 */

import { create } from 'zustand'
import type { LiveResponse, TestResponse } from '../analysis/protocol'
import type { TestPhase, TestResult } from '../types'
import type { CollapseCause } from '../sim/collapseSolver'

/** Frame-rate playback cursor — mutated in place, never triggers a render. */
export const playback = {
  /** step index as a float, so the 3D view can interpolate between solves */
  cursor: 0,
  /** seconds since the collapse began, 0 while the bridge is intact */
  collapseTime: 0,
  playing: false,
}

interface AnalysisState {
  live: LiveResponse | null
  /** true while a live solve is in flight, used for the "solving" pip */
  pending: boolean

  test: TestResponse | null
  result: TestResult | null
  phase: TestPhase
  /** mirrored playback cursor, 0..stepCount-1 */
  cursor: number
  /** id of the member that broke, for highlighting in 2D and 3D */
  brokenMemberId: string | null
  /** whether the full engineering report dialog is showing */
  resultDialogOpen: boolean
  /**
   * Every member lost during the collapse, in order. The solver's first break
   * is only the trigger — the report needs the whole chain, including members
   * crushed by falling debris.
   */
  collapseLog: { memberIndex: number; time: number; cause: CollapseCause }[]
  /**
   * Member the user asked to inspect ("Show me in 3D"). Drives the failure
   * marker and the focus camera; -1 when nothing is being inspected.
   */
  inspectMemberIndex: number

  setLive: (live: LiveResponse) => void
  setPending: (pending: boolean) => void
  startTest: () => void
  setTest: (test: TestResponse, result: TestResult) => void
  setPhase: (phase: TestPhase) => void
  setCursor: (cursor: number) => void
  setBrokenMember: (id: string | null) => void
  setResultDialogOpen: (open: boolean) => void
  setCollapseLog: (log: { memberIndex: number; time: number; cause: CollapseCause }[]) => void
  /** Rewind to the failure instant and focus the camera on that member. */
  inspectMember: (index: number) => void
  clearInspect: () => void
  resetTest: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  live: null,
  pending: false,
  test: null,
  result: null,
  phase: 'idle',
  cursor: 0,
  brokenMemberId: null,
  resultDialogOpen: false,
  inspectMemberIndex: -1,
  collapseLog: [],

  setLive: (live) => set({ live, pending: false }),
  setPending: (pending) => set({ pending }),

  startTest: () => {
    playback.cursor = 0
    playback.collapseTime = 0
    playback.playing = false
    set({
      phase: 'solving',
      test: null,
      result: null,
      cursor: 0,
      brokenMemberId: null,
      resultDialogOpen: false,
      inspectMemberIndex: -1,
      collapseLog: [],
    })
  },

  setTest: (test, result) => {
    playback.cursor = 0
    playback.collapseTime = 0
    playback.playing = true
    set({ test, result, phase: 'running', cursor: 0 })
  },

  setPhase: (phase) => {
    playback.playing = phase === 'running' || phase === 'collapsing'
    // Reaching the end of a run is what surfaces the full report.
    set(phase === 'complete' ? { phase, resultDialogOpen: true } : { phase })
  },

  setCursor: (cursor) => set({ cursor }),
  setBrokenMember: (id) => set({ brokenMemberId: id }),
  setResultDialogOpen: (resultDialogOpen) => set({ resultDialogOpen }),
  setCollapseLog: (collapseLog) => set({ collapseLog }),

  /**
   * "Show me in 3D": wind the animation back to the last intact instant so the
   * structure is standing again, then park there with the member marked.
   */
  inspectMember: (index) => {
    const { test } = useAnalysisStore.getState()
    const failureStep = test?.failureStep ?? -1
    playback.cursor = failureStep >= 0 ? Math.max(0, failureStep - 1) : playback.cursor
    playback.collapseTime = 0
    playback.playing = false
    set({
      inspectMemberIndex: index,
      resultDialogOpen: false,
      phase: 'paused',
      cursor: playback.cursor,
    })
  },

  clearInspect: () => set({ inspectMemberIndex: -1 }),

  resetTest: () => {
    playback.cursor = 0
    playback.collapseTime = 0
    playback.playing = false
    set({
      phase: 'idle',
      test: null,
      result: null,
      cursor: 0,
      brokenMemberId: null,
      resultDialogOpen: false,
      inspectMemberIndex: -1,
      collapseLog: [],
    })
  },
}))
