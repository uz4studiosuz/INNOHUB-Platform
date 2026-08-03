"use client";

import React from "react";
import { useRocketStore } from "../../store/rocketStore";
import { FinPoint, TUBE_STOCK, finGeometry, finOutline } from "../../lib/physics/rocketPhysics";
import { IconPrinter } from "@tabler/icons-react";

/**
 * Life-size cutting templates for the parts a student actually makes by hand.
 *
 * The point of the whole module is that the virtual design becomes a real
 * rocket, and that only works if the paper you cut matches the model you tuned.
 * So these are drawn in real millimetres: the SVG viewBox is in mm and the
 * width/height are given in mm units, which makes the browser print them at
 * 1:1 on any printer set to 100% scale. A 10 mm check square is included so a
 * student can verify the printer did not rescale the page.
 */

/**
 * The fin outline, straight from the points the student dragged. Drawn with the
 * chord along the page's x axis and the span up its y axis, which is how you cut
 * it out of a sheet - the root edge lies flat along the bottom.
 */
function finPath(points: FinPoint[]): { d: string; w: number; h: number; rootLen: number } {
  if (points.length < 3) return { d: "", w: 10, h: 10, rootLen: 0 };
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const maxX = Math.max(...points.map((p) => p.x));
  // page x = station along the body, page y = span outward
  const mapped = points.map((p) => [p.y - minY, p.x] as const);
  const d = mapped.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") + " Z";
  const root = points.filter((p) => Math.abs(p.x) < 1e-6);
  const rootLen = root.length >= 2
    ? Math.max(...root.map((p) => p.y)) - Math.min(...root.map((p) => p.y))
    : 0;
  return { d, w: maxY - minY, h: maxX, rootLen };
}

/**
 * Flat development of a cone: the sector you roll into a nose cone of the given
 * base radius and height. Slant length is the sector radius, and the sector
 * angle is what makes the rolled edges meet exactly.
 */
function coneSector(baseR: number, height: number, glueMm = 8) {
  const slant = Math.hypot(baseR, height);
  const angle = (2 * Math.PI * baseR) / slant; // radians
  const half = angle / 2;
  const pts = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const a = -half + (angle * i) / steps;
    pts.push([slant * Math.sin(a), slant * Math.cos(a)]);
  }
  const arc = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  // Glue tab along one straight edge.
  const tab = `M 0 0 L ${(slant * Math.sin(-half)).toFixed(2)} ${(slant * Math.cos(-half)).toFixed(2)}`;
  return { slant, angle, path: `${arc} L 0 0 Z`, tabPath: tab, glueMm };
}

