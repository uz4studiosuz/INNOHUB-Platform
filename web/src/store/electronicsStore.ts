import { create } from "zustand";
import { PlacedComponent, Wire, ComponentType } from "../components/electronics/types";
import { COMPONENT_LIBRARY } from "../components/electronics/componentLibrary";
import { snapPosition } from "../components/electronics/geometry";
import { PITCH } from "../components/electronics/units";

let idCounter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

interface Snapshot { components: PlacedComponent[]; wires: Wire[]; }

interface ElectronicsState {
  components: PlacedComponent[];
  wires: Wire[];
  selectedId: string | null;
  /** A wire can be selected too, which is what the colour swatches recolour. */
  selectedWireId: string | null;
  wireColor: string;
  past: Snapshot[];
  future: Snapshot[];
  addComponent: (type: ComponentType, x: number, y: number) => string;
  moveComponent: (id: string, x: number, y: number) => void;
  commitMove: () => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  removeComponent: (id: string) => void;
  setProp: (id: string, key: string, value: number | string) => void;
  addWire: (from: Wire["from"], to: Wire["to"], color: string, points?: Wire["points"]) => void;
  removeWire: (id: string) => void;
  setWireColor: (c: string) => void;
  recolorWire: (id: string, color: string) => void;
  /** Break a wire open at `index` (the segment that was double-clicked). */
  addWireBend: (id: string, index: number, x: number, y: number) => void;
  moveWireBend: (id: string, index: number, x: number, y: number) => void;
  removeWireBend: (id: string, index: number) => void;
  select: (id: string | null) => void;
  selectWire: (id: string | null) => void;
  clear: () => void;
  loadExample: (comps: PlacedComponent[], wires: Wire[]) => void;
  undo: () => void;
  redo: () => void;
}

const snap = (s: { components: PlacedComponent[]; wires: Wire[] }): Snapshot => ({
  components: structuredClone(s.components),
  wires: structuredClone(s.wires),
});

/** Pull one component back onto the breadboard grid, in place in the list. */
function reseat(components: PlacedComponent[], id: string): PlacedComponent[] {
  const me = components.find((c) => c.id === id);
  if (!me) return components;
  const p = snapPosition(components, me, me.x, me.y);
  return components.map((c) => (c.id === id ? { ...c, x: Math.round(p.x), y: Math.round(p.y) } : c));
}

