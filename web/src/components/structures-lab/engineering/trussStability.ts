import { TrussNode, TrussMemberDraft } from "./types";

export type StabilityStatus = "unstable" | "determinate" | "indeterminate";

export interface StabilityResult {
  joints: number;
  members: number;
  reactions: number;
  twoJ: number;
  mPlusR: number;
  status: StabilityStatus;
}

/** Static determinacy check: m + r vs 2j (Hibbeler, Statics). Mirrors
 * engine/structures/truss_analysis.py's Truss.stability_check() so the UI
 * can show an instant readout (and block "Tahlil qilish") without a
 * backend round-trip for what's just integer counting.
 */
export function computeStability(nodes: TrussNode[], members: TrussMemberDraft[]): StabilityResult {
  const joints = nodes.length;
  const memberCount = members.length;
  const reactions = nodes.reduce((sum, n) => {
    if (n.support === "pin") return sum + 2;
    if (n.support === "roller_h" || n.support === "roller_v") return sum + 1;
    return sum;
  }, 0);
  const twoJ = 2 * joints;
  const mPlusR = memberCount + reactions;

  let status: StabilityStatus;
  if (mPlusR < twoJ) status = "unstable";
  else if (mPlusR === twoJ) status = "determinate";
  else status = "indeterminate";

  return { joints, members: memberCount, reactions, twoJ, mPlusR, status };
}

export function stabilityErrorMessage(stability: StabilityResult): string | null {
  if (stability.status === "unstable") {
    const missing = stability.twoJ - stability.mPlusR;
    return `Konstruksiya beqaror (mexanizm): m + r = ${stability.mPlusR}, kerak 2j = ${stability.twoJ} — yana ${missing} ta a'zo yoki tayanch qo'shing.`;
  }
  if (stability.status === "indeterminate") {
    const extra = stability.mPlusR - stability.twoJ;
    return `Konstruksiya statik aniqlanmagan: m + r = ${stability.mPlusR}, lekin 2j = ${stability.twoJ} kerak — ${extra} ta ortiqcha a'zo yoki tayanchni olib tashlang.`;
  }
  return null;
}
