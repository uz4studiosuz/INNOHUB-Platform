import { TrussNode, TrussMemberDraft } from "./types";

export interface ExampleTruss {
  name: string;
  nodes: TrussNode[];
  members: TrussMemberDraft[];
}

/** A 4m, 5-joint, 7-member Warren truss (aluminum 6061, 20mm square section)
 * spanning a pin + roller_h support pair, with a 1000N deck load at
 * mid-span - a ready-made, verified-solvable example to load, analyze, and
 * then drive the Competition truck across.
 */
export function buildExampleWarrenTruss(): ExampleTruss {
  const E = 68.9e9;
  const yieldStrengthPa = 276e6;
  const densityKgM3 = 2700;
  const areaM2 = 0.0002; // ~14mm square section - sturdy enough for a 4m/1000N demo span
  const materialLabel = "Alyuminiy 6061 (20mm kesim)";

  const nodes: TrussNode[] = [
    { id: "n1", x: 0, y: 300, support: "pin", loadFx: 0, loadFy: 0 },
    { id: "n2", x: 120, y: 300, support: "none", loadFx: 0, loadFy: -1000 },
    { id: "n3", x: 240, y: 300, support: "roller_h", loadFx: 0, loadFy: 0 },
    { id: "n4", x: 60, y: 240, support: "none", loadFx: 0, loadFy: 0 },
    { id: "n5", x: 180, y: 240, support: "none", loadFx: 0, loadFy: 0 },
  ];

  const pairs: [string, string][] = [
    ["n1", "n2"],
    ["n2", "n3"],
    ["n4", "n5"],
    ["n1", "n4"],
    ["n4", "n2"],
    ["n2", "n5"],
    ["n5", "n3"],
  ];

  const members: TrussMemberDraft[] = pairs.map(([nodeA, nodeB], i) => ({
    id: `m${i + 1}`,
    nodeA,
    nodeB,
    areaM2,
    yieldStrengthPa,
    E,
    densityKgM3,
    materialLabel,
  }));

  return { name: "Namuna: Warren fermasi (4m, Alyuminiy)", nodes, members };
}
