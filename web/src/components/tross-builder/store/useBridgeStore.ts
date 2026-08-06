/**
 * Global design state: geometry, editing tools, and a 50+ step undo stack.
 *
 * Only `design` is snapshotted for undo/redo — tool selection and view flags
 * are transient UI state and stay outside the history.
 */

import { create } from 'zustand'
import type {
  BridgeDesign,
  BridgeNode,
  LoadConfig,
  MaterialId,
  Member,
  SupportType,
  ToolId,
  ViewMode,
} from '../types'
import { DEFAULT_CONFIG, buildPreset, type PresetId } from '../data/presets'
import { defaultSectionFor, getSection } from '../data/materials'
import { uid } from '../utils/id'

const HISTORY_LIMIT = 80 // spec asks for at least 50

export type CameraPreset = 'perspective' | 'front' | 'side' | 'top' | 'drive' | 'inspect'

export interface OverlaySettings {
  showForces: boolean
  showLabels: boolean
  showDeflection: boolean
  /** exaggeration factor applied to the 2D deflected shape */
  deflectionScale: number
  /**
   * Exaggeration applied to the 3D model. Real deflections are millimetres on a
   * 24 m span, so a modest factor is needed before the bridge visibly sags.
   */
  scale3d: number
  /** stress map on/off in the 3D view */
  showStressMap: boolean
}

interface BridgeState {
  design: BridgeDesign
  past: BridgeDesign[]
  future: BridgeDesign[]

  tool: ToolId
  activeMaterial: MaterialId
  activeSection: string
  selectedMemberId: string | null
  selectedNodeId: string | null
  /** first node of an in-progress member */
  pendingNodeId: string | null

  view: ViewMode
  camera: CameraPreset
  overlay: OverlaySettings
  load: LoadConfig
  showTutorial: boolean

  // --- actions ----------------------------------------------------------
  setTool: (tool: ToolId) => void
  setView: (view: ViewMode) => void
  setCamera: (preset: CameraPreset) => void
  setActiveMaterial: (id: MaterialId) => void
  setActiveSection: (id: string) => void
  setOverlay: (patch: Partial<OverlaySettings>) => void
  setLoad: (patch: Partial<LoadConfig>) => void
  setShowTutorial: (v: boolean) => void

  select: (opts: { nodeId?: string | null; memberId?: string | null }) => void
  setPendingNode: (id: string | null) => void

  addNode: (x: number, y: number) => string | null
  deleteNode: (id: string) => void
  moveNode: (id: string, x: number, y: number, commit: boolean) => void
  setSupport: (id: string, support: SupportType) => void
  toggleLock: (id: string) => void

  addMember: (a: string, b: string) => void
  deleteMember: (id: string) => void
  paintMember: (id: string, materialId: MaterialId, sectionId: string) => void
  applyGlobalMaterial: (materialId: MaterialId, sectionId: string) => void

  loadPreset: (id: PresetId) => void
  setSpan: (span: number) => void
  setGridStep: (step: number) => void
  clearAll: () => void

  undo: () => void
  redo: () => void
}

function cloneDesign(d: BridgeDesign): BridgeDesign {
  return {
    ...d,
    nodes: d.nodes.map((n) => ({ ...n })),
    members: d.members.map((m) => ({ ...m })),
  }
}

/** Distance from point p to the segment a-b, plus the parametric position. */
function pointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return { dist: Math.hypot(px - ax, py - ay), t: 0 }
  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  const cl = Math.max(0, Math.min(1, t))
  return { dist: Math.hypot(px - (ax + cl * dx), py - (ay + cl * dy)), t }
}

const TOL = 1e-4

