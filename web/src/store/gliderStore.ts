import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  FuselageParams, 
  WingParams, 
  HStabParams, 
  VStabParams, 
  ComputedMetrics,
  computeAllMetrics
} from '../lib/physics/gliderPhysics';

export interface GliderDesign {
  designId: string;
  name: string;
  fuselage: FuselageParams;
  wing: WingParams;
  horizontalStabilizer: HStabParams;
  verticalStabilizer: VStabParams;
  
  // UI State
  activePanel: string | null;
  visibility: Record<string, boolean>;
  
  // Actions
  updateFuselage: (updates: Partial<FuselageParams>) => void;
  updateWing: (updates: Partial<WingParams>) => void;
  updateHStab: (updates: Partial<HStabParams>) => void;
  updateVStab: (updates: Partial<VStabParams>) => void;
  
  setActivePanel: (panelId: string | null) => void;
  toggleVisibility: (id: string) => void;
  
  // Computed property accessor
  getComputedMetrics: () => ComputedMetrics;
}

export const useGliderStore = create<GliderDesign>()(
  persist(
    (set, get) => ({
      designId: "default-design",
      name: "Glider Alpha",
  
  fuselage: {
    noseHeight: 13.0,
    bodyHeight: 13.0,
    rearHeight: 13.0,
    length: 302.0,
  },
  
  wing: {
    leadingEdgeXOffset: 60,
    span: 300.0,
    chord: 63.0,
    dihedralType: "tipDihedral",
    dihedral: 5,
    tipDihedral: 15,
    shape: "tapered",
    sandingLevel: "light",
  },
  
  horizontalStabilizer: {
    span: 100.0,
    chord: 40.0,
  },
  
  verticalStabilizer: {
    height: 30.0,
    chord: 40.0,
  },
  
  activePanel: null,
  visibility: {
    "fuselage": true,
    "wing": true,
    "h-stab": true,
    "v-stab": true,
    "design-model": true,
  },

  updateFuselage: (updates) => set((state) => ({ 
    fuselage: { ...state.fuselage, ...updates } 
  })),
  
  updateWing: (updates) => set((state) => ({ 
    wing: { ...state.wing, ...updates } 
  })),
  
  updateHStab: (updates) => set((state) => ({ 
    horizontalStabilizer: { ...state.horizontalStabilizer, ...updates } 
  })),
  
  updateVStab: (updates) => set((state) => ({ 
    verticalStabilizer: { ...state.verticalStabilizer, ...updates } 
  })),
  
  setActivePanel: (panelId) => set({ activePanel: panelId }),
  
  toggleVisibility: (id) => set((state) => ({
    visibility: { ...state.visibility, [id]: !state.visibility[id] }
  })),

    // Computes metrics on-demand using current state
    getComputedMetrics: () => {
      const state = get();
      return computeAllMetrics(
        state.fuselage,
        state.wing,
        state.horizontalStabilizer,
        state.verticalStabilizer
      );
    }
  }),
  {
    name: 'glider-storage', // unique name for localStorage key
    storage: createJSONStorage(() => localStorage),
    // Skip saving UI state and computed properties
    partialize: (state) => ({
      designId: state.designId,
      name: state.name,
      fuselage: state.fuselage,
      wing: state.wing,
      horizontalStabilizer: state.horizontalStabilizer,
      verticalStabilizer: state.verticalStabilizer,
    }),
  }
));
