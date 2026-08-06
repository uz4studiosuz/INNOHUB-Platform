/**
 * Owns the solver worker and keeps the live analysis in sync with the design.
 *
 * Live solves are debounced on a short timer and superseded by request id, so
 * dragging a node never queues up a backlog of stale results.
 *
 * The debounce deliberately uses setTimeout rather than requestAnimationFrame:
 * browsers suspend rAF in a hidden or non-compositing tab, which left the
 * analysis stuck on "solving" until the user looked at the page again.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useBridgeStore } from '../store/useBridgeStore'
import { useAnalysisStore } from '../store/useAnalysisStore'
import { buildTestResult } from './scoring'
import type { SolverResponse, TestRequest } from './protocol'
import type { BridgeDesign } from '../types'

/** Vehicle definitions — axle offsets are measured back from the nose. */
export const VEHICLES = {
  truck: {
    id: 'truck' as const,
    name: 'Truck (40 kN)',
    length: 6.5,
    axles: [
      { offset: 1.2, load: 12_000 },
      { offset: 5.0, load: 28_000 },
    ],
  },
  train: {
    id: 'train' as const,
    name: 'Train (160 kN)',
    length: 14,
    axles: [
      { offset: 1.5, load: 40_000 },
      { offset: 4.5, load: 40_000 },
      { offset: 9.5, load: 40_000 },
      { offset: 12.5, load: 40_000 },
    ],
  },
} as const

export function vehicleSpec(kind: 'truck' | 'train' | 'custom', customLoad: number) {
  if (kind === 'custom') {
    // A single heavy axle in the middle of a short carrier.
    return {
      id: 'custom' as const,
      name: 'Custom load',
      length: 4,
      axles: [{ offset: 2, load: customLoad }],
    }
  }
  return VEHICLES[kind]
}

export function useSolver() {
  const workerRef = useRef<Worker | null>(null)
  const requestId = useRef(0)
  const latestLive = useRef(0)
  const latestTest = useRef(0)
  /** debounce timer handle for the live solve */
  const frame = useRef(0)

  const design = useBridgeStore((s) => s.design)

  // --- worker lifecycle ---------------------------------------------------
  useEffect(() => {
    const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<SolverResponse>) => {
      const res = event.data
      const store = useAnalysisStore.getState()

      if (res.type === 'live') {
        if (res.requestId !== latestLive.current) return // superseded
        store.setLive(res)
      } else if (res.type === 'test') {
        if (res.requestId !== latestTest.current) return
        if (!res.ok || res.steps.length === 0) {
          store.setPhase('idle')
          return
        }
        const { design: current } = useBridgeStore.getState()
        const result = buildTestResult(
          res,
          res.summary,
          current.members.map((m) => m.id),
          current.nodes.map((n) => n.id),
        )
        store.setTest(res, result)
      }
    }

    worker.onerror = (event) => {
      console.error('[solver] worker failed to start', event.message)
      useAnalysisStore.getState().setPending(false)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // --- live analysis on every design change -------------------------------
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    window.clearTimeout(frame.current)
    useAnalysisStore.getState().setPending(true)
    frame.current = window.setTimeout(() => {
      requestId.current += 1
      latestLive.current = requestId.current
      worker.postMessage({
        type: 'live',
        requestId: requestId.current,
        design,
        deadFactor: 1.0,
      })
    }, 16)
    return () => window.clearTimeout(frame.current)
  }, [design])

  // --- moving-load test ---------------------------------------------------
  const runTest = useCallback(
    (opts: {
      design: BridgeDesign
      vehicle: 'truck' | 'train' | 'custom'
      customLoad: number
      windSpeed: number
      steps?: number
    }) => {
      const worker = workerRef.current
      if (!worker) return
      const spec = vehicleSpec(opts.vehicle, opts.customLoad)
      requestId.current += 1
      latestTest.current = requestId.current
      const req: TestRequest = {
        type: 'test',
        requestId: requestId.current,
        design: opts.design,
        axleOffsets: spec.axles.map((a) => a.offset),
        axleLoads: spec.axles.map((a) => a.load),
        vehicleLength: spec.length,
        windSpeed: opts.windSpeed,
        steps: opts.steps ?? 72,
      }
      worker.postMessage(req)
    },
    [],
  )

  return { runTest }
}
