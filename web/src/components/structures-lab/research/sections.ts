export type SectionGroupId = "design-process" | "background" | "knowledge";

export interface ResearchSectionMeta {
  id: string;
  title: string;
  isWorksheet: boolean;
}

export interface ResearchGroup {
  id: SectionGroupId;
  label: string;
  items: ResearchSectionMeta[];
}

export const RESEARCH_GROUPS: ResearchGroup[] = [
  {
    id: "design-process",
    label: "Engineering Design Process",
    items: [
      { id: "design-process", title: "The Engineering Design Process", isWorksheet: false },
      { id: "design-challenge", title: "Design Challenge", isWorksheet: false },
    ],
  },
  {
    id: "background",
    label: "Background",
    items: [
      { id: "background", title: "Background", isWorksheet: false },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge At Work",
    items: [
      { id: "truss-systems", title: "Truss Systems", isWorksheet: false },
      { id: "worksheet-truss-stability", title: "Worksheet: Truss Stability", isWorksheet: true },
      { id: "forces-on-truss", title: "Forces on a Truss", isWorksheet: false },
      { id: "worksheet-linear-forces", title: "Worksheet: Linear Forces", isWorksheet: true },
      { id: "external-forces", title: "External Forces", isWorksheet: false },
      { id: "worksheet-external-forces", title: "Worksheet: External Forces", isWorksheet: true },
      { id: "internal-forces", title: "Internal Forces", isWorksheet: false },
      { id: "stress-yield", title: "Stress and Yield Strength", isWorksheet: false },
    ],
  },
];

export const RESEARCH_SECTIONS_FLAT: ResearchSectionMeta[] = RESEARCH_GROUPS.flatMap((g) => g.items);

export const DEFAULT_SECTION_ID = "truss-systems";

export function sectionIndex(id: string): number {
  return RESEARCH_SECTIONS_FLAT.findIndex((s) => s.id === id);
}
