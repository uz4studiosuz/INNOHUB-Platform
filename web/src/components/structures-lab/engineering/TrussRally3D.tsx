"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { toVec3, useTrussBounds, TrussSceneContents } from "./trussScene3D";

const WHEEL_RADIUS = 0.62; // monster-truck sized wheel
const WHEEL_WIDTH = 0.52;
const DRIVE_SPEED = 0.22; // progress units (0..1) per second
const FORWARD_KEYS = ["ArrowRight", "ArrowUp", "d", "D", "w", "W"];
const BACKWARD_KEYS = ["ArrowLeft", "ArrowDown", "a", "A", "s", "S"];

/** Deterministic pseudo-random in [0,1) - Math.random() is impure and not
 * allowed during render/useMemo, so all scattered scenery (crowd texture,
 * mountains, debris) is derived from a seed instead (same seed always gives
 * the same result, no render-to-render jitter). */
function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** One monster-truck wheel: a wide black rubber tyre with a bright metal rim
 * hub on each outer face. The cylinder's default axis is +Y; the parent group
 * rotates it +90deg about X so the axle runs along Z (left-right), i.e. the
 * round face points sideways and the wheel rolls along +X (travel direction).
 * The earlier build rotated about Z, which pointed the round faces forward and
 * made the wheels read as barrels - the "cartoon tyre" look. */
function MonsterWheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* tyre */}
      <mesh castShadow>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 32]} />
        <meshStandardMaterial color="#141414" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* sidewall bevel (slightly smaller, softer black) to avoid a flat disc face */}
      <mesh position={[0, WHEEL_WIDTH / 2 - 0.01, 0]}>
        <cylinderGeometry args={[WHEEL_RADIUS * 0.82, WHEEL_RADIUS, 0.06, 32]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      <mesh position={[0, -WHEEL_WIDTH / 2 + 0.01, 0]}>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS * 0.82, 0.06, 32]} />
        <meshStandardMaterial color="#0c0c0c" roughness={1} />
      </mesh>
      {/* metal rim hubs */}
      {[WHEEL_WIDTH / 2 + 0.005, -WHEEL_WIDTH / 2 - 0.005].map((yy, i) => (
        <mesh key={i} position={[0, yy, 0]}>
          <cylinderGeometry args={[WHEEL_RADIUS * 0.48, WHEEL_RADIUS * 0.48, 0.04, 6]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** A lifted monster-truck: cab leading (+X, the direction of travel across the
 * bridge), a two-tone lifted body on four tall wide wheels, a roll bar and a
 * trailing open bed. Deliberately clean/low-poly but proportioned like a real
 * vehicle rather than a toy. */
function TruckModel({ position }: { position: THREE.Vector3 }) {
  const wheels: [number, number, number][] = [
    [-0.95, 0, 0.7],
    [-0.95, 0, -0.7],
    [0.85, 0, 0.7],
    [0.85, 0, -0.7],
  ];
  const bodyY = WHEEL_RADIUS + 0.28; // sit the chassis above the axles (lift)
  return (
    <group position={position}>
      {/* chassis rail */}
      <mesh position={[-0.05, bodyY - 0.12, 0]} castShadow>
        <boxGeometry args={[2.5, 0.14, 0.9]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* bed / lower body */}
      <mesh position={[-0.45, bodyY + 0.22, 0]} castShadow>
        <boxGeometry args={[1.7, 0.5, 1.16]} />
        <meshStandardMaterial color="#ea6a1e" metalness={0.35} roughness={0.4} />
      </mesh>
      {/* bed side rails */}
      {[0.56, -0.56].map((z) => (
        <mesh key={z} position={[-0.45, bodyY + 0.52, z]} castShadow>
          <boxGeometry args={[1.7, 0.18, 0.06]} />
          <meshStandardMaterial color="#b5461a" roughness={0.5} />
        </mesh>
      ))}
      {/* cab */}
      <mesh position={[0.75, bodyY + 0.58, 0]} castShadow>
        <boxGeometry args={[0.95, 0.72, 1.08]} />
        <meshStandardMaterial color="#f2761f" metalness={0.35} roughness={0.4} />
      </mesh>
      {/* windshield */}
      <mesh position={[1.13, bodyY + 0.7, 0]} castShadow>
        <boxGeometry args={[0.06, 0.42, 0.9]} />
        <meshStandardMaterial color="#0f1e2e" metalness={0.4} roughness={0.15} />
      </mesh>
      {/* roll bar */}
      <mesh position={[0.28, bodyY + 0.9, 0]}>
        <boxGeometry args={[0.07, 0.5, 1.02]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* headlights */}
      {[0.5, -0.5].map((z) => (
        <mesh key={z} position={[1.24, bodyY + 0.3, z]}>
          <boxGeometry args={[0.05, 0.12, 0.16]} />
          <meshStandardMaterial color="#fffbe6" emissive="#fff3b0" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {wheels.map((w, i) => (
        <MonsterWheel key={i} position={w} />
      ))}
    </group>
  );
}

/** Dirt ramp/abutment at each bridge end, colored to match the arena floor. */
function EndRamp({ x, y, depth, width }: { x: number; y: number; depth: number; width: number }) {
  return (
    <mesh position={[x, y - 0.5, 0]} receiveShadow castShadow>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial color="#7a5a34" roughness={0.98} />
    </mesh>
  );
}

/** The compacted-dirt arena floor beneath the whole scene. */
function ArenaFloor({ radius, y }: { radius: number; y: number }) {
  return (
    <mesh position={[0, y - 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial color="#79582f" roughness={1} />
    </mesh>
  );
}

let crowdTextureCache: THREE.CanvasTexture | null = null;

/** A distant-crowd texture: a dark packed-stand base with faint horizontal
 * seat rows and small, muted specks (mostly clothing/skin tones, only a few
 * bright). Reads as a filled stadium from a distance rather than the earlier
 * confetti of saturated primary dots. Generated once and cached. */
function getCrowdTexture(): THREE.CanvasTexture {
  if (crowdTextureCache) return crowdTextureCache;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#20283a";
  ctx.fillRect(0, 0, 256, 128);
  // faint seat rows
  for (let y = 4; y < 128; y += 9) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, y, 256, 1);
  }
  const muted = ["#5b6472", "#7d8390", "#9aa0ab", "#a9865f", "#c2a07a", "#4a5261", "#6b5548"];
  const bright = ["#c94f4f", "#4f74c9", "#d8b34a"];
  for (let i = 0; i < 2600; i++) {
    const rx = seededRandom(i * 7 + 1);
    const ry = seededRandom(i * 7 + 2);
    const rc = seededRandom(i * 7 + 3);
    // ~8% bright, rest muted
    ctx.fillStyle = rc > 0.92 ? bright[Math.floor(seededRandom(i * 7 + 4) * bright.length)] : muted[Math.floor(rc * muted.length)];
    ctx.fillRect(rx * 256, ry * 128, 1.6, 1.6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(22, 5);
  crowdTextureCache = t;
  return t;
}

/** An enclosed stadium bowl: a raked (truncated-cone) seating shell of crowd
 * texture rising all the way around the arena, a dark barrier wall at track
 * level, and a top rim cap. Replaces the four flat tilted "billboard" stands. */
function StadiumBowl({ innerR, baseY, height }: { innerR: number; baseY: number; height: number }) {
  const crowd = getCrowdTexture();
  return (
    <group position={[0, baseY, 0]}>
      {/* raked seating (wider at the top) */}
      <mesh position={[0, height / 2 + height * 0.18, 0]} receiveShadow>
        <cylinderGeometry args={[innerR + height * 1.05, innerR + height * 0.15, height, 64, 1, true]} />
        <meshStandardMaterial map={crowd} side={THREE.DoubleSide} roughness={1} />
      </mesh>
      {/* barrier wall at track level */}
      <mesh position={[0, height * 0.14, 0]}>
        <cylinderGeometry args={[innerR, innerR, height * 0.28, 64, 1, true]} />
        <meshStandardMaterial color="#22344d" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {/* top rim cap */}
      <mesh position={[0, height + height * 0.18, 0]}>
        <cylinderGeometry args={[innerR + height * 1.05, innerR + height * 1.02, height * 0.08, 64, 1, true]} />
        <meshStandardMaterial color="#334155" side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
    </group>
  );
}

let skyTextureCache: THREE.CanvasTexture | null = null;

/** A vertical sky gradient (pale near the horizon, deeper blue overhead). */
function getSkyTexture(): THREE.CanvasTexture {
  if (skyTextureCache) return skyTextureCache;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#3f78c4"); // top (V=1 maps near the dome top)
  g.addColorStop(0.55, "#7fb0e0");
  g.addColorStop(1, "#d6e8f5"); // horizon
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  skyTextureCache = t;
  return t;
}

/** A sky-gradient dome enclosing the arena (rendered back-face-in). */
function SkyDome({ radius }: { radius: number }) {
  const tex = getSkyTexture();
  return (
    <mesh>
      <sphereGeometry args={[radius * 22, 32, 20]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} />
    </mesh>
  );
}

/** A low ring of hazy distant mountains around the horizon. */
function MountainRing({ radius, y }: { radius: number; y: number }) {
  const peaks = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => {
        const ang = (i / 22) * Math.PI * 2;
        const rr = seededRandom(i * 5 + 11);
        return { x: Math.cos(ang) * radius * 13, z: Math.sin(ang) * radius * 13, h: radius * (2.4 + rr * 2.8) };
      }),
    [radius]
  );
  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, y, p.z]}>
          <coneGeometry args={[p.h * 1.05, p.h, 4]} />
          <meshStandardMaterial color="#8296a6" roughness={1} />
        </mesh>
      ))}
    </>
  );
}

/** A stadium floodlight: a pole with an emissive light panel on top. */
function FloodLight({ x, z, y, h }: { x: number; z: number; y: number; h: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, h, 8]} />
        <meshStandardMaterial color="#2b2f36" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 7, 0, 0]}>
        <boxGeometry args={[1.6, 0.9, 0.14]} />
        <meshStandardMaterial color="#d8dde3" emissive="#fff7d6" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/** A ring of colored advertising banners around the inner track wall. */
