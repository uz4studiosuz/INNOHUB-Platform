// Where a part's pins actually are on the canvas, and what that implies.
//
// Two things depend on this and used to disagree about it: the canvas, which has
// to drop a part onto the breadboard grid, and the engine, which has to know
// that a leg sitting in a hole is wired to it. Both now read the same geometry
// from here, so what you see plugged in is what the simulation sees.

import { PlacedComponent, Terminal, ComponentType } from "./types";
import { COMPONENT_LIBRARY } from "./componentLibrary";
import { PITCH } from "./units";

/**
 * How close a lead has to sit to a tie point to count as pushed into it. Half a
 * pitch would make neighbouring holes ambiguous, so this stays well under it —
 * it only has to absorb the rounding in the stored integer positions and the
 * odd part whose lead span is not a whole number of pitches (a resistor's is
 * 4.09, so its far leg lands ~1px off the hole its near leg picked).
 */
export const CONTACT_R = 5;

/** How far a part may be nudged when it is dropped, so it never teleports. */
const SNAP_RANGE = PITCH * 0.8;

/** A terminal resolved to canvas coordinates. */
export interface WorldTerminal {
  compId: string;
  term: Terminal;
  x: number;
  y: number;
}

export function terminalWorldPos(comp: PlacedComponent, term: Terminal) {
  const def = COMPONENT_LIBRARY[comp.type];
  const cx = comp.x + def.width / 2;
  const cy = comp.y + def.height / 2;
  const dx = term.x - def.width / 2;
  const dy = term.y - def.height / 2;
  const th = (comp.rotation * Math.PI) / 180;
  return {
    x: cx + dx * Math.cos(th) - dy * Math.sin(th),
    y: cy + dx * Math.sin(th) + dy * Math.cos(th),
  };
}

export function worldTerminals(components: PlacedComponent[]): WorldTerminal[] {
  const out: WorldTerminal[] = [];
  for (const c of components) {
    const def = COMPONENT_LIBRARY[c.type];
    if (!def) continue;
    for (const term of def.terminals) {
      const p = terminalWorldPos(c, term);
      out.push({ compId: c.id, term, x: p.x, y: p.y });
    }
  }
  return out;
}

/**
 * Parts whose terminals are receptacles rather than leads: breadboard tie
 * points and the header sockets along the edge of a board. Pushing a leg into
 * one of these is what wires a circuit up without drawing a single wire, so
 * these holes are both what a dragged part snaps onto and what its legs can
 * make contact with. Two of them never connect to each other — laying a board
 * across a breadboard is overlap, not a connection.
 */
export function acceptsLeads(type: ComponentType): boolean {
  const cat = COMPONENT_LIBRARY[type]?.category;
  return cat === "breadboards" || cat === "boards";
}

/**
 * Bucketed lookup over tie points. A full breadboard is 420 holes and this is
 * queried once per leg on every simulation frame, so scanning the whole set
 * each time is the one thing to avoid.
 */
class HoleGrid {
  private cells = new Map<string, WorldTerminal[]>();

  constructor(items: WorldTerminal[]) {
    for (const it of items) {
      const k = HoleGrid.key(it.x, it.y);
      const cell = this.cells.get(k);
      if (cell) cell.push(it);
      else this.cells.set(k, [it]);
    }
  }

  private static key(x: number, y: number) {
    return `${Math.floor(x / PITCH)},${Math.floor(y / PITCH)}`;
  }

  /** Every hole within `r` of the point. `r` must stay below one pitch. */
  near(x: number, y: number, r: number): WorldTerminal[] {
    const cx = Math.floor(x / PITCH);
    const cy = Math.floor(y / PITCH);
    const out: WorldTerminal[] = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const it of this.cells.get(`${cx + i},${cy + j}`) ?? []) {
          if (Math.hypot(it.x - x, it.y - y) <= r) out.push(it);
        }
      }
    }
    return out;
  }

  nearest(x: number, y: number, r: number): WorldTerminal | null {
    let best: WorldTerminal | null = null;
    let bd = r;
    for (const it of this.near(x, y, r)) {
      const d = Math.hypot(it.x - x, it.y - y);
      if (d <= bd) { bd = d; best = it; }
    }
    return best;
  }
}

