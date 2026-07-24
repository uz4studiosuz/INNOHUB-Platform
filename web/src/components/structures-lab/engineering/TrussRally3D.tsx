"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { toVec3, useTrussBounds, TrussSceneContents } from "./trussScene3D";

const WHEEL_RADIUS = 0.6; // monster-truck sized wheel
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

/** A monster-truck: cab leading (+X, the direction of travel across the
 * bridge), lifted body on tall wide wheels, open bed trailing behind it. */
function TruckModel({ position }: { position: THREE.Vector3 }) {
  const wheels: [number, number, number][] = [
    [-1.05, 0, 0.68],
    [-1.05, 0, -0.68],
    [0.75, 0, 0.68],
    [0.75, 0, -0.68],
  ];
  return (
    <group position={position}>
      <mesh position={[-0.35, 0.85, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.15]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[-0.35, 1.18, 0.52]} castShadow>
        <boxGeometry args={[1.9, 0.22, 0.08]} />
        <meshStandardMaterial color="#c2410c" />
      </mesh>
      <mesh position={[-0.35, 1.18, -0.52]} castShadow>
        <boxGeometry args={[1.9, 0.22, 0.08]} />
        <meshStandardMaterial color="#c2410c" />
      </mesh>
      <mesh position={[0.85, 1.25, 0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 1.1]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[1.25, 1.35, 0]} castShadow>
        <boxGeometry args={[0.08, 0.55, 0.95]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[1.42, 0.82, 0]} castShadow>
        <boxGeometry args={[0.28, 0.3, 1.15]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      {[0.62, -0.62].map((z) => (
        <mesh key={z} position={[1.05, 1.35, z]} castShadow>
          <boxGeometry args={[0.06, 0.14, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
      {wheels.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.4, 20]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Dirt ramp/abutment at each bridge end (previously a green "canyon bank" -
 * recolored to match the arena's dirt floor, since the bridge now sits over
 * open arena ground rather than a canyon gap). */
function EndRamp({ x, y, depth, width }: { x: number; y: number; depth: number; width: number }) {
  return (
    <mesh position={[x, y - 0.5, 0]} receiveShadow>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial color="#6b4f2a" roughness={0.95} />
    </mesh>
  );
}

/** A big circular dirt arena floor beneath the whole scene. */
function ArenaFloor({ radius, y }: { radius: number; y: number }) {
  return (
    <mesh position={[0, y - 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius * 6, 48]} />
      <meshStandardMaterial color="#6b4f2a" roughness={1} />
    </mesh>
  );
}

let crowdTextureCache: THREE.CanvasTexture | null = null;

/** A small procedural "crowd" texture (scattered colored dots on a stand
 * background) - generated once and cached, same pattern as the wood-grain
 * texture in trussScene3D.tsx. */
function getCrowdTexture(): THREE.CanvasTexture {
  if (crowdTextureCache) return crowdTextureCache;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#243b6b";
  ctx.fillRect(0, 0, 128, 64);
  const colors = ["#e2e8f0", "#f97316", "#dc2626", "#facc15", "#38bdf8", "#a3e635"];
  for (let i = 0; i < 900; i++) {
    const rx = seededRandom(i * 7 + 1);
    const ry = seededRandom(i * 7 + 2);
    const rc = seededRandom(i * 7 + 3);
    ctx.fillStyle = colors[Math.floor(rc * colors.length)];
    ctx.fillRect(rx * 128, ry * 64, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 2);
  crowdTextureCache = t;
  return t;
}

/** One tiered spectator stand facing the arena, with a procedural crowd
 * texture on its raked seating face and a plain concrete base. */
function CrowdStand({
  position,
  rotationY,
  width,
  height,
}: {
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
}) {
  const tex = getCrowdTexture();
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[-Math.PI / 6, 0, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={tex} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -height * 0.28, height * 0.22]} receiveShadow>
        <boxGeometry args={[width, height * 0.5, height * 0.45]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A big sky-colored dome enclosing the arena (rendered back-face-in so it
 * reads as a distant backdrop rather than a solid ball). */
function SkyDome({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 20, 24, 16]} />
      <meshBasicMaterial color="#7db4e6" side={THREE.BackSide} />
    </mesh>
  );
}

/** A low ring of distant mountain peaks around the arena horizon. */
function MountainRing({ radius, y }: { radius: number; y: number }) {
  const peaks = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const ang = (i / 14) * Math.PI * 2;
        const rr = seededRandom(i * 5 + 11);
        return { x: Math.cos(ang) * radius * 12, z: Math.sin(ang) * radius * 12, h: radius * (2 + rr * 2.5) };
      }),
    [radius]
  );
  return (
    <>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, y, p.z]}>
          <coneGeometry args={[p.h * 0.9, p.h, 4]} />
          <meshStandardMaterial color="#5b6b52" roughness={1} />
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
        <cylinderGeometry args={[0.06, 0.06, h, 8]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 8, 0, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.12]} />
        <meshStandardMaterial color="#e5e7eb" emissive="#fff7d6" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** A ring of colored advertising banners around the inner track wall. */
function BannerRow({ radius, y, count = 10 }: { radius: number; y: number; count?: number }) {
  const banners = useMemo(() => {
    const colors = ["#dc2626", "#2563eb", "#f59e0b", "#16a34a", "#7c3aed"];
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
          <planeGeometry args={[radius * 0.32, radius * 0.2]} />
          <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/** A scattered pile of broken timber under the bridge - wreckage from
 * earlier failed crossings. */
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
        <mesh key={i} position={[x + b.dx, y + 0.1, z + b.dz]} rotation={[0, b.ry, Math.PI / 2]}>
          <boxGeometry args={[0.12, b.len, 0.12]} />
          <meshStandardMaterial color="#c19a6b" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

/** Advances manualX every frame while a drive key is held - lives inside the
 * Canvas (useFrame is r3f's render-loop hook, not a React effect) so the
 * outer component's state update happens once per frame, not on every
 * keydown/keyup. */
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

/** Overrides the default camera every frame to match one of the WhiteBox
 * Truck Rally camera presets - Crowd (wide stadium view), High/Low Bridge
 * Truck Bed (chase cam following the truck). OrbitControls and this
 * component fight over the SAME shared camera object (r3f's single default
 * camera), so on unmount (switching back to orbit) we must explicitly
 * restore a sane framing position - otherwise OrbitControls just takes over
 * from wherever this preset left the camera (typically jammed right up
 * against the truck), which is the "camera stuck inside the geometry" bug
 * this guards against. */
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
      desired.set(0, deckY + radius * 2.2, radius * 5);
      target.copy(center);
    } else if (preset === "highBed") {
      desired.set(truckPos.x - radius * 1.2, truckPos.y + radius * 1.1, truckPos.z + radius * 0.9);
      target.copy(truckPos);
    } else if (preset === "lowBed") {
      desired.set(truckPos.x - radius * 0.9, truckPos.y + 0.6, truckPos.z + 0.4);
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
  const arenaR = radius * 4;

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
    <div className="flex-1 relative" style={{ background: "#7db4e6" }}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [radius * 1.8, radius * 1.4, radius * 2], fov: 45 }}>
        <color attach="background" args={["#7db4e6"]} />
        <ambientLight intensity={0.7} />
        <hemisphereLight args={["#bcdcf5", "#6b4f2a", 0.5]} />
        <directionalLight position={[radius * 2, radius * 3, radius]} intensity={1.3} castShadow />
        <directionalLight position={[-radius * 2, radius, -radius]} intensity={0.4} color="#fff7e0" />

        <SkyDome radius={radius} />
        <MountainRing radius={radius} y={deckY - radius * 0.3} />

        <TrussSceneContents nodes={nodes} members={members} solved={solved} colorByForce />

        <ArenaFloor radius={radius} y={deckY} />
        <EndRamp x={minX - bankWidth / 2 - 0.5} y={deckY} width={bankWidth} depth={bankDepth} />
        <EndRamp x={maxX + bankWidth / 2 + 0.5} y={deckY} width={bankWidth} depth={bankDepth} />
        <DebrisPile x={(minX + maxX) / 2} y={deckY} z={0} />
        <BannerRow radius={arenaR * 0.98} y={deckY + arenaR * 0.06} />

        <CrowdStand position={[0, deckY + arenaR * 0.35, -arenaR]} rotationY={0} width={arenaR * 2.2} height={arenaR * 0.9} />
        <CrowdStand position={[0, deckY + arenaR * 0.35, arenaR]} rotationY={Math.PI} width={arenaR * 2.2} height={arenaR * 0.9} />
        <CrowdStand position={[-arenaR, deckY + arenaR * 0.35, 0]} rotationY={Math.PI / 2} width={arenaR * 2.2} height={arenaR * 0.9} />
        <CrowdStand position={[arenaR, deckY + arenaR * 0.35, 0]} rotationY={-Math.PI / 2} width={arenaR * 2.2} height={arenaR * 0.9} />

        <FloodLight x={-arenaR * 1.1} z={-arenaR * 1.1} y={deckY} h={radius * 2.2} />
        <FloodLight x={arenaR * 1.1} z={-arenaR * 1.1} y={deckY} h={radius * 2.2} />
        <FloodLight x={-arenaR * 1.1} z={arenaR * 1.1} y={deckY} h={radius * 2.2} />
        <FloodLight x={arenaR * 1.1} z={arenaR * 1.1} y={deckY} h={radius * 2.2} />

        {showTruck && <TruckModel position={truckPos} />}
        {manualMode && <ManualDriveController keysRef={keysRef} onStep={handleStep} />}

        {effectivePreset !== "orbit" && (
          <PresetCamera preset={effectivePreset} truckPos={truckPos} center={arenaCenter} radius={radius} deckY={deckY} />
        )}
        {effectivePreset === "orbit" && (
          <OrbitControls enableDamping dampingFactor={0.08} minDistance={2} maxDistance={radius * 8} />
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
