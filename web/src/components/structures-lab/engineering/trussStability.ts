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

/**
 * Tahlilni **to'sadigan** xato (faqat mexanizm).
 *
 * Avval statik aniqlanmagan konstruksiya ham to'silardi, chunki yechuvchi
 * faqat tugunlar usulini bilardi. Endi u qattiqlik usuli (matritsali FEA)
 * bilan ishlaydi va ortiqcha a'zo umuman muammo emas — real ko'priklarning
 * ko'pchiligi aynan shunday. Mexanizm esa haqiqatan yechimsiz: muvozanat
 * holati mavjud emas, konstruksiya shunchaki qulaydi.
 */
export function stabilityErrorMessage(stability: StabilityResult): string | null {
  if (stability.status === "unstable") {
    const missing = stability.twoJ - stability.mPlusR;
    return `Konstruksiya beqaror (mexanizm): m + r = ${stability.mPlusR}, kerak 2j = ${stability.twoJ} — yana ${missing} ta a'zo yoki tayanch qo'shing.`;
  }
  return null;
}

/**
 * To'smaydigan, lekin aytilishi kerak bo'lgan holat.
 *
 * Statik aniqlanmagan konstruksiya yechiladi, ammo kuchlar taqsimoti endi
 * a'zolarning bikrligiga ham bog'liq — bu muhandislik jihatidan o'quvchi
 * bilishi kerak bo'lgan farq, shuning uchun jim o'tib ketmaydi.
 */
export function stabilityWarningMessage(stability: StabilityResult): string | null {
  if (stability.status === "indeterminate") {
    const extra = stability.mPlusR - stability.twoJ;
    return `Statik aniqlanmagan konstruksiya: ${extra} ta ortiqcha a'zo/tayanch (m + r = ${stability.mPlusR}, 2j = ${stability.twoJ}). Tahlil qattiqlik usuli bilan bajariladi — kuchlar taqsimoti a'zolar bikrligiga ham bog'liq bo'ladi.`;
  }
  return null;
}
