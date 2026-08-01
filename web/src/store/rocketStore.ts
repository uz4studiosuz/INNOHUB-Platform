import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  RocketDesign,
  RocketAnalysis,
  PropulsionParams,
  RecoveryParams,
  NoseParams,
  ConeTubeParams,
  ConeTransitionParams,
  FinsParams,
  computeRocketMetrics,
  DEFAULT_DESIGN,
  DEFAULT_FIN_POINTS,
  DEFAULT_FIN_POINTS_5,
  finGeometry,
  defaultControls,
} from "../lib/physics/rocketPhysics";
import { logIteration } from "./iterationStore";

export type RocketPanelType =
  | "propulsion" | "recovery" | "nose" | "conetube" | "conetransition" | "fins"
  | "designmodel" | "weight" | "thrust" | "drag" | "stability";

/** Which design fields each docking-station panel owns, for its RESET button. */
const PANEL_SECTION: Partial<Record<RocketPanelType, keyof RocketDesign>> = {
  propulsion: "propulsion",
  recovery: "recovery",
  nose: "nose",
  conetube: "coneTube",
  conetransition: "coneTransition",
  fins: "fins",
};

export interface Revision {
  id: number;
  /** Apogee in metres - what the performance chart plots. */
  performance: number;
  status: "IN_SPEC" | "OUT_OF_SPEC";
  isWorkingCopy: boolean;
  /** The whole design, so a revision can be loaded back. */
  design: RocketDesign;
  label: string;
}

interface RocketStoreState extends RocketDesign {
  // UI state
  activePanel: RocketPanelType;
  /** The docking station's DONE button collapses it; the sidebar reopens it. */
  dockOpen: boolean;
  visibility: Record<string, boolean>;
  /** Set briefly after an action so the UI can confirm it happened. */
  toast: string | null;

  analysis: RocketAnalysis;

  setActivePanel: (panel: RocketPanelType) => void;
  setDockOpen: (open: boolean) => void;
  toggleVisibility: (part: string) => void;
  setToast: (msg: string | null) => void;

  updatePropulsion: (updates: Partial<PropulsionParams>) => void;
  updateRecovery: (updates: Partial<RecoveryParams>) => void;
  updateNose: (updates: Partial<NoseParams>) => void;
  updateConeTube: (updates: Partial<ConeTubeParams>) => void;
  updateConeTransition: (updates: Partial<ConeTransitionParams>) => void;
  updateFins: (updates: Partial<FinsParams>) => void;
  /** Switch between the 4-point and 5-point outline templates. */
  setFinTemplate: (points: number) => void;
  /** Switch the fin edges between straight lines and curves. */
  setFinEdgeMode: (mode: "lines" | "curves") => void;

  /** Put one component back to the starting design. */
  resetPanel: (panel: RocketPanelType) => void;
  /** Put the whole rocket back to the starting design. */
  resetAll: () => void;

  revisions: Revision[];
  saveRevision: (isWorkingCopy: boolean) => void;
  loadRevision: (id: number) => void;
  deleteRevision: (id: number) => void;

  recompute: () => void;
}

/** Pull the six design sections out of the flat store. */
function designOf(s: RocketDesign): RocketDesign {
  return {
    propulsion: s.propulsion,
    recovery: s.recovery,
    nose: s.nose,
    coneTube: s.coneTube,
    coneTransition: s.coneTransition,
    fins: s.fins,
  };
}