export interface SnapResult {
  x: number;
  y: number;
  /** The holes the part's legs will land in — what the canvas highlights. */
  holes: { x: number; y: number }[];
}

/**
 * The position `comp` should take if it were dropped at (x, y): the nearby
 * alignment that gets the most of its legs into holes at once.
 *
 * Snapping one leg and letting the rest fall where they may is what made
 * placement feel broken — a 4-pin RGB LED would sit with one leg in a hole and
 * three between rows. So every (leg -> nearby hole) pairing is treated as a
 * candidate shift for the whole part, and the candidate that seats the most
 * legs wins; ties go to the one that moves the part least.
 */
export function snapPosition(
  components: PlacedComponent[],
  comp: PlacedComponent,
  x: number,
  y: number,
): SnapResult {
  const def = COMPONENT_LIBRARY[comp.type];
  // Boards and breadboards are the things being plugged into, so they stay
  // wherever they are put.
  if (!def || !def.terminals.length || acceptsLeads(comp.type)) return { x, y, holes: [] };

  const grid = new HoleGrid(
    worldTerminals(components.filter((c) => c.id !== comp.id && acceptsLeads(c.type)))
  );
  const legs = def.terminals.map((t) => terminalWorldPos({ ...comp, x, y }, t));

  let best: { dx: number; dy: number; hits: number; score: number; holes: SnapResult["holes"] } | null = null;
  for (const leg of legs) {
    for (const hole of grid.near(leg.x, leg.y, SNAP_RANGE)) {
      const dx = hole.x - leg.x;
      const dy = hole.y - leg.y;
      let hits = 0;
      let err = 0;
      const holes: SnapResult["holes"] = [];
      for (const other of legs) {
        const h = grid.nearest(other.x + dx, other.y + dy, CONTACT_R);
        if (!h) continue;
        hits++;
        err += Math.hypot(h.x - other.x - dx, h.y - other.y - dy);
        holes.push({ x: h.x, y: h.y });
      }
      // Among equally good seatings, prefer the smaller nudge.
      const score = err + Math.hypot(dx, dy) * 0.05;
      if (!best || hits > best.hits || (hits === best.hits && score < best.score)) {
        best = { dx, dy, hits, score, holes };
      }
    }
  }

  if (!best) return { x, y, holes: [] };
  return { x: x + best.dx, y: y + best.dy, holes: best.holes };
}

/** A leg resting in a tie point: `lead` is the part's pin, `hole` the socket. */
export interface Contact {
  lead: WorldTerminal;
  hole: WorldTerminal;
}

/**
 * Every leg currently sitting in a hole. This is the whole point of a
 * breadboard, and it is derived from position alone — nothing is stored when a
 * part is placed, so moving a part off the board disconnects it, exactly the
 * way it does in real life.
 */
export function findContacts(components: PlacedComponent[]): Contact[] {
  const sockets: PlacedComponent[] = [];
  const leads: PlacedComponent[] = [];
  for (const c of components) (acceptsLeads(c.type) ? sockets : leads).push(c);
  if (!sockets.length || !leads.length) return [];

  const grid = new HoleGrid(worldTerminals(sockets));
  const out: Contact[] = [];
  for (const c of leads) {
    const def = COMPONENT_LIBRARY[c.type];
    if (!def) continue;
    for (const term of def.terminals) {
      const p = terminalWorldPos(c, term);
      const hole = grid.nearest(p.x, p.y, CONTACT_R);
      if (hole) out.push({ lead: { compId: c.id, term, x: p.x, y: p.y }, hole });
    }
  }
  return out;
}
