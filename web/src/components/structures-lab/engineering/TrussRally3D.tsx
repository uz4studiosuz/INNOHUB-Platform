"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TrussNode, TrussMemberDraft, SolvedMember } from "./types";
import { toVec3, useTrussBounds, TrussSceneContents, UNITS_PER_METER } from "./trussScene3D";
import { StudioStage } from "./trussStudioScene";
import { VehiclePreset, VEHICLE_PRESETS } from "./trussVehicles";

const VEHICLE_LENGTHS_M = VEHICLE_PRESETS.map((v) => v.lengthM);
import { IconDeviceGamepad2 } from "@tabler/icons-react";

const DRIVE_SPEED = 0.22; // progress units (0..1) per second
const FORWARD_KEYS = ["ArrowRight", "ArrowUp", "d", "D", "w", "W"];
const BACKWARD_KEYS = ["ArrowLeft", "ArrowDown", "a", "A", "s", "S"];

/** One wheel: a black rubber tyre with a bright metal rim hub on each outer
 * face. The cylinder's default axis is +Y; the parent group rotates it +90deg
 * about X so the axle runs along Z (left-right), i.e. the round face points
 * sideways and the wheel rolls along +X (the travel direction). */
function Wheel({ position, radius, width }: { position: [number, number, number]; radius: number; width: number }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 28]} />
        <meshStandardMaterial color="#141414" roughness={0.95} metalness={0.05} />
      </mesh>
      {[width / 2 + 0.005, -width / 2 - 0.005].map((yy, i) => (
        <mesh key={i} position={[0, yy, 0]}>
          <cylinderGeometry args={[radius * 0.48, radius * 0.48, 0.03, 6]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The vehicle crossing the bridge, proportioned from its preset: a car is low
 * and short, a lorry is long and rides on three axles, a monster truck is
 * lifted on oversized wheels. Everything is derived from `vehicle` so choosing
 * a different one visibly changes what drives across, not just a number.
 */
function VehicleModel({ position, vehicle, drawnLengthUnits, deckWidthUnits }: { position: THREE.Vector3; vehicle: VehiclePreset; drawnLengthUnits: number; deckWidthUnits: number }) {
  const L = drawnLengthUnits;
  const monster = vehicle.id === "monster";
  const wheelR = (monster ? 0.15 : 0.085) * L;
  const wheelW = wheelR * 0.8;
  const bodyW = Math.min(L * 0.42, deckWidthUnits * 0.62);
  const bodyH = (monster ? 0.17 : vehicle.id === "van" ? 0.3 : 0.2) * L;
  const chassisY = wheelR + (monster ? 0.3 : 0.12) * wheelR * 2;

  // Axles spread evenly along the wheelbase; a 3-axle lorry gets a closely
  // spaced rear bogie like the real thing.
  const axleX = useMemo(() => {
    if (vehicle.axles === 3) return [-L * 0.34, -L * 0.16, L * 0.33];
    return [-L * 0.3, L * 0.3];
  }, [vehicle.axles, L]);

  return (
    <group position={position}>
      {/* chassis rail */}
      <mesh position={[0, chassisY, 0]} castShadow>
        <boxGeometry args={[L * 0.92, bodyH * 0.28, bodyW * 0.82]} />
        <meshStandardMaterial color="#1f2937" metalness={0.55} roughness={0.45} />
      </mesh>
      {/* cargo body / passenger cell */}
      <mesh position={[-L * 0.12, chassisY + bodyH * 0.6, 0]} castShadow>
        <boxGeometry args={[L * 0.58, bodyH, bodyW]} />
        <meshStandardMaterial color={vehicle.bodyColor} metalness={0.35} roughness={0.42} />
      </mesh>
      {/* cab */}
      <mesh position={[L * 0.3, chassisY + bodyH * (vehicle.id === "car" ? 0.62 : 0.78), 0]} castShadow>
        <boxGeometry args={[L * 0.24, bodyH * (vehicle.id === "car" ? 0.78 : 1.1), bodyW * 0.96]} />
        <meshStandardMaterial color={vehicle.cabColor} metalness={0.35} roughness={0.4} />
      </mesh>
      {/* windscreen */}
      <mesh position={[L * 0.42, chassisY + bodyH * 0.95, 0]} castShadow>
        <boxGeometry args={[L * 0.02, bodyH * 0.45, bodyW * 0.82]} />
        <meshStandardMaterial color="#0f1e2e" metalness={0.5} roughness={0.12} />
      </mesh>
      {/* headlights */}
      {[bodyW * 0.34, -bodyW * 0.34].map((z) => (
        <mesh key={z} position={[L * 0.44, chassisY + bodyH * 0.3, z]}>
          <boxGeometry args={[L * 0.015, bodyH * 0.16, bodyW * 0.14]} />
          <meshStandardMaterial color="#fffbe6" emissive="#fff3b0" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {axleX.map((x) =>
        [bodyW / 2 + wheelW * 0.35, -bodyW / 2 - wheelW * 0.35].map((z) => (
          <Wheel key={`${x}:${z}`} position={[x, wheelR, z]} radius={wheelR} width={wheelW} />
        ))
      )}
    </group>
  );
}

/** Approach embankment at each bridge end, so the vehicle drives on from
 * somewhere rather than materialising in mid-air. */
function ApproachRamp({ x, y, depth, width }: { x: number; y: number; depth: number; width: number }) {
  return (
    <mesh position={[x, y - 0.5, 0]} receiveShadow castShadow>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial color="#3a444b" roughness={0.95} metalness={0.03} />
    </mesh>
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

type CamPreset = "orbit" | "side" | "chase" | "cockpit";

/**
 * Drives the camera for the non-orbit presets. On unmount (back to orbit) it
 * hands OrbitControls a sane framing rather than a camera jammed against the
 * vehicle.
 */
function PresetCamera({
  preset,
  vehiclePos,
  radius,
  deckY,
}: {
  preset: Exclude<CamPreset, "orbit">;
  vehiclePos: THREE.Vector3;
  radius: number;
  deckY: number;
}) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (preset === "side") {
      desired.set(0, deckY + radius * 0.5, radius * 2.4);
      target.set(0, deckY + radius * 0.15, 0);
    } else if (preset === "chase") {
      desired.set(vehiclePos.x - radius * 0.9, vehiclePos.y + radius * 0.55, vehiclePos.z + radius * 0.85);
      target.copy(vehiclePos);
    } else {
      // cockpit: just above and behind the cab, looking along the deck
      desired.set(vehiclePos.x - radius * 0.18, vehiclePos.y + radius * 0.16, vehiclePos.z);
      target.set(vehiclePos.x + radius, vehiclePos.y + radius * 0.08, vehiclePos.z);
    }
    camera.position.lerp(desired, 0.08);
    camera.lookAt(target);
  });

  useEffect(() => {
    return () => {
      camera.position.set(radius * 1.7, deckY + radius * 0.9, radius * 2.65);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, deckY, 0);
    };
  }, [camera, radius, deckY]);

  return null;
}

interface TrussRally3DProps {
  nodes: TrussNode[];
  members: TrussMemberDraft[];
  solved: Map<string, SolvedMember> | null;
  /** 0..1 crossing progress; null hides the vehicle (test hasn't started). */
  truckProgress: number | null;
  vehicle: VehiclePreset;
  /** Fires when the vehicle had to be drawn smaller than life to fit the span,
   * so the page can say so rather than showing a silently wrong scale. */
  onDrawScale?: (scaledDown: boolean) => void;
}

export default function TrussRally3D({ nodes, members, solved, truckProgress, vehicle, onDrawScale }: TrussRally3DProps) {
  const { center, radius, spanMeters, depthUnits } = useTrussBounds(nodes);

  const { minX, maxX, deckY, spanUnits } = useMemo(() => {
    if (nodes.length === 0) return { minX: -5, maxX: 5, deckY: 0, spanUnits: 10 };
    const pts = nodes.map((n) => toVec3(n, center.x, center.y));
    const lo = Math.min(...pts.map((p) => p.x));
    const hi = Math.max(...pts.map((p) => p.x));
    return { minX: lo, maxX: hi, deckY: Math.min(...pts.map((p) => p.y)), spanUnits: Math.max(hi - lo, 1) };
  }, [nodes, center]);

  /**
   * How long to draw the vehicle.
   *
   * True scale first: UNITS_PER_METER is the scene's real metre, so a 8.2 m
   * lorry is 8.2 m long. But a 12 t lorry on a 4 m student span is genuinely
   * twice the length of the bridge, and drawing that honestly just produces a
   * picture where the vehicle swallows the structure (which is exactly what it
   * did). So the drawn length is capped at half the span; the mass fed to the
   * verdict is untouched, so the physics still answers the real question.
   */
  const { drawnLengthUnits, scaledDown } = useMemo(() => {
    const trueLength = vehicle.lengthM * UNITS_PER_METER;
    // One shared shrink factor for the whole fleet, keyed off the longest
    // preset. Clamping each vehicle to the cap independently made a car and a
    // lorry come out identical on a short span, so swapping vehicles changed
    // nothing on screen; scaling them all by the same factor keeps a lorry
    // visibly longer than a car while still fitting the bridge.
    const longest = Math.max(...VEHICLE_LENGTHS_M) * UNITS_PER_METER;
    const factor = Math.min(1, (spanUnits * 0.5) / longest);
    return { drawnLengthUnits: trueLength * factor, scaledDown: factor < 0.98 };
  }, [vehicle.lengthM, spanUnits]);

  useEffect(() => {
    onDrawScale?.(scaledDown);
  }, [scaledDown, onDrawScale]);

  const [manualMode, setManualMode] = useState(false);
  const [manualX, setManualX] = useState(0);
  const [camPreset, setCamPreset] = useState<CamPreset>("orbit");
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

  const showVehicle = manualMode || truckProgress !== null;
  const effectiveT = manualMode ? manualX : Math.max(0, Math.min(1, truckProgress ?? 0));
  const effectivePreset: CamPreset = (camPreset === "chase" || camPreset === "cockpit") && !showVehicle ? "side" : camPreset;

  const vehiclePos = useMemo(
    () => new THREE.Vector3(minX + (maxX - minX) * effectiveT, deckY, 0),
    [effectiveT, minX, maxX, deckY]
  );

  const bankWidth = Math.max(spanUnits * 0.5, 4);

  return (
    <div className="flex-1 relative bg-[#17212b]">
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        camera={{ position: [radius * 1.7, radius * 0.9, radius * 2.65], fov: 40, near: 0.1, far: radius * 30 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <StudioStage radius={radius} />

        {/* Identical to the Engineering viewport: same materials, same deck,
            same joints. keepWood used to force every rally bridge to timber,
            which meant a steel design looked like balsa the moment you tested
            it. */}
        <TrussSceneContents nodes={nodes} members={members} solved={solved} colorByForce />

        <ApproachRamp x={minX - bankWidth / 2 - 0.4} y={deckY} width={bankWidth} depth={radius * 1.6} />
        <ApproachRamp x={maxX + bankWidth / 2 + 0.4} y={deckY} width={bankWidth} depth={radius * 1.6} />

        {showVehicle && (
          <VehicleModel position={vehiclePos} vehicle={vehicle} drawnLengthUnits={drawnLengthUnits} deckWidthUnits={depthUnits} />
        )}
        {manualMode && <ManualDriveController keysRef={keysRef} onStep={handleStep} />}

        {effectivePreset !== "orbit" && (
          <PresetCamera preset={effectivePreset} vehiclePos={vehiclePos} radius={radius} deckY={deckY} />
        )}
        {effectivePreset === "orbit" && (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.075}
            minDistance={Math.max(2, radius * 0.7)}
            maxDistance={radius * 8}
            maxPolarAngle={Math.PI * 0.49}
            target={[0, deckY + radius * 0.15, 0]}
          />
        )}
      </Canvas>

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 bg-[#0a0e18]/90 backdrop-blur border border-[rgba(255,255,255,0.12)] rounded-xl p-2 w-[190px]">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-0.5">Kamera</div>
        <div className="grid grid-cols-2 gap-1">
          {([
            { id: "orbit", label: "Erkin" },
            { id: "side", label: "Yon" },
            { id: "chase", label: "Ergashuvchi" },
            { id: "cockpit", label: "Kabina" },
          ] as { id: CamPreset; label: string }[]).map((option) => (
            <button
              key={option.id}
              onClick={() => setCamPreset(option.id)}
              disabled={(option.id === "chase" || option.id === "cockpit") && !showVehicle}
              className={`px-2 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                camPreset === option.id ? "bg-violet-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleManual}
          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold cursor-pointer ${
            manualMode ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          <IconDeviceGamepad2 size={14} stroke={1.8} />
          {manualMode ? "Qo'lda: yoniq" : "Qo'lda haydash"}
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10 text-[10px] font-medium text-slate-300 bg-[#111820]/90 border border-white/10 px-3 py-2 rounded-lg pointer-events-none">
        {effectivePreset === "orbit"
          ? "Chap tugma: aylantirish · g‘altak: zoom · o‘ng tugma: surish"
          : "Kamera avtomatik rejimda — erkin ko‘rish uchun “Erkin”ni tanlang"}
        {manualMode && " · mashinani haydash: ←/→ yoki A/D"}
      </div>
    </div>
  );
}