export const useRocketStore = create<RocketStoreState>()(
  persist(
    (set, get) => {
      /**
       * Every design edit runs through here. Recomputing on the spot is what
       * keeps the panels, the 3D model and the reports from ever disagreeing.
       */
      const apply = (patch: Partial<RocketDesign>) => {
        set((s) => {
          const next = { ...designOf(s), ...patch };
          return { ...patch, analysis: computeRocketMetrics(next) } as Partial<RocketStoreState>;
        });
      };

      return {
        activePanel: "propulsion",
        dockOpen: true,
        toast: null,
        visibility: {
          propulsion: true,
          recovery: true,
          nose: true,
          conetube: true,
          conetransition: true,
          fins: true,
          designmodel: true,
        },

        ...structuredClone(DEFAULT_DESIGN),
        analysis: computeRocketMetrics(DEFAULT_DESIGN),
        revisions: [],

        setActivePanel: (panel) => set({ activePanel: panel, dockOpen: true }),
        setDockOpen: (open) => set({ dockOpen: open }),
        toggleVisibility: (part) =>
          set((s) => ({ visibility: { ...s.visibility, [part]: !(s.visibility[part] ?? true) } })),
        setToast: (msg) => set({ toast: msg }),

        recompute: () => set({ analysis: computeRocketMetrics(designOf(get())) }),

        updatePropulsion: (u) => apply({ propulsion: { ...get().propulsion, ...u } }),
        updateRecovery: (u) => apply({ recovery: { ...get().recovery, ...u } }),
        updateNose: (u) => apply({ nose: { ...get().nose, ...u } }),
        updateConeTube: (u) => apply({ coneTube: { ...get().coneTube, ...u } }),
        updateConeTransition: (u) => apply({ coneTransition: { ...get().coneTransition, ...u } }),
        updateFins: (u) => apply({ fins: { ...get().fins, ...u } }),

        setFinTemplate: (n) => {
          const template = n === 5 ? DEFAULT_FIN_POINTS_5 : DEFAULT_FIN_POINTS;
          const points = structuredClone(template);
          apply({
            fins: {
              ...get().fins,
              shapePoints: n === 5 ? 5 : 4,
              points,
              // A new corner count means new edges, so the old handles no longer
              // belong to anything - reset them onto the fresh edges.
              controls: defaultControls(points),
            },
          });
        },

        setFinEdgeMode: (mode) => {
          const f = get().fins;
          apply({
            fins: {
              ...f,
              edgeMode: mode,
              // Switching to curves starts from handles that sit on the edges, so
              // the shape does not jump the moment the mode changes.
              controls: mode === "curves" ? (f.controls ?? defaultControls(f.points)) : f.controls,
            },
          });
        },

        resetPanel: (panel) => {
          const key = PANEL_SECTION[panel];
          if (!key) return;
          apply({ [key]: structuredClone(DEFAULT_DESIGN[key]) } as Partial<RocketDesign>);
          set({ toast: "Standart qiymatlarga qaytarildi" });
        },

        resetAll: () => {
          apply(structuredClone(DEFAULT_DESIGN));
          set({ toast: "Butun dizayn standartga qaytarildi" });
        },

        saveRevision: (isWorkingCopy) => {
          const s = get();
          const rev: Revision = {
            id: (s.revisions.at(-1)?.id ?? 0) + 1,
            performance: Number(s.analysis.maxHeightM.toFixed(2)),
            status: s.analysis.specStatus,
            isWorkingCopy,
            design: structuredClone(designOf(s)),
            label: isWorkingCopy ? "Ish nusxasi" : "Musobaqaga",
          };
          // Feed the platform-wide iteration log the other modules already use,
          // so a teacher can see how a student's design converged over time.
          logIteration(
            "rockets",
            {
              bosim_psi: s.propulsion.pressurePsi,
              suv_l: s.propulsion.waterVolumeL,
              butilka: s.propulsion.bottleSize,
              loy_g: s.nose.clayMassG,
              nos_mm: s.nose.lengthMm,
              qanot_soni: s.fins.count,
              qanot_span_mm: Number(finGeometry(s.fins).spanMm.toFixed(1)),
              parashyut_mm: s.recovery.parachuteSizeMm,
              zapas_kalibr: Number(s.analysis.staticMarginCal.toFixed(2)),
              holat: s.analysis.specStatus,
            },
            { label: "Uchish vaqti", value: Number(s.analysis.totalFlightTimeS.toFixed(2)), unit: "s" }
          );
          set({
            revisions: [...s.revisions, rev],
            toast: isWorkingCopy
              ? `Ish nusxasi #${rev.id} saqlandi`
              : `#${rev.id} musobaqaga kiritildi (${rev.performance} m)`,
          });
        },

        loadRevision: (id) => {
          const rev = get().revisions.find((r) => r.id === id);
          if (!rev) return;
          apply(structuredClone(rev.design));
          set({ toast: `#${id} yuklandi` });
        },

        deleteRevision: (id) =>
          set((s) => ({ revisions: s.revisions.filter((r) => r.id !== id), toast: `#${id} o'chirildi` })),
      };
    },
    {
      name: "rocket-storage",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        propulsion: state.propulsion,
        recovery: state.recovery,
        nose: state.nose,
        coneTube: state.coneTube,
        coneTransition: state.coneTransition,
        fins: state.fins,
        revisions: state.revisions,
        visibility: state.visibility,
      }),
      /**
       * Backstop for the whole scheme: every design section is merged field by
       * field onto the current defaults, so a saved design can never reach the
       * app with a field missing - whatever the stored version number claims.
       *
       * This exists because version bookkeeping is easy to get wrong: bump the
       * version in one edit and write the migration in the next, and any browser
       * that rehydrated in between is left stamped with the new version but
       * holding the old shape, and its migration never runs again. That produced
       * a design with no fin outline at all, which took the page down.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RocketStoreState>;
        const section = <K extends keyof RocketDesign>(key: K): RocketDesign[K] => ({
          ...DEFAULT_DESIGN[key],
          ...((p[key] ?? {}) as object),
        }) as RocketDesign[K];
        return {
          ...current,
          ...p,
          propulsion: section("propulsion"),
          recovery: section("recovery"),
          nose: section("nose"),
          coneTube: section("coneTube"),
          coneTransition: section("coneTransition"),
          fins: section("fins"),
        };
      },
      /**
       * v1 predates nose length and fin thickness; v2 predates the payload
       * tube's material (which is what now sets its diameter); v3 held the fin
       * as span/root/tip/sweep numbers instead of an outline.
       */
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        let out = p;
        if (version < 2) {
          out = {
            ...out,
            nose: { ...DEFAULT_DESIGN.nose, ...(p.nose as object ?? {}) },
            fins: { ...DEFAULT_DESIGN.fins, ...(p.fins as object ?? {}) },
          };
        }
        if (version < 3) {
          out = { ...out, coneTube: { ...DEFAULT_DESIGN.coneTube, ...(out.coneTube as object ?? {}) } };
        }
        if (version < 5) {
          // v4 had no edge mode; a saved fin is a straight-edged one.
          const f = (out.fins ?? {}) as Record<string, unknown>;
          out = { ...out, fins: { ...f, edgeMode: f.edgeMode ?? "lines" } };
        }
        if (version < 4) {
          // v3 held the fin as span/root/tip/sweep numbers. Rebuild the same
          // shape as an outline so the student's fin survives the change.
          const old = (out.fins ?? {}) as Record<string, number | string>;
          const span = Number(old.spanMm) || 60;
          const root = Number(old.rootChordMm) || 80;
          const tip = Number(old.tipChordMm) || 40;
          const sweep = Number(old.sweepMm) || 25;
          const rootLE = 60 + root; // keep the old tail offset clear of the launcher
          out = {
            ...out,
            fins: {
              ...DEFAULT_DESIGN.fins,
              count: Number(old.count) || DEFAULT_DESIGN.fins.count,
              points: [
                { x: 0, y: rootLE },
                { x: 0, y: rootLE - root },
                { x: span, y: rootLE - sweep - tip },
                { x: span, y: rootLE - sweep },
              ],
            },
          };
        }
        return out;
      },
      /**
       * The analysis is derived, so it is deliberately not persisted - which
       * means it has to be rebuilt the moment the saved design comes back.
       * Without this the panels showed the restored design's inputs next to the
       * previous session's numbers.
       */
      onRehydrateStorage: () => (state) => {
        state?.recompute();
      },
    }
  )
);
