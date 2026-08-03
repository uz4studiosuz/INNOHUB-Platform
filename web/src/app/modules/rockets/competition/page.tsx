"use client";

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRocketStore } from "../../../../store/rocketStore";
import { RocketModel } from "../../../../components/rocket-viewport/RocketModel";
import { StadiumArena } from "../../../../components/rocket-viewport/StadiumArena";
import { DetailedLaunchPad } from "../../../../components/rocket-viewport/DetailedLaunchPad";
import {
  computeRocketMetrics, sampleFlight, RocketAnalysis, RocketDesign, DEFAULT_DESIGN,
} from "../../../../lib/physics/rocketPhysics";

/**
 * The model is built at 1 mm = 0.1 scene units, so a metre of altitude is 100
 * units. The launch animation used to assign metres straight to position.y,
 * which made a 25 m flight look like the rocket hopped half its own length.
 */
const METRE = 100 * 0.1 * 10; // 1 m = 1000 mm = 1000 * 0.1 units
/** Altitude is compressed for the camera; a true 25 m would leave the frame. */
const ALTITUDE_VIEW_SCALE = 0.35;

interface Opponent { name: string; design: RocketDesign; colour: string }

/**
 * Three rivals, each losing for a different reason drawn straight from the real
 * rules: one breaks the deploy rule the help video says catches 99 students out
 * of 100, one exceeds the five-fin limit, and one is perfectly legal but flies a
 * tiny parachute - which costs it the flight-time race even though it reaches
 * the same apogee.
 */
const OPPONENTS: Opponent[] = [
  {
    name: "Sardor (loysiz nos)",
    colour: "#f59e0b",
    design: {
      ...DEFAULT_DESIGN,
      nose: { ...DEFAULT_DESIGN.nose, clayMassG: 0 },
    },
  },
  {
    name: "Nilufar (kichik parashyut)",
    colour: "#a855f7",
    design: {
      ...DEFAULT_DESIGN,
      recovery: { system: "parachute", parachuteSizeMm: 110 },
    },
  },
  {
    name: "Bekzod (6 qanot)",
    colour: "#22d3ee",
    design: {
      ...DEFAULT_DESIGN,
      fins: { ...DEFAULT_DESIGN.fins, count: 6 },
    },
  },
];

type Phase = "STAGING" | "LAUNCHING" | "RESULTS";

/**
 * What the airshow is scored on. The original Rockets 2.0 races "for total
 * flight time and/or maximum height", so both are offered and flight time is
 * the default - it is the one the results screen highlights, and it makes the
 * parachute a real design decision instead of dead weight.
 */
type ScoreBy = "time" | "height";

const SCORE_LABEL: Record<ScoreBy, string> = {
  time: "Umumiy uchish vaqti",
  height: "Maksimal balandlik",
};

interface Entrant { name: string; design: RocketDesign; analysis: RocketAnalysis; isPlayer: boolean; colour: string }