function BannerRow({ radius, y, count = 14 }: { radius: number; y: number; count?: number }) {
  const banners = useMemo(() => {
    const colors = ["#c62828", "#1565c0", "#ef6c00", "#2e7d32", "#6a1b9a", "#00838f"];
    return Array.from({ length: count }).map((_, i) => {
      const ang = (i / count) * Math.PI * 2;
      const rc = seededRandom(i * 9 + 5);
      return {
        x: Math.cos(ang) * radius,
        z: Math.sin(ang) * radius,
        ry: -ang + Math.PI / 2,
        color: colors[Math.floor(rc * colors.length)],
      };
    });
  }, [radius, count]);
  return (
    <>
      {banners.map((b, i) => (
        <mesh key={i} position={[b.x, y, b.z]} rotation={[0, b.ry, 0]}>
          <planeGeometry args={[(radius * 2 * Math.PI) / (count * 1.05), radius * 0.14]} />
          <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/** A scattered pile of broken timber under the bridge - wreckage from earlier
 * failed crossings. */
function DebrisPile({ x, y, z, count = 14 }: { x: number; y: number; z: number; count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        dx: (seededRandom(i * 4 + 1) - 0.5) * 3,
        dz: (seededRandom(i * 4 + 2) - 0.5) * 3,
        ry: seededRandom(i * 4 + 3) * Math.PI,
        len: 0.6 + seededRandom(i * 4 + 4) * 1.2,
      })),
    [count]
  );
  return (
    <>
      {bits.map((b, i) => (
        <mesh key={i} position={[x + b.dx, y + 0.1, z + b.dz]} rotation={[0, b.ry, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.1, b.len, 0.1]} />
          <meshStandardMaterial color="#a98763" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

/** Advances manualX every frame while a drive key is held. */
function ManualDriveController({
  keysRef,
  onStep,
}: {
  keysRef: React.MutableRefObject<{ left: boolean; right: boolean }>;
  onStep: (delta: number) => void;
}) {
  useFrame((_, delta) => {
    const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    if (dir !== 0) onStep(dir * delta * DRIVE_SPEED);
  });
  return null;
}

type CamPreset = "orbit" | "crowd" | "highBed" | "lowBed";

/** Overrides the default camera every frame to match one of the WhiteBox Truck
 * Rally camera presets. On unmount (back to orbit) it restores a sane framing
 * so OrbitControls doesn't inherit a camera jammed against the truck. */
function PresetCamera({
  preset,
  truckPos,
  center,
  radius,
  deckY,
}: {
  preset: CamPreset;
  truckPos: THREE.Vector3;
  center: THREE.Vector3;
  radius: number;
  deckY: number;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (preset === "crowd") {
      desired.set(radius * 1.5, deckY + radius * 1.6, radius * 4.2);
      target.set(center.x, deckY + radius * 0.3, center.z);
    } else if (preset === "highBed") {
      desired.set(truckPos.x - radius * 1.2, truckPos.y + radius * 1.1, truckPos.z + radius * 0.9);
      target.copy(truckPos);
    } else if (preset === "lowBed") {
      desired.set(truckPos.x - radius * 0.9, truckPos.y + 0.7, truckPos.z + 0.5);
      target.set(truckPos.x + radius, truckPos.y + 0.4, truckPos.z);
    }
    camera.position.lerp(desired, 0.08);
    camera.lookAt(target);
  });
  useEffect(() => {
    return () => {
      camera.position.set(radius * 1.8, radius * 1.4, radius * 2);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
    };
  }, [camera, radius]);
  return null;
}

interface TrussRally3DProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
  /** 0..1 crossing progress; null hides the truck (test hasn't started). */
  truckProgress: number | null;
}

export default function TrussRally3D({ nodes, members, solved, truckProgress }: TrussRally3DProps) {
  const { center, radius } = useTrussBounds(nodes);

  const { minX, maxX, deckY } = useMemo(() => {
    if (nodes.length === 0) return { minX: -5, maxX: 5, deckY: 0 };
    const pts = nodes.map((n) => toVec3(n, center.x, center.y));
    return {
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      deckY: Math.min(...pts.map((p) => p.y)),
    };
  }, [nodes, center]);

  const bankWidth = Math.max((maxX - minX) * 0.6, 4);
  const bankDepth = radius * 3;
  const arenaFloorR = radius * 3.4;
  const bowlHeight = radius * 2.4;

  const arenaCenter = useMemo(() => new THREE.Vector3(0, deckY, 0), [deckY]);

  const [manualMode, setManualMode] = useState(false);
  const [manualX, setManualX] = useState(0);
  const [camPreset, setCamPreset] = useState<CamPreset>("crowd");
  const keysRef = useRef({ left: false, right: false });

  useEffect(() => {
    if (!manualMode) return;
    const down = (e: KeyboardEvent) => {
      if (FORWARD_KEYS.includes(e.key)) {
        keysRef.current.right = true;
        e.preventDefault();
      } else if (BACKWARD_KEYS.includes(e.key)) {
        keysRef.current.left = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (FORWARD_KEYS.includes(e.key)) keysRef.current.right = false;
      else if (BACKWARD_KEYS.includes(e.key)) keysRef.current.left = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keysRef.current = { left: false, right: false };
    };
  }, [manualMode]);

  const handleStep = useCallback((delta: number) => {
    setManualX((prev) => Math.max(0, Math.min(1, prev + delta)));
  }, []);

  const toggleManual = () => {
    if (!manualMode) setManualX(truckProgress ?? 0);
    setManualMode((m) => !m);
  };

  const showTruck = manualMode || truckProgress !== null;
  const effectiveT = manualMode ? manualX : Math.max(0, Math.min(1, truckProgress ?? 0));
  const effectivePreset: CamPreset = (camPreset === "highBed" || camPreset === "lowBed") && !showTruck ? "crowd" : camPreset;

  const truckPos = useMemo(() => {
    const x = minX + (maxX - minX) * effectiveT;
    return new THREE.Vector3(x, deckY + WHEEL_RADIUS, 0);
  }, [effectiveT, minX, maxX, deckY]);

  return (
    <div className="flex-1 relative" style={{ background: "#8fb8e0" }}>
      <Canvas shadows={{ type: THREE.PCFSoftShadowMap }} camera={{ position: [radius * 1.8, radius * 1.4, radius * 2], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#cfe3f5", "#6b4f2a", 0.55]} />
        <directionalLight
          position={[radius * 2.5, radius * 3.5, radius * 1.5]}
          intensity={1.35}
          color="#fff4dd"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-radius * 2, radius * 1.5, -radius * 2]} intensity={0.35} color="#cfe0ff" />

        <SkyDome radius={radius} />
        <MountainRing radius={radius} y={deckY - radius * 0.2} />

        <ArenaFloor radius={arenaFloorR} y={deckY} />
        <StadiumBowl innerR={arenaFloorR} baseY={deckY - 0.55} height={bowlHeight} />
        <BannerRow radius={arenaFloorR - 0.05} y={deckY - 0.05} />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} keepWood />

        <EndRamp x={minX - bankWidth / 2 - 0.5} y={deckY} width={bankWidth} depth={bankDepth} />
        <EndRamp x={maxX + bankWidth / 2 + 0.5} y={deckY} width={bankWidth} depth={bankDepth} />
        <DebrisPile x={(minX + maxX) / 2} y={deckY - 0.4} z={0} />

        <FloodLight x={-arenaFloorR * 0.8} z={-arenaFloorR * 0.8} y={deckY} h={bowlHeight * 1.15} />
        <FloodLight x={arenaFloorR * 0.8} z={-arenaFloorR * 0.8} y={deckY} h={bowlHeight * 1.15} />
        <FloodLight x={-arenaFloorR * 0.8} z={arenaFloorR * 0.8} y={deckY} h={bowlHeight * 1.15} />
        <FloodLight x={arenaFloorR * 0.8} z={arenaFloorR * 0.8} y={deckY} h={bowlHeight * 1.15} />

        {showTruck && <TruckModel position={truckPos} />}
        {manualMode && <ManualDriveController keysRef={keysRef} onStep={handleStep} />}

        {effectivePreset !== "orbit" && (
          <PresetCamera preset={effectivePreset} truckPos={truckPos} center={arenaCenter} radius={radius} deckY={deckY} />
        )}
        {effectivePreset === "orbit" && (
          <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 10} target={[0, deckY, 0]} />
        )}
      </Canvas>

      <div className="absolute top-2 left-2 flex flex-col gap-2 bg-[#0a0e18]/85 border border-[rgba(255,255,255,0.15)] rounded-lg p-2">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Camera</div>
        <select
          value={camPreset}
          onChange={(e) => setCamPreset(e.target.value as CamPreset)}
          className="bg-[#141a2b] border border-[rgba(255,255,255,0.15)] rounded px-2 py-1 text-xs text-white cursor-pointer"
        >
          <option value="crowd">Crowd</option>
          <option value="highBed" disabled={!showTruck}>High Bridge Truck Bed</option>
          <option value="lowBed" disabled={!showTruck}>Low Bridge Truck Bed</option>
          <option value="orbit">Orbit (erkin)</option>
        </select>
        <button
          onClick={toggleManual}
          className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
            manualMode ? "bg-violet-600 text-white" : "bg-[#141a2b] text-slate-300 border border-[rgba(255,255,255,0.15)] hover:bg-[#1c2438]"
          }`}
        >
          🎮 {manualMode ? "Qo'lda boshqarish: yoniq" : "Qo'lda boshqarish"}
        </button>
      </div>

      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 bg-[#0a0e18]/70 px-2 py-1 rounded pointer-events-none">
        {manualMode
          ? "Mashinani boshqarish: ←/→ yoki A/D · " + (effectivePreset === "orbit" ? "sichqoncha bilan aylantirish (chap tugma) · zoom (g'altak) · surish (o'ng tugma)" : "kamera avtomatik rejimda")
          : "Sichqoncha: aylantirish (chap tugma) · zoom (g'altak) · surish (o'ng tugma)"}
      </div>
    </div>
  );
}