export const useElectronicsStore = create<ElectronicsState>((set, get) => {
  const pushHistory = () => set((s) => ({ past: [...s.past.slice(-49), snap(s)], future: [] }));

  return {
    components: [],
    wires: [],
    selectedId: null,
    selectedWireId: null,
    wireColor: "#16a34a",
    past: [],
    future: [],

    addComponent: (type, x, y) => {
      pushHistory();
      const def = COMPONENT_LIBRARY[type];
      const comp: PlacedComponent = {
        id: uid(type), type, x: Math.round(x), y: Math.round(y), rotation: 0,
        props: { ...(def.defaults ?? {}) },
      };
      set((s) => ({ components: [...s.components, comp], selectedId: comp.id, selectedWireId: null }));
      return comp.id;
    },

    // moveComponent is called continuously during drag; history is captured on commitMove.
    moveComponent: (id, x, y) =>
      set((s) => ({
        components: s.components.map((c) => (c.id === id ? { ...c, x: Math.round(x), y: Math.round(y) } : c)),
      })),

    commitMove: () => pushHistory(),

    // Turning a part swings its legs onto different holes, and duplicating one
    // drops a second body a couple of tie points over - both have to re-seat on
    // the grid afterwards, or the copy sits between rows.
    rotateComponent: (id) => {
      pushHistory();
      set((s) => {
        const turned = s.components.map((c) => (c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c));
        return { components: reseat(turned, id) };
      });
    },

    duplicateComponent: (id) => {
      const src = get().components.find((c) => c.id === id);
      if (!src) return;
      pushHistory();
      const copy: PlacedComponent = {
        ...structuredClone(src), id: uid(src.type),
        x: src.x + PITCH * 2, y: src.y + PITCH * 2,
      };
      set((s) => ({ components: reseat([...s.components, copy], copy.id), selectedId: copy.id, selectedWireId: null }));
    },

    removeComponent: (id) => {
      pushHistory();
      set((s) => ({
        components: s.components.filter((c) => c.id !== id),
        wires: s.wires.filter((w) => w.from.compId !== id && w.to.compId !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }));
    },

    setProp: (id, key, value) =>
      set((s) => ({
        components: s.components.map((c) => (c.id === id ? { ...c, props: { ...c.props, [key]: value } } : c)),
      })),

    addWire: (from, to, color, points) => {
      if (from.compId === to.compId && from.terminalId === to.terminalId) return;
      const exists = get().wires.some(
        (w) =>
          (w.from.compId === from.compId && w.from.terminalId === from.terminalId &&
            w.to.compId === to.compId && w.to.terminalId === to.terminalId) ||
          (w.to.compId === from.compId && w.to.terminalId === from.terminalId &&
            w.from.compId === to.compId && w.from.terminalId === to.terminalId)
      );
      if (exists) return;
      pushHistory();
      set((s) => ({
        wires: [...s.wires, { id: uid("w"), from, to, color, ...(points?.length ? { points } : {}) }],
      }));
    },

    removeWire: (id) => {
      pushHistory();
      set((s) => ({
        wires: s.wires.filter((w) => w.id !== id),
        selectedWireId: s.selectedWireId === id ? null : s.selectedWireId,
      }));
    },

    setWireColor: (c) => set({ wireColor: c }),

    recolorWire: (id, color) => {
      pushHistory();
      set((s) => ({ wires: s.wires.map((w) => (w.id === id ? { ...w, color } : w)) }));
    },

    addWireBend: (id, index, x, y) => {
      pushHistory();
      set((s) => ({
        wires: s.wires.map((w) => {
          if (w.id !== id) return w;
          const pts = [...(w.points ?? [])];
          pts.splice(index, 0, { x: Math.round(x), y: Math.round(y) });
          return { ...w, points: pts };
        }),
      }));
    },

    // Called continuously while a bend is dragged; history is taken on release
    // through commitMove, the same way component dragging works.
    moveWireBend: (id, index, x, y) =>
      set((s) => ({
        wires: s.wires.map((w) => {
          if (w.id !== id || !w.points?.[index]) return w;
          const pts = [...w.points];
          pts[index] = { x: Math.round(x), y: Math.round(y) };
          return { ...w, points: pts };
        }),
      })),

    removeWireBend: (id, index) => {
      pushHistory();
      set((s) => ({
        wires: s.wires.map((w) =>
          w.id === id && w.points ? { ...w, points: w.points.filter((_, i) => i !== index) } : w
        ),
      }));
    },

    select: (id) => set({ selectedId: id, selectedWireId: null }),

    selectWire: (id) => set({ selectedWireId: id, selectedId: null }),

    clear: () => { pushHistory(); set({ components: [], wires: [], selectedId: null, selectedWireId: null }); },

    loadExample: (comps, wires) => { pushHistory(); set({ components: comps, wires, selectedId: null, selectedWireId: null }); },

    undo: () =>
      set((s) => {
        if (!s.past.length) return s;
        const prev = s.past[s.past.length - 1];
        return {
          past: s.past.slice(0, -1),
          future: [snap(s), ...s.future].slice(0, 50),
          components: prev.components,
          wires: prev.wires,
          selectedId: null,
          selectedWireId: null,
        };
      }),

    redo: () =>
      set((s) => {
        if (!s.future.length) return s;
        const next = s.future[0];
        return {
          future: s.future.slice(1),
          past: [...s.past, snap(s)],
          components: next.components,
          wires: next.wires,
          selectedId: null,
          selectedWireId: null,
        };
      }),
  };
});
