import { TrussNode, TrussMemberDraft } from "./types";

export function nextId(items: { id: string }[], prefix: string): string {
  let max = 0;
  for (const { id } of items) {
    if (id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/** Mirrors the current design across a vertical axis at its own rightmost
 * node, appending the mirrored copy as the second half of the span - build
 * one side, then complete a symmetric truss automatically. Nodes that sit
 * exactly on the mirror axis are shared seam joints, not duplicated.
 */
export function mirrorTrussHorizontally(
  nodes: TrussNode[],
  members: TrussMemberDraft[]
): { nodes: TrussNode[]; members: TrussMemberDraft[] } {
  if (nodes.length === 0) return { nodes, members };

  const axisX = Math.max(...nodes.map((n) => n.x));
  const idMap = new Map<string, string>();
  const newNodes: TrussNode[] = [];

  for (const n of nodes) {
    const mirroredX = 2 * axisX - n.x;
    if (Math.abs(mirroredX - n.x) < 1e-6) {
      idMap.set(n.id, n.id);
    } else {
      const newId = nextId([...nodes, ...newNodes], "n");
      idMap.set(n.id, newId);
      newNodes.push({ ...n, id: newId, x: mirroredX });
    }
  }

  const newMembers: TrussMemberDraft[] = [];
  for (const m of members) {
    const mirroredA = idMap.get(m.nodeA)!;
    const mirroredB = idMap.get(m.nodeB)!;
    if (mirroredA === m.nodeA && mirroredB === m.nodeB) continue; // lies entirely on the axis - already exists
    const newId = nextId([...members, ...newMembers], "m");
    newMembers.push({ ...m, id: newId, nodeA: mirroredA, nodeB: mirroredB });
  }

  return { nodes: [...nodes, ...newNodes], members: [...members, ...newMembers] };
}
