import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  RocketDesign, 
  RocketAnalysis, 
  PropulsionParams, 
  RecoveryParams, 
  NoseParams, 
  ConeTubeParams, 
  ConeTransitionParams, 
  FinsParams, 
  computeRocketMetrics 
} from "../lib/physics/rocketPhysics";

export type RocketPanelType = "propulsion" | "recovery" | "nose" | "conetube" | "conetransition" | "fins" | "designmodel" | "weight" | "thrust" | "drag" | "stability";

interface RocketStoreState extends RocketDesign {
  // UI State
  activePanel: RocketPanelType;
  visibility: Record<string, boolean>;

  // Derived state
  analysis: RocketAnalysis;

  // Actions
  setActivePanel: (panel: RocketPanelType) => void;
  toggleVisibility: (part: string) => void;

  updatePropulsion: (updates: Partial<PropulsionParams>) => void;
  updateRecovery: (updates: Partial<RecoveryParams>) => void;
  updateNose: (updates: Partial<NoseParams>) => void;
  updateConeTube: (updates: Partial<ConeTubeParams>) => void;
  updateConeTransition: (updates: Partial<ConeTransitionParams>) => void;
  updateFins: (updates: Partial<FinsParams>) => void;
  
  // Revisions (File System)
  revisions: Array<{
    id: number;
    performance: number;
    status: "IN_SPEC" | "OUT_OF_SPEC";
    isWorkingCopy: boolean;
  }>;
  saveRevision: (isWorkingCopy: boolean) => void;

  // Recomputes the analysis metrics
  recompute: () => void;
}

export const useRocketStore = create<RocketStoreState>()(
  persist(
    (set, get) => ({
  activePanel: "propulsion",
  visibility: {
    propulsion: true,
    recovery: true,
    nose: true,
    conetube: true,
    conetransition: true,
    fins: true,
    designmodel: true,
  },

  // Default Rocket Design
  propulsion: { pressurePsi: 60, waterVolumeL: 0.35, bottleSize: "20oz_coke" },
  recovery: { system: "parachute", parachuteSizeMm: 200 },
  nose: { materialCode: "BT55", ballSizeMm: 38, clayMassG: 5.0 },
  coneTube: { lengthMm: 120.0, diameterMm: 60 },
  coneTransition: { transitionLengthMm: 120.0 },
  fins: { count: 4, shapePoints: 4, spanMm: 50, rootChordMm: 60, tipChordMm: 30, sweepMm: 20, material: "default" },

  analysis: computeRocketMetrics({
    propulsion: { pressurePsi: 60, waterVolumeL: 0.35, bottleSize: "20oz_coke" },
    recovery: { system: "parachute", parachuteSizeMm: 200 },
    nose: { materialCode: "BT55", ballSizeMm: 38, clayMassG: 5.0 },
    coneTube: { lengthMm: 120.0, diameterMm: 60 },
    coneTransition: { transitionLengthMm: 120.0 },
    fins: { count: 4, shapePoints: 4, spanMm: 50, rootChordMm: 60, tipChordMm: 30, sweepMm: 20, material: "default" },
  }),

  revisions: [],

  setActivePanel: (panel) => set({ activePanel: panel }),
  toggleVisibility: (part) => set((state) => ({ 
    visibility: { ...state.visibility, [part]: !state.visibility[part] } 
  })),

  recompute: () => {
    const state = get();
    const design: RocketDesign = {
      propulsion: state.propulsion,
      recovery: state.recovery,
      nose: state.nose,
      coneTube: state.coneTube,
      coneTransition: state.coneTransition,
      fins: state.fins,
    };
    set({ analysis: computeRocketMetrics(design) });
  },

  saveRevision: (isWorkingCopy) => {
    const state = get();
    // Use maxHeight as a performance metric proxy (0 to ~30 scaled down to 0-10)
    const perfScore = Math.min(10, state.analysis.maxHeightM / 3);
    const newRev = {
      id: state.revisions.length + 1,
      performance: perfScore,
      status: state.analysis.specStatus,
      isWorkingCopy
    };
    set({ revisions: [...state.revisions, newRev] });
  },

  updatePropulsion: (updates) => {
    set((state) => ({ propulsion: { ...state.propulsion, ...updates } }));
    get().recompute();
  },
  updateRecovery: (updates) => {
    set((state) => ({ recovery: { ...state.recovery, ...updates } }));
    get().recompute();
  },
  updateNose: (updates) => {
    set((state) => ({ nose: { ...state.nose, ...updates } }));
    get().recompute();
  },
  updateConeTube: (updates) => {
    set((state) => ({ coneTube: { ...state.coneTube, ...updates } }));
    get().recompute();
  },
  updateConeTransition: (updates) => {
    set((state) => ({ coneTransition: { ...state.coneTransition, ...updates } }));
    get().recompute();
  },
  updateFins: (updates) => {
    set((state) => ({ fins: { ...state.fins, ...updates } }));
    get().recompute();
  },
}), {
  name: 'rocket-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    propulsion: state.propulsion,
    recovery: state.recovery,
    nose: state.nose,
    coneTube: state.coneTube,
    coneTransition: state.coneTransition,
    fins: state.fins,
  }),
}));