export function PrintTemplates() {
  const { fins, nose, coneTube, recovery, analysis } = useRocketStore();
  const tubeR = (TUBE_STOCK[coneTube.material]?.diameterMm ?? coneTube.diameterMm ?? 42) / 2;
  const cone = coneSector(tubeR, nose.lengthMm);

  const fin = finPath(finOutline(fins));
  const fg = finGeometry(fins);
  const finW = fin.w + 20;
  const finH = fin.h + 20;

  return (
    <div className="print-templates">
      <div className="pt-toolbar no-print">
        <div>
          <div className="text-sm font-bold text-gray-800">1:1 chop etiladigan shablonlar</div>
          <div className="text-[11px] text-gray-500">
            Printerda <b>masshtab 100%</b> (&quot;Fit to page&quot; o&apos;chirilgan) bo&apos;lishi shart.
            Chop etgach 10 mm kvadratni chizg&apos;ich bilan tekshiring.
          </div>
        </div>
        <button onClick={() => window.print()} className="pt-print-btn inline-flex items-center gap-2"><IconPrinter size={16} stroke={1.8} /> Chop etish</button>
      </div>

      <div className="pt-sheet">
        <div className="pt-sheet-head">
          <span>INNO HUB — Raketa shabloni</span>
          <span className="font-mono">
            {analysis.bodyLengthMm.toFixed(0)} mm · Ø{analysis.bodyDiameterMm} mm · {analysis.totalMassG.toFixed(0)} g
          </span>
        </div>

        {/* Scale check */}
        <div className="pt-block">
          <div className="pt-title">Masshtab tekshiruvi</div>
          <svg width="30mm" height="16mm" viewBox="0 0 30 16">
            <rect x={1} y={1} width={10} height={10} fill="none" stroke="#000" strokeWidth={0.3} />
            <text x={13} y={7} fontSize={3} fill="#000">10 × 10 mm</text>
            <text x={13} y={11} fontSize={2.2} fill="#666">chizg&apos;ich bilan o&apos;lchang</text>
          </svg>
        </div>

        {/* Fin */}
        <div className="pt-block">
          <div className="pt-title">
            Qanot — {fins.count} dona kerak
            <span className="pt-meta">
              ildiz {fg.rootChordMm.toFixed(0)} · uch {fg.tipChordMm.toFixed(0)} · span {fg.spanMm.toFixed(0)} ·
              siljish {fg.sweepMm.toFixed(0)} mm · {fins.material} ({fins.thicknessMm} mm)
            </span>
          </div>
          <svg width={`${finW}mm`} height={`${finH}mm`} viewBox={`-10 -10 ${finW} ${finH}`}>
            {/* 10 mm grid so the shape can be checked by eye */}
            <defs>
              <pattern id="mm10" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#d8d8d8" strokeWidth={0.2} />
              </pattern>
            </defs>
            <rect x={-10} y={-10} width={finW} height={finH} fill="url(#mm10)" />
            <path d={fin.d} fill="none" stroke="#000" strokeWidth={0.4} />
            {/* Root edge marked: this is the side that glues to the bottle. */}
            {fin.rootLen > 0 && (
              <>
                <path d={`M 0 0 L ${fin.rootLen.toFixed(2)} 0`} stroke="#c00" strokeWidth={0.8} strokeDasharray="3 2" />
                <text x={fin.rootLen / 2} y={-3} fontSize={3} textAnchor="middle" fill="#c00">
                  butilkaga yopishtiriladigan tomon
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Nose cone development */}
        <div className="pt-block pt-break">
          <div className="pt-title">
            Nos konusi yoyilmasi — 1 dona
            <span className="pt-meta">
              uzunlik {nose.lengthMm} mm · asos Ø{(tubeR * 2).toFixed(0)} mm · yon tomoni {cone.slant.toFixed(1)} mm ·
              sektor {((cone.angle * 180) / Math.PI).toFixed(1)}°
            </span>
          </div>
          <svg
            width={`${2 * cone.slant + 20}mm`}
            height={`${cone.slant + 20}mm`}
            viewBox={`${-cone.slant - 10} ${-10} ${2 * cone.slant + 20} ${cone.slant + 20}`}
          >
            <path d={cone.path} fill="none" stroke="#000" strokeWidth={0.4} />
            <path d={cone.tabPath} stroke="#c00" strokeWidth={0.6} strokeDasharray="3 2" fill="none" />
            <text x={0} y={cone.slant * 0.45} fontSize={4} textAnchor="middle" fill="#999">
              nos konusi
            </text>
            <text x={0} y={cone.slant * 0.45 + 5} fontSize={2.6} textAnchor="middle" fill="#c00">
              qizil chiziq — yelim qopqog&apos;i
            </text>
          </svg>
        </div>

        {/* Parachute */}
        <div className="pt-block pt-break">
          <div className="pt-title">
            Parashyut — Ø{recovery.parachuteSizeMm} mm
            <span className="pt-meta">plyonkadan doira qirqing, 8 ta arqon</span>
          </div>
          <ParachuteCircle diameterMm={recovery.parachuteSizeMm} />
        </div>
      </div>
    </div>
  );
}

function ParachuteCircle({ diameterMm: d }: { diameterMm: number }) {
  if (d <= 0) return <div className="pt-meta">Parashyut tanlanmagan</div>;
  const r = d / 2;
  const box = d + 20;
  return (
    <svg width={`${box}mm`} height={`${box}mm`} viewBox={`${-r - 10} ${-r - 10} ${box} ${box}`}>
      <circle cx={0} cy={0} r={r} fill="none" stroke="#000" strokeWidth={0.4} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <circle key={i} cx={r * 0.94 * Math.cos(a)} cy={r * 0.94 * Math.sin(a)} r={1.5}
            fill="none" stroke="#c00" strokeWidth={0.3} />
        );
      })}
      <text x={0} y={0} fontSize={5} textAnchor="middle" fill="#999">Ø{d} mm</text>
      <text x={0} y={6} fontSize={3} textAnchor="middle" fill="#c00">qizil doiralar — arqon teshiklari</text>
    </svg>
  );
}
