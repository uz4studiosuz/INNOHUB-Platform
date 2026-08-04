import { TrussNode, TrussMemberDraft } from "./types";

/**
 * Ko'prik qulashi — a'zo singandan keyin nima bo'lishini hisoblaydi.
 *
 * Nega alohida simulyatsiya kerak: statik tahlil (qattiqlik usuli) faqat
 * "qachon sinadi" degan savolga javob beradi. Sinishdan keyingi harakat
 * statik emas — bu dinamika, konstruksiya endi mexanizmga aylangan va
 * gravitatsiya ostida tushadi. Shuning uchun bu yerda oddiy zarrachalar
 * dinamikasi ishlatiladi (Verlet integratsiyasi + masofa cheklovlari),
 * ya'ni har tugun massa, har butun a'zo esa qattiq bog'lanish.
 *
 * Bu usul (Position Based Dynamics) o'quv maqsadi uchun aynan mos: a'zolar
 * cho'zilmaydi, singanlari esa umuman ushlab turmaydi — natijada ko'prik
 * ishonchli tarzda "buklanadi", real ko'prik qulashidagidek.
 */

export interface CollapseNode {
  id: string;
  x: number;
  y: number;
  /** Oldingi qadamdagi joylashuv — Verlet tezlikni shundan oladi. */
  px: number;
  py: number;
  /** Tayanch tugunlar qimirlamaydi. */
  pinned: boolean;
}

export interface CollapseLink {
  a: number;
  b: number;
  restLength: number;
  /** Singan a'zo hech narsani ushlab turmaydi — u faqat ko'rinish uchun
   * qoladi (uchlari ajralib, osilib turadi). */
  broken: boolean;
}

export interface CollapseState {
  nodes: CollapseNode[];
  links: CollapseLink[];
  /** Boshlangandan beri o'tgan vaqt (sekund). */
  elapsed: number;
  settled: boolean;
}

/** Gravitatsiya, canvas birligida (y pastga qarab o'sadi). */
const GRAVITY = 900;
/** Har kadrda tezlikning saqlanadigan ulushi — havo qarshiligi va ichki
 * ishqalanish o'rniga. 1.0 bo'lsa konstruksiya cheksiz tebranadi. */
const DAMPING = 0.985;
/** Cheklovlarni necha marta qayta qo'llash. Ko'proq takror = qattiqroq
 * a'zolar; 6 marta o'quv modeli uchun yetarli va tez. */
const ITERATIONS = 6;

/**
 * Qulash simulyatsiyasini boshlaydi.
 *
 * @param brokenMemberIds Singan a'zolar — ular endi hech narsani ushlamaydi.
 * @param groundY Yer sathi (canvas y). Tugunlar undan pastga tushmaydi.
 */
export function createCollapse(
  nodes: TrussNode[],
  members: TrussMemberDraft[],
  brokenMemberIds: Set<string>
): CollapseState {
  const index = new Map(nodes.map((n, i) => [n.id, i]));

  const collapseNodes: CollapseNode[] = nodes.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    px: n.x,
    py: n.y,
    pinned: n.support !== "none",
  }));

  const links: CollapseLink[] = [];
  for (const m of members) {
    const a = index.get(m.nodeA);
    const b = index.get(m.nodeB);
    if (a === undefined || b === undefined) continue;
    const dx = nodes[b].x - nodes[a].x;
    const dy = nodes[b].y - nodes[a].y;
    links.push({
      a,
      b,
      restLength: Math.hypot(dx, dy),
      broken: brokenMemberIds.has(m.id),
    });
  }

  return { nodes: collapseNodes, links, elapsed: 0, settled: false };
}

/**
 * Bir qadam oldinga. `dt` sekundlarda (0.016 ga yaqin).
 *
 * @param groundY Yer sathi — undan pastga tugun o'tmaydi.
 */
export function stepCollapse(state: CollapseState, dt: number, groundY: number): CollapseState {
  const clamped = Math.min(dt, 1 / 30);
  state.elapsed += clamped;

  // 1. Verlet integratsiyasi: yangi joylashuv = joriy + (joriy - oldingi) * damping + a*dt^2
  let maxMovement = 0;
  for (const n of state.nodes) {
    if (n.pinned) continue;
    const vx = (n.x - n.px) * DAMPING;
    const vy = (n.y - n.py) * DAMPING;
    n.px = n.x;
    n.py = n.y;
    n.x += vx;
    n.y += vy + GRAVITY * clamped * clamped;
    maxMovement = Math.max(maxMovement, Math.abs(vx) + Math.abs(vy));
  }

  // 2. A'zo cheklovlari: butun a'zolar o'z uzunligini saqlaydi.
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const link of state.links) {
      if (link.broken) continue;
      const a = state.nodes[link.a];
      const b = state.nodes[link.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      // Cheklovni buzilish ulushi bo'yicha ikkala uchga taqsimlaymiz.
      const diff = (dist - link.restLength) / dist;
      const wa = a.pinned ? 0 : b.pinned ? 1 : 0.5;
      const wb = b.pinned ? 0 : a.pinned ? 1 : 0.5;
      a.x += dx * diff * wa;
      a.y += dy * diff * wa;
      b.x -= dx * diff * wb;
      b.y -= dy * diff * wb;
    }

    // 3. Yer: tugun yer sathidan pastga tushmaydi va u yerda ishqalanadi.
    for (const n of state.nodes) {
      if (n.pinned) continue;
      if (n.y > groundY) {
        n.y = groundY;
        n.px += (n.x - n.px) * 0.5; // gorizontal ishqalanish
      }
    }
  }

  // Harakat deyarli to'xtaganda simulyatsiyani to'xtatamiz — cheksiz
  // aylanishning ma'nosi yo'q va u kadr tezligini bekorga yeydi.
  if (state.elapsed > 0.6 && maxMovement < 0.05) state.settled = true;
  return state;
}

/** Qulagan holatdagi tugun joylashuvlarini id bo'yicha qaytaradi. */
export function collapsePositions(state: CollapseState): Map<string, { x: number; y: number }> {
  return new Map(state.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
}
