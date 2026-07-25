import { ComponentDef, Terminal } from "./types";
import { svgScale } from "./units";

// Half-breadboard geometry, read straight out of the Fritzing artwork we serve
// from public/electronics/breadboard.svg (viewBox 245.037 x 151.2, 72 units
// per inch). Every x/y below is one of that file's own `<g id="A1pin">` hole
// centres, so a tie-point lands exactly on a printed hole instead of near it.

const UNITS_PER_INCH = 72;
const VIEW_W = 245.037;
const VIEW_H = 151.2;

/** Hole-centre x of the 32 main columns, left to right. */
const COL_X = [
  10.92, 18.119, 25.32, 32.52, 39.72, 46.919, 54.119, 61.32,
  68.52, 75.719, 82.919, 90.119, 97.319, 104.519, 111.719, 118.919,
  126.118, 133.319, 140.519, 147.719, 154.918, 162.118, 169.319, 176.518,
  183.718, 190.918, 198.118, 205.318, 212.518, 219.718, 226.918, 234.117,
];

/** Fritzing's own column names. 98/99 are the two unlabelled left-edge columns. */
const COL_NUM = [98, 99, ...Array.from({ length: 30 }, (_, i) => i + 1)];

/** Rails skip every sixth column, which is what makes the printed groups of five. */
const RAIL_NUM = Array.from({ length: 29 }, (_, i) => i + 1).filter((n) => n % 6 !== 0);
const railX = (n: number) => COL_X[n + 1];

/** Main rows A..J; A-E sit above the centre channel, F-J below it. */
const ROWS = "ABCDEFGHIJ";
const ROW_Y = [36, 43.2, 50.4, 57.6, 64.8, 86.4, 93.6, 100.8, 108, 115.2];

/** The four power rails, top to bottom: + - above the board, - + below it. */
const RAILS = [
  { row: "W", y: 7.201, sign: "+", markY: 3.2, color: "#d1341f" },
  { row: "X", y: 14.4, sign: "–", markY: 18.4, color: "#1c58c9" },
  { row: "Y", y: 136.799, sign: "–", markY: 132.7, color: "#1c58c9" },
  { row: "Z", y: 144, sign: "+", markY: 147.9, color: "#d1341f" },
];

const s = svgScale(UNITS_PER_INCH);

/**
 * What the renderer needs to lay the +/- rail stripes over the artwork: the
 * Fritzing half-breadboard is printed bare, without the coloured power-rail
 * lines a real board (and Tinkercad) shows, so we draw those on top.
 */
export const BB = {
  width: s(VIEW_W),
  height: s(VIEW_H),
  railMarks: RAILS.map((r) => ({ y: s(r.markY), sign: r.sign, color: r.color })),
  railFromX: s(railX(RAIL_NUM[0]) - 6),
  railToX: s(railX(RAIL_NUM[RAIL_NUM.length - 1]) + 6),
};

export function buildBreadboardDef(): ComponentDef {
  const terminals: Terminal[] = [];
  const internalGroups: string[][] = [];

  // Each rail is a single net running the whole length of the board.
  for (const rail of RAILS) {
    internalGroups.push(RAIL_NUM.map((n) => {
      const id = `${rail.row}${n}`;
      terminals.push({ id, label: `${rail.sign} ${n}`, x: s(railX(n)), y: s(rail.y) });
      return id;
    }));
  }

  // Each column is two nets: rows A-E on one side of the channel, F-J on the other.
  for (const half of [ROWS.slice(0, 5), ROWS.slice(5)]) {
    COL_NUM.forEach((n, col) => {
      internalGroups.push([...half].map((row) => {
        const id = `${row}${n}`;
        terminals.push({ id, label: id, x: s(COL_X[col]), y: s(ROW_Y[ROWS.indexOf(row)]) });
        return id;
      }));
    });
  }

  return {
    type: "breadboard",
    name: "Breadboard",
    category: "breadboards",
    width: BB.width,
    height: BB.height,
    terminals,
    internalGroups,
    icon: "▦",
  };
}

export const BREADBOARD_DEF = buildBreadboardDef();