function FlyingRocket({ entrant, phase, onLanded, x }: {
  entrant: Entrant;
  phase: Phase;
  onLanded: (name: string) => void;
  x: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const chuteRef = useRef<THREE.Group>(null);
  const startRef = useRef(0);
  const landedRef = useRef(false);
  const { clock } = useThree();

  React.useEffect(() => {
    if (phase === "LAUNCHING") {
      startRef.current = clock.getElapsedTime();
      landedRef.current = false;
    } else if (phase === "STAGING") {
      landedRef.current = false;
      // Put the airframe back on the pad. These are three.js objects, not React
      // state, so resetting them here costs no re-render.
      if (ref.current) { ref.current.position.y = 0; ref.current.rotation.z = 0; }
      if (chuteRef.current) chuteRef.current.scale.setScalar(0);
    }
  }, [phase, clock]);

  useFrame(() => {
    if (phase !== "LAUNCHING" || !ref.current) return;
    const a = entrant.analysis;
    const total = a.totalFlightTimeS;
    const t = clock.getElapsedTime() - startRef.current;

    const s = sampleFlight(a.flightPath, Math.min(t, total));
    if (!s) return;

    ref.current.position.y = Math.max(0, s.h * METRE * ALTITUDE_VIEW_SCALE);
    // Lean over through apogee, the way a stable rocket arcs.
    const arc = a.ascentTimeS > 0 ? Math.min(1, Math.max(0, (t - a.ascentTimeS) / 1.2)) : 0;
    ref.current.rotation.z = arc * (entrant.isPlayer ? -0.5 : 0.5) * (a.deployStatus === "Will Deploy" ? 1 : 2.2);

    if (chuteRef.current) {
      const open = a.deployStatus === "Will Deploy" && t > a.ascentTimeS;
      const k = open ? Math.min(1, (t - a.ascentTimeS) * 3) : 0;
      chuteRef.current.scale.setScalar(k);
    }

    if (t >= total && !landedRef.current) {
      landedRef.current = true;
      onLanded(entrant.name);
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <DetailedLaunchPad position={[0, 0, 0]} />
      <group position={[0, 10, 0]}>
        <group ref={ref}>
          <RocketModel designOverride={entrant.design} hideUI isLaunching={phase === "LAUNCHING"} />
          <group ref={chuteRef} position={[0, 44, 0]} scale={[0, 0, 0]}>
            <mesh>
              <sphereGeometry args={[18, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={entrant.colour} side={THREE.DoubleSide} roughness={0.7} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Distance at which a box of the given half-extents just fits the frame. Both
 * axes have to be checked: the viewport here is much wider than it is tall, so
 * it is almost always the vertical field of view that limits things, and ignoring
 * that is what let the rockets run off the top of the picture.
 */
function fitDistance(halfH: number, halfW: number, cam: THREE.PerspectiveCamera): number {
  const vFov = (cam.fov * Math.PI) / 180;
  const tanV = Math.tan(vFov / 2);
  return Math.max(halfH / tanV, halfW / (tanV * Math.max(0.1, cam.aspect)));
}

/**
 * Frames the line-up before launch and tracks it afterwards.
 *
 * A 45 m flight is over twenty times the rocket's own length, so pulling back far
 * enough to hold the whole trajectory would shrink the rockets to specks. Instead
 * the camera keeps a readable distance and pans upward with the leader, easing
 * back only enough to keep some sky and ground context - the way launch footage
 * is actually shot.
 */
function LaunchCamera({ entrants, phase, spread, rocketTop, playerX }: {
  entrants: Entrant[];
  phase: Phase;
  /** Half-width of the pad line-up, in scene units. */
  spread: number;
  /** Height of the tallest airframe on its pad, in scene units. */
  rocketTop: number;
  playerX: number;
}) {
  const startRef = useRef(0);
  const lookAtRef = useRef(new THREE.Vector3(0, rocketTop * 0.45, 0));
  const directionRef = useRef(new THREE.Vector3(0.78, 0.24, 1.45).normalize());
  const { clock } = useThree();

  React.useEffect(() => { if (phase === "LAUNCHING") startRef.current = clock.getElapsedTime(); }, [phase, clock]);

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    if (!(cam instanceof THREE.PerspectiveCamera)) return;

    // Staging: hold the whole row of rockets, ground included, with a margin.
    const stageHalfH = (rocketTop * 1.25) / 2;
    const stageDist = fitDistance(stageHalfH, spread * 1.12, cam);
    let targetX = 0;
    let targetY = rocketTop * 0.45;
    let dist = stageDist;

    if (phase === "LAUNCHING") {
      const t = state.clock.getElapsedTime() - startRef.current;
      const player = entrants.find((entrant) => entrant.isPlayer) ?? entrants[0];
      const playerHeight = sampleFlight(player.analysis.flightPath, Math.min(t, player.analysis.totalFlightTimeS))?.h ?? 0;
      const y = playerHeight * METRE * ALTITUDE_VIEW_SCALE;
      targetX = playerX;
      // Kamera doim foydalanuvchining o'z raketasiga ergashadi.
      targetY = Math.max(rocketTop * 0.45, y + rocketTop * 0.3);
      dist = Math.max(rocketTop * 3.8, Math.min(stageDist * 1.1, rocketTop * 6.5));
    }

    const desiredTarget = new THREE.Vector3(targetX, targetY, 0);
    const desiredPosition = desiredTarget.clone().add(directionRef.current.clone().multiplyScalar(dist));
    const alpha = 1 - Math.exp(-(phase === "LAUNCHING" ? 4.2 : 6.5) * Math.min(delta, 0.05));
    cam.position.lerp(desiredPosition, alpha);
    lookAtRef.current.lerp(desiredTarget, alpha);
    cam.lookAt(lookAtRef.current);
  });
  return null;
}

export default function CompetitionPage() {
  const store = useRocketStore();
  const [phase, setPhase] = useState<Phase>("STAGING");
  const [landed, setLanded] = useState<string[]>([]);
  const [scoreBy, setScoreBy] = useState<ScoreBy>("time");

  const playerDesign: RocketDesign = useMemo(() => ({
    propulsion: store.propulsion,
    recovery: store.recovery,
    nose: store.nose,
    coneTube: store.coneTube,
    coneTransition: store.coneTransition,
    fins: store.fins,
  }), [store.propulsion, store.recovery, store.nose, store.coneTube, store.coneTransition, store.fins]);

  const entrants: Entrant[] = useMemo(() => [
    { name: "Siz", design: playerDesign, analysis: store.analysis, isPlayer: true, colour: "#fcd34d" },
    ...OPPONENTS.map((o) => ({
      name: o.name, design: o.design, analysis: computeRocketMetrics(o.design), isPlayer: false, colour: o.colour,
    })),
  ], [playerDesign, store.analysis]);

  const handleLanded = (name: string) => {
    setLanded((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      if (next.length >= entrants.length) setPhase("RESULTS");
      return next;
    });
  };

  /**
   * Ranking rule: anything out of spec is disqualified first, then the chosen
   * metric decides. A rocket whose parachute never opens still places - it just
   * comes down fast, which costs it the flight-time race by itself.
   */
  const ranked = useMemo(() => {
    const metric = (e: Entrant) =>
      scoreBy === "time" ? e.analysis.totalFlightTimeS : e.analysis.maxHeightM;
    return [...entrants].sort((a, b) => {
      const rank = (e: Entrant) => (e.analysis.specStatus === "IN_SPEC" ? 1e6 : 0) + metric(e);
      return rank(b) - rank(a);
    });
  }, [entrants, scoreBy]);

  const spacing = 70;
  const offset = ((entrants.length - 1) * spacing) / 2;
  /** Pad height plus the tallest airframe, so the camera knows what to frame. */
  const rocketTop = useMemo(
    () => 10 + Math.max(...entrants.map((e) => e.analysis.bodyLengthMm)) * 0.1,
    [entrants]
  );

  return (
    <div className="absolute inset-0 bg-[#f8f8f8] flex flex-col">
      <div className="h-14 bg-white border-b border-gray-300 shadow-sm flex items-center justify-between px-6 z-10 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Uchirish musobaqasi</h2>
          <p className="text-[11px] text-gray-500">
            {`${OPPONENTS.length} ta raqibga qarshi · g'olib ${SCORE_LABEL[scoreBy].toLowerCase()} bo'yicha`}
            {store.analysis.specStatus === "OUT_OF_SPEC" && (
              <span className="text-red-600 font-bold"> — dizayningiz talabga javob bermaydi, diskvalifikatsiya</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Mezon
            <select
              value={scoreBy}
              onChange={(e) => setScoreBy(e.target.value as ScoreBy)}
              disabled={phase === "LAUNCHING"}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs font-semibold text-gray-800 bg-white"
            >
              <option value="time">Uchish vaqti</option>
              <option value="height">Balandlik</option>
            </select>
          </label>
          <button
            onClick={() => { setPhase("STAGING"); setLanded([]); }}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded font-bold text-sm hover:bg-gray-300 disabled:opacity-40"
            disabled={phase === "STAGING"}
          >
            QAYTA TIKLASH
          </button>
          <button
            onClick={() => { setLanded([]); setPhase("LAUNCHING"); }}
            className="px-7 py-2 bg-green-600 text-white rounded font-bold text-sm shadow hover:bg-green-700 disabled:opacity-40"
            disabled={phase === "LAUNCHING"}
          >
            ▲ UCHIRISH
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <Canvas camera={{ position: [0, 60, 320], fov: 45 }} shadows gl={{ antialias: true }}>
          <StadiumArena />
          <LaunchCamera entrants={entrants} phase={phase} spread={offset + spacing * 0.5} rocketTop={rocketTop} playerX={-offset} />
          {entrants.map((e, i) => (
            <FlyingRocket key={e.name} entrant={e} phase={phase} onLanded={handleLanded} x={i * spacing - offset} />
          ))}
        </Canvas>

        {/* Live standings while they fly. */}
        {phase === "LAUNCHING" && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow px-4 py-3 text-xs">
            <div className="font-bold text-gray-700 mb-1.5">UCHISHDA</div>
            {entrants.map((e) => (
              <div key={e.name} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.colour }} />
                <span className={e.isPlayer ? "font-bold text-gray-900" : "text-gray-600"}>{e.name}</span>
                <span className="ml-auto font-mono text-gray-500">
                  {landed.includes(e.name)
                    ? `${e.analysis.totalFlightTimeS.toFixed(1)} s`
                    : `${e.analysis.maxHeightM.toFixed(0)} m`}
                </span>
              </div>
            ))}
          </div>
        )}

        {phase === "RESULTS" && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center z-20 p-6">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden">
              <div className="bg-gray-800 p-5 text-center">
                <h2 className="text-2xl font-black text-white tracking-widest">NATIJALAR</h2>
                <div className="mt-1 text-yellow-400 font-bold text-lg">G&apos;OLIB: {ranked[0].name}</div>
              </div>

              <div className="p-5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs border-b-2 border-gray-300">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Ishtirokchi</th>
                      <th className={`p-2.5 ${scoreBy === "time" ? "bg-yellow-100 text-gray-800" : ""}`}>
                        Uchish vaqti
                      </th>
                      <th className={`p-2.5 ${scoreBy === "height" ? "bg-yellow-100 text-gray-800" : ""}`}>
                        Balandlik
                      </th>
                      <th className="p-2.5">Zapas</th>
                      <th className="p-2.5">Parashyut</th>
                      <th className="p-2.5">Narx</th>
                      <th className="p-2.5">Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((e, i) => (
                      <tr key={e.name} className={`border-b border-gray-200 ${e.isPlayer ? "bg-amber-50 font-semibold" : ""}`}>
                        <td className="p-2.5 font-bold text-gray-400">{i + 1}</td>
                        <td className="p-2.5">{e.name}</td>
                        <td className={`p-2.5 font-mono ${scoreBy === "time" ? "bg-yellow-50 font-bold" : ""}`}>
                          {e.analysis.totalFlightTimeS.toFixed(2)} s
                        </td>
                        <td className={`p-2.5 font-mono ${scoreBy === "height" ? "bg-yellow-50 font-bold" : ""}`}>
                          {e.analysis.maxHeightM.toFixed(1)} m
                        </td>
                        <td className={`p-2.5 font-mono ${e.analysis.stability === "STABLE" ? "text-green-600" : e.analysis.stability === "MARGINAL" ? "text-amber-600" : "text-red-600"}`}>
                          {e.analysis.staticMarginCal.toFixed(2)}
                        </td>
                        <td className={`p-2.5 ${e.analysis.deployStatus === "Will Deploy" ? "text-green-600" : "text-red-600"}`}>
                          {e.analysis.deployStatus === "Will Deploy" ? "ochildi" : "ochilmadi"}
                        </td>
                        <td className="p-2.5 font-mono">${e.analysis.designCostUsd.toFixed(2)}</td>
                        <td className={`p-2.5 text-xs font-bold ${e.analysis.specStatus === "IN_SPEC" ? "text-green-600" : "text-red-600"}`}>
                          {e.analysis.specStatus === "IN_SPEC" ? "OK" : "DISQ"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {store.analysis.specErrors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <b>Sizning dizayningizdagi muammolar:</b>
                    <ul className="list-disc pl-5 mt-1">
                      {store.analysis.specErrors.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                {store.analysis.hints.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <b>Yaxshilash uchun:</b>
                    <ul className="list-disc pl-5 mt-1">
                      {store.analysis.hints.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-gray-100 p-4 flex justify-end gap-3 border-t border-gray-300">
                <button
                  onClick={() => { setPhase("STAGING"); setLanded([]); }}
                  className="px-6 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-700"
                >
                  YOPISH
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
