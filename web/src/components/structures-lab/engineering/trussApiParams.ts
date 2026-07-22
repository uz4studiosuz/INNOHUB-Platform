import { TrussNode, TrussMemberDraft } from "./types";

export const GRID_SIZE = 30;
export const UNIT_METERS = 0.5; // meters per grid cell

export interface TrussApiParams {
  nodes: number[][];
  members: number[][];
  supports: Record<number, string>;
  loads: Record<number, [number, number]>;
}

/** Converts the canvas-space design (px, grid-snapped) into the meters-based
 * payload expected by the Python engine's `truss` / `truss_loadtest` modules.
 * Shared by TrussBuilder (Engineering) and the Competition load test so both
 * always agree on the same unit conversion.
 */
export function buildTrussApiParams(nodes: TrussNode[], members: TrussMemberDraft[]): TrussApiParams {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));

  const nodesParam = nodes.map((n) => [(n.x / GRID_SIZE) * UNIT_METERS, (-n.y / GRID_SIZE) * UNIT_METERS]);
  const membersParam = members.map((m) => [
    idx.get(m.nodeA) ?? 0,
    idx.get(m.nodeB) ?? 0,
    m.areaM2,
    m.E,
    m.yieldStrengthPa,
    m.densityKgM3,
  ]);

  const supportsParam: Record<number, string> = {};
  const loadsParam: Record<number, [number, number]> = {};
  nodes.forEach((n, i) => {
    if (n.support !== "none") supportsParam[i] = n.support;
    if (n.loadFx !== 0 || n.loadFy !== 0) loadsParam[i] = [n.loadFx, n.loadFy];
  });

  return { nodes: nodesParam, members: membersParam, supports: supportsParam, loads: loadsParam };
}
