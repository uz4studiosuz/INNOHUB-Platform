import { TrussNode, TrussMemberDraft } from "../components/structures-lab/engineering/types";

export interface TrussDesign {
  name: string;
  nodes: TrussNode[];
  members: TrussMemberDraft[];
}

const STORAGE_KEY = "innohub_truss_design";

export function saveTrussDesign(design: TrussDesign): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
}

export function loadTrussDesign(): TrussDesign | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrussDesign) : null;
  } catch {
    return null;
  }
}
