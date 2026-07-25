import { create } from "zustand";
import { PlacedComponent, Wire, ComponentType } from "../components/electronics/types";
import { COMPONENT_LIBRARY } from "../components/electronics/componentLibrary";

let idCounter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

interface Snapshot { components: PlacedComponent[]; wires: Wire[]; }

interface ElectronicsState {
  components: PlacedComponent[];
  wires: Wire[];
  selectedId: string | null;
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
  addWire: (from: Wire["from"], to: Wire["to"], color: string) => void;
  removeWire: (id: string) => void;
  setWireColor: (c: string) => void;
  select: (id: string | null) => void;
  clear: () => void;
  loadExample: (comps: PlacedComponent[], wires: Wire[]) => void;
  undo: () => void;
  redo: () => void;
}

const snap = (s: { components: PlacedComponent[]; wires: Wire[] }): Snapshot => ({
  components: structuredClone(s.components),
  wires: structuredClone(s.wires),
});

export const useElectronicsStore = create<ElectronicsState>((set, get) => {
  const pushHistory = () => set((s) => ({ past: [...s.past.slice(-49), snap(s)], future: [] }));

  return {
    components: [],
    wires: [],
    selectedId: null,
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
      set((s) => ({ components: [...s.components, comp], selectedId: comp.id }));
      return comp.id;
    },

    // moveComponent is called continuously during drag; history is captured on commitMove.
    moveComponent: (id, x, y) =>
      set((s) => ({
        components: s.components.map((c) => (c.id === id ? { ...c, x: Math.round(x), y: Math.round(y) } : c)),
      })),

    commitMove: () => pushHistory(),

    rotateComponent: (id) => {
      pushHistory();
      set((s) => ({
        components: s.components.map((c) => (c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c)),
      }));
    },

    duplicateComponent: (id) => {
      const src = get().components.find((c) => c.id === id);
      if (!src) return;
      pushHistory();
      const copy: PlacedComponent = { ...structuredClone(src), id: uid(src.type), x: src.x + 30, y: src.y + 30 };
      set((s) => ({ components: [...s.components, copy], selectedId: copy.id }));
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

    addWire: (from, to, color) => {
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
      set((s) => ({ wires: [...s.wires, { id: uid("w"), from, to, color }] }));
    },

    removeWire: (id) => {
      pushHistory();
      set((s) => ({ wires: s.wires.filter((w) => w.id !== id) }));
    },

    setWireColor: (c) => set({ wireColor: c }),

    select: (id) => set({ selectedId: id }),

    clear: () => { pushHistory(); set({ components: [], wires: [], selectedId: null }); },

    loadExample: (comps, wires) => { pushHistory(); set({ components: comps, wires, selectedId: null }); },

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
        };
      }),
  };
});