export const useBridgeStore = create<BridgeState>((set, get) => {
  /** Apply a mutation to the design and push the previous state onto history. */
  const commit = (mutate: (d: BridgeDesign) => void) => {
    set((state) => {
      const next = cloneDesign(state.design)
      mutate(next)
      const past = [...state.past, state.design]
      if (past.length > HISTORY_LIMIT) past.shift()
      return { design: next, past, future: [] }
    })
  }

  return {
    design: buildPreset('warren', DEFAULT_CONFIG),
    past: [],
    future: [],

    tool: 'select',
    activeMaterial: 'steel',
    activeSection: defaultSectionFor('steel'),
    selectedMemberId: null,
    selectedNodeId: null,
    pendingNodeId: null,

    view: '2d',
    camera: 'perspective',
    overlay: {
      showForces: false,
      showLabels: false,
      showDeflection: false,
      deflectionScale: 200,
      scale3d: 12,
      showStressMap: true,
    },
    load: {
      vehicle: 'truck',
      customLoad: 40_000,
      windEnabled: false,
      windSpeed: 60,
      speed: 1,
    },
    showTutorial: true,

    // --- UI state -------------------------------------------------------
    setTool: (tool) => set({ tool, pendingNodeId: null }),
    setView: (view) => set({ view }),
    setCamera: (camera) => set({ camera }),
    setActiveMaterial: (id) =>
      set({ activeMaterial: id, activeSection: defaultSectionFor(id) }),
    setActiveSection: (id) => set({ activeSection: id }),
    setOverlay: (patch) => set((s) => ({ overlay: { ...s.overlay, ...patch } })),
    setLoad: (patch) => set((s) => ({ load: { ...s.load, ...patch } as LoadConfig })),
    setShowTutorial: (v) => set({ showTutorial: v }),

    select: ({ nodeId, memberId }) =>
      set((s) => ({
        selectedNodeId: nodeId === undefined ? s.selectedNodeId : nodeId,
        selectedMemberId: memberId === undefined ? s.selectedMemberId : memberId,
      })),
    setPendingNode: (id) => set({ pendingNodeId: id }),

    // --- nodes ----------------------------------------------------------
    addNode: (x, y) => {
      const { design } = get()
      // Reuse an existing node if the click landed on one.
      const existing = design.nodes.find(
        (n) => Math.abs(n.x - x) < TOL && Math.abs(n.y - y) < TOL,
      )
      if (existing) return existing.id

      const id = uid('n')
      commit((d) => {
        d.nodes.push({ id, x, y, support: 'none', locked: false })

        // Clicking on a member inserts the node into it (spec 3.1).
        const hit = d.members.find((m) => {
          const a = d.nodes.find((n) => n.id === m.a)!
          const b = d.nodes.find((n) => n.id === m.b)!
          const { dist, t } = pointOnSegment(x, y, a.x, a.y, b.x, b.y)
          return dist < TOL && t > TOL && t < 1 - TOL
        })
        if (hit) {
          const { a, b, materialId, sectionId } = hit
          d.members = d.members.filter((m) => m.id !== hit.id)
          d.members.push({ id: uid('m'), a, b: id, materialId, sectionId })
          d.members.push({ id: uid('m'), a: id, b, materialId, sectionId })
        }
      })
      return id
    },

    deleteNode: (id) => {
      const node = get().design.nodes.find((n) => n.id === id)
      if (!node || node.locked) return
      commit((d) => {
        d.nodes = d.nodes.filter((n) => n.id !== id)
        d.members = d.members.filter((m) => m.a !== id && m.b !== id)
      })
      set({ selectedNodeId: null })
    },

    moveNode: (id, x, y, doCommit) => {
      const node = get().design.nodes.find((n) => n.id === id)
      if (!node || node.locked) return
      if (doCommit) {
        commit((d) => {
          const n = d.nodes.find((v) => v.id === id)
          if (n) {
            n.x = x
            n.y = y
          }
        })
      } else {
        // Live drag: mutate without touching history so one drag = one undo.
        set((s) => ({
          design: {
            ...s.design,
            nodes: s.design.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
          },
        }))
      }
    },

    setSupport: (id, support) =>
      commit((d) => {
        const n = d.nodes.find((v) => v.id === id)
        if (!n) return
        n.support = support
        n.locked = support !== 'none'
      }),

    toggleLock: (id) =>
      commit((d) => {
        const n = d.nodes.find((v) => v.id === id)
        // Supports are structurally fixed and stay locked.
        if (n && n.support === 'none') n.locked = !n.locked
      }),

    // --- members --------------------------------------------------------
    addMember: (a, b) => {
      if (a === b) return
      const { design, activeMaterial, activeSection } = get()
      const na = design.nodes.find((n) => n.id === a)
      const nb = design.nodes.find((n) => n.id === b)
      if (!na || !nb) return

      // A member may not pass through another joint without connecting to it,
      // so split the run at every node that lies on it (spec 3.1).
      const between = design.nodes
        .filter((n) => {
          if (n.id === a || n.id === b) return false
          const { dist, t } = pointOnSegment(n.x, n.y, na.x, na.y, nb.x, nb.y)
          return dist < TOL && t > TOL && t < 1 - TOL
        })
        .map((n) => ({
          id: n.id,
          t: pointOnSegment(n.x, n.y, na.x, na.y, nb.x, nb.y).t,
        }))
        .sort((p, q) => p.t - q.t)

      const chain = [a, ...between.map((n) => n.id), b]

      commit((d) => {
        for (let i = 0; i < chain.length - 1; i++) {
          const p = chain[i]
          const q = chain[i + 1]
          // Auto-merge: never create a duplicate of an existing member.
          const dup = d.members.some(
            (m) => (m.a === p && m.b === q) || (m.a === q && m.b === p),
          )
          if (dup) continue
          d.members.push({
            id: uid('m'),
            a: p,
            b: q,
            materialId: activeMaterial,
            sectionId: activeSection,
          })
        }
      })
    },

    deleteMember: (id) => {
      commit((d) => {
        d.members = d.members.filter((m) => m.id !== id)
      })
      set({ selectedMemberId: null })
    },

    paintMember: (id, materialId, sectionId) =>
      commit((d) => {
        const m = d.members.find((v) => v.id === id)
        if (!m) return
        m.materialId = materialId
        // Guard against a section that belongs to a different material.
        m.sectionId =
          getSection(sectionId).materialId === materialId
            ? sectionId
            : defaultSectionFor(materialId)
      }),

    applyGlobalMaterial: (materialId, sectionId) =>
      commit((d) => {
        for (const m of d.members) {
          m.materialId = materialId
          m.sectionId = sectionId
        }
      }),

    // --- whole-design ---------------------------------------------------
    loadPreset: (id) => {
      const { design, activeMaterial } = get()
      const next = buildPreset(id, {
        ...DEFAULT_CONFIG,
        span: design.span,
        clearance: design.clearance,
        gridStep: design.gridStep,
        material: activeMaterial,
      })
      set((s) => ({
        design: next,
        past: [...s.past, s.design].slice(-HISTORY_LIMIT),
        future: [],
        selectedMemberId: null,
        selectedNodeId: null,
        pendingNodeId: null,
      }))
    },

    setSpan: (span) =>
      commit((d) => {
        const old = d.span
        d.span = span
        // Scale the whole design so the abutments stay at the ends.
        if (old > 0) {
          const k = span / old
          for (const n of d.nodes) n.x = Math.round(n.x * k * 1000) / 1000
        }
      }),

    setGridStep: (step) => commit((d) => void (d.gridStep = step)),

    clearAll: () => get().loadPreset('blank'),

    // --- history --------------------------------------------------------
    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s
        const previous = s.past[s.past.length - 1]
        return {
          design: previous,
          past: s.past.slice(0, -1),
          future: [s.design, ...s.future].slice(0, HISTORY_LIMIT),
          selectedMemberId: null,
          pendingNodeId: null,
        }
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s
        const next = s.future[0]
        return {
          design: next,
          past: [...s.past, s.design].slice(-HISTORY_LIMIT),
          future: s.future.slice(1),
          selectedMemberId: null,
          pendingNodeId: null,
        }
      }),
  }
})

// --- derived helpers --------------------------------------------------------

export function memberEndpoints(design: BridgeDesign, member: Member) {
  const a = design.nodes.find((n) => n.id === member.a)
  const b = design.nodes.find((n) => n.id === member.b)
  return a && b ? { a, b } : null
}

export function memberLength(design: BridgeDesign, member: Member) {
  const e = memberEndpoints(design, member)
  return e ? Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) : 0
}

export function nodeById(design: BridgeDesign, id: string): BridgeNode | undefined {
  return design.nodes.find((n) => n.id === id)
}
