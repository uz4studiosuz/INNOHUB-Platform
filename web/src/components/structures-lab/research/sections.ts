import type { ResearchKey } from "./i18n";

export type SectionGroupId = "design-process" | "background" | "knowledge";

export interface ResearchSectionMeta {
  id: string;
  /** Key into the research dictionary — resolved at render time, not here. */
  titleKey: ResearchKey;
  isWorksheet: boolean;
}

export interface ResearchGroup {
  id: SectionGroupId;
  labelKey: ResearchKey;
  items: ResearchSectionMeta[];
}

export const RESEARCH_GROUPS: ResearchGroup[] = [
  {
    id: "design-process",
    labelKey: "group.designProcess",
    items: [
      { id: "design-process", titleKey: "sec.designProcess", isWorksheet: false },
      { id: "design-challenge", titleKey: "sec.designChallenge", isWorksheet: false },
    ],
  },
  {
    id: "background",
    labelKey: "group.background",
    items: [{ id: "background", titleKey: "sec.background", isWorksheet: false }],
  },
  {
    id: "knowledge",
    labelKey: "group.knowledge",
    items: [
      { id: "truss-systems", titleKey: "sec.trussSystems", isWorksheet: false },
      { id: "worksheet-truss-stability", titleKey: "sec.wsTrussStability", isWorksheet: true },
      { id: "forces-on-truss", titleKey: "sec.forcesOnTruss", isWorksheet: false },
      { id: "worksheet-linear-forces", titleKey: "sec.wsLinearForces", isWorksheet: true },
      { id: "external-forces", titleKey: "sec.externalForces", isWorksheet: false },
      { id: "worksheet-external-forces", titleKey: "sec.wsExternalForces", isWorksheet: true },
      { id: "internal-forces", titleKey: "sec.internalForces", isWorksheet: false },
      { id: "stress-yield", titleKey: "sec.stressYield", isWorksheet: false },
    ],
  },
];

export const RESEARCH_SECTIONS_FLAT: ResearchSectionMeta[] = RESEARCH_GROUPS.flatMap((g) => g.items);

export const DEFAULT_SECTION_ID = "truss-systems";

export function sectionIndex(id: string): number {
  return RESEARCH_SECTIONS_FLAT.findIndex((s) => s.id === id);
}
