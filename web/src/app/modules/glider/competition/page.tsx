"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, OrbitControls } from "@react-three/drei";
import { IconCamera, IconFocusCentered, IconPlayerPlay, IconRefresh, IconRobot, IconUser } from "@tabler/icons-react";
import * as THREE from "three";
import { useGliderStore, GliderShape } from "../../../../store/gliderStore";
import { GliderModel } from "../../../../components/glider-viewport/GliderModel";

// Bot design generator
function getBotDesign(): GliderShape {
  return {
    fuselage: { noseHeight: 12, bodyHeight: 12, rearHeight: 10, length: 280 },
    wing: {
      leadingEdgeXOffset: 65, span: 260, chord: 50,
      dihedralType: "dihedral", dihedral: 8, tipDihedral: 0,
      shape: "tapered", sandingLevel: "light", color: "wood"
    },
    horizontalStabilizer: { span: 90, chord: 35 },
    verticalStabilizer: { height: 35, chord: 35 }
  };
}

// ---------------------------------------------------------------------------
// 3D ARENA SCENE
// ---------------------------------------------------------------------------

const RUNWAY_LENGTH = 2200;
const FINISH_Z = -880;

function TreeLine() {
  const trees = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    return {
      x: side * (155 + ((row * 37) % 90)),
      z: 120 - row * 105,
      height: 18 + ((row * 13) % 11),
    };
  }), []);

  return (
    <group>
      {trees.map((tree, index) => (
        <group key={index} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.height * 0.25, 0]} castShadow>
            <cylinderGeometry args={[1.4, 2.1, tree.height * 0.5, 8]} />
            <meshStandardMaterial color="#6b4f35" roughness={1} />
          </mesh>
          <mesh position={[0, tree.height * 0.72, 0]} castShadow>
            <coneGeometry args={[tree.height * 0.28, tree.height, 9]} />
            <meshStandardMaterial color={index % 3 === 0 ? "#315f48" : "#3e7254"} roughness={0.96} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LaunchStand({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, 18]}>
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 5, 34]} />
        <meshStandardMaterial color="#25313a" roughness={0.64} metalness={0.18} />
      </mesh>
      <mesh position={[0, 6, -2]} castShadow>
        <boxGeometry args={[20, 2.2, 28]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {[-8, 8].map((railX) => (
        <mesh key={railX} position={[railX, 9, -3]} rotation={[Math.PI / 2 - 0.12, 0, 0]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 35, 10]} />
          <meshStandardMaterial color="#d7dee2" metalness={0.7} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function AirfieldEnvironment() {
  return (
    <group>
      <color attach="background" args={["#cfe4ea"]} />
      <fog attach="fog" args={["#cfe4ea", 620, 2100]} />
      <Sky distance={450000} sunPosition={[4, 6, 2]} inclination={0.55} azimuth={0.22} mieCoefficient={0.004} mieDirectionalG={0.75} />
      <hemisphereLight args={["#e6f5ff", "#52634d", 1.45]} />
      <directionalLight position={[180, 260, 120]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={900} shadow-camera-left={-260} shadow-camera-right={260} shadow-camera-top={260} shadow-camera-bottom={-260} shadow-bias={-0.00015} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, -620]} receiveShadow>
        <planeGeometry args={[3400, 3400]} />
        <meshStandardMaterial color="#6f8f62" roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -960]} receiveShadow>
        <planeGeometry args={[150, RUNWAY_LENGTH]} />
        <meshStandardMaterial color="#3c464b" roughness={0.93} />
      </mesh>
      {[-74, 74].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.04, -960]}>
          <planeGeometry args={[3, RUNWAY_LENGTH]} />
          <meshBasicMaterial color="#edf2f4" />
        </mesh>
      ))}
      {Array.from({ length: 16 }, (_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 30 - index * 126]}>
          <planeGeometry args={[3, 62]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, FINISH_Z]}>
        <planeGeometry args={[146, 7]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 82, 0, FINISH_Z]}>
          <mesh position={[0, 20, 0]} castShadow><cylinderGeometry args={[1.5, 1.5, 40, 10]} /><meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.35} /></mesh>
          <mesh position={[side * -8, 38, 0]} castShadow><boxGeometry args={[18, 7, 1.5]} /><meshStandardMaterial color="#0f766e" roughness={0.42} /></mesh>
        </group>
      ))}

      {[-68, 68].flatMap((x) => Array.from({ length: 11 }, (_, index) => (
        <group key={`${x}-${index}`} position={[x, 0, 30 - index * 190]}>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.7, 0.9, 2, 8]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
          <mesh position={[0, 2.2, 0]}><sphereGeometry args={[0.9, 10, 8]} /><meshStandardMaterial color="#dbeafe" emissive="#60a5fa" emissiveIntensity={1.3} toneMapped={false} /></mesh>
        </group>
      )))}

      <LaunchStand x={-20} color="#0f766e" />
      <LaunchStand x={20} color="#2563eb" />
      <TreeLine />
    </group>
  );
}

// ---------------------------------------------------------------------------
// FLIGHT SIMULATION COMPONENT
// ---------------------------------------------------------------------------

function SimulatedGlider({ 
  design, isBot, phase, flightTime, flightDistance, objectRef,
}: { 
  design: GliderShape, isBot: boolean, phase: string, flightTime: number, flightDistance: number,
  objectRef?: React.MutableRefObject<THREE.Group | null>,
}) {
  const groupRef = useRef<THREE.Group>(null);
  const localStartRef = useRef<number | null>(null);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const startX = isBot ? 20 : -20;
    const startY = 12;
    const startZ = 0;

    if (phase === "IDLE") {
      localStartRef.current = null;
      groupRef.current.position.set(startX, startY, startZ);
      groupRef.current.rotation.set(0, 0, 0);
    } else if (phase === "LAUNCHING" || phase === "GLIDING" || phase === "LANDED") {
      if (localStartRef.current === null) {
        localStartRef.current = clock.getElapsedTime();
      }
      
      const elapsed = clock.getElapsedTime() - localStartRef.current;
      
      if (elapsed < 0) return;

      if (elapsed < flightTime) {
        // Normalize time 0..1
        const t = elapsed / flightTime;
        
        // Z: linear progress forwards
        const currentZ = startZ - t * flightDistance;
        
        // Y: Parabolic arc: y = -a(x-h)^2 + k
        // Let's make it go up to startY + 50, then down to 0
        const maxHeight = startY + (flightDistance * 0.1); 
        const h = 0.3; // peaks at 30% of flight time
        const a = (0 - maxHeight) / Math.pow(1 - h, 2);
        
        let currentY = maxHeight + a * Math.pow(t - h, 2);
        if (t < h) {
          const a_up = (startY - maxHeight) / Math.pow(0 - h, 2);
          currentY = maxHeight + a_up * Math.pow(t - h, 2);
        }

        // Pitch: derivative of height roughly
        let pitch = 0;
        if (t < h) pitch = Math.PI / 12; // Pointed slightly up
        else pitch = -Math.PI / 18; // Pointed slightly down

        groupRef.current.position.set(startX, currentY, currentZ);
        groupRef.current.rotation.set(pitch, 0, 0);
      } else {
        // Landed
        groupRef.current.position.set(startX, 5, startZ - flightDistance);
        groupRef.current.rotation.set(0, 0, 0); // Flat on ground
      }
    }
  });

  return (
    <group ref={(group) => { groupRef.current = group; if (objectRef) objectRef.current = group; }}>
      {/* Wrapper to scale down the UI model to match arena scale. UI uses mm natively. */}
      <group scale={[0.65, 0.65, 0.65]}>
        <GliderModel designOverride={design} hideUI displayColor={isBot ? "#4f8edb" : "#f1c56d"} />
      </group>
    </group>
  );
}

type CameraMode = "free" | "user" | "bot" | "finish";

function MainCameraRig({ resetToken, mode, userRef, botRef, finishZ }: {
  resetToken: number;
  mode: CameraMode;
  userRef: React.MutableRefObject<THREE.Group | null>;
  botRef: React.MutableRefObject<THREE.Group | null>;
  finishZ: number;
}) {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3(0, 26, -120));
  const targetRef = useRef(new THREE.Vector3());
  const desiredRef = useRef(new THREE.Vector3());
  useEffect(() => {
    if (mode === "free") {
      camera.position.set(115, 78, 165);
      camera.up.set(0, 1, 0);
      controlsRef.current?.target.set(0, 26, -120);
      controlsRef.current?.update();
      lookAtRef.current.set(0, 26, -120);
    }
  }, [camera, mode, resetToken]);

  useFrame((_, delta) => {
    if (mode === "free") return;
    const tracked = mode === "user" ? userRef.current : mode === "bot" ? botRef.current : null;
    const target = targetRef.current;
    if (tracked) target.copy(tracked.position);
    else target.set(0, 12, finishZ);
    const side = mode === "bot" ? 1 : -1;
    const desired = desiredRef.current.copy(target);
    desired.x += side * 46;
    desired.y += mode === "finish" ? 48 : 24;
    desired.z += 74;
    const alpha = 1 - Math.exp(-5.5 * Math.min(delta, 0.05));
    camera.position.lerp(desired, alpha);
    lookAtRef.current.lerp(target, alpha);
    camera.lookAt(lookAtRef.current);
  });

  return <OrbitControls ref={controlsRef} makeDefault enabled={mode === "free"} target={[0, 26, -120]} enableDamping dampingFactor={0.075} enablePan screenSpacePanning maxPolarAngle={Math.PI / 2 - 0.05} minDistance={32} maxDistance={1600} />;
}

function FollowCamera({ targetRef, isBot }: { targetRef: React.MutableRefObject<THREE.Group | null>, isBot: boolean }) {
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3());
  const desiredLookRef = useRef(new THREE.Vector3());
  const desiredPositionRef = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const target = targetRef.current;
    if (!target) return;
    const desiredLook = desiredLookRef.current.copy(target.position);
    desiredLook.y += 1;
    desiredLook.z -= 7;
    const desiredPosition = desiredPositionRef.current.copy(target.position);
    desiredPosition.x += isBot ? 28 : -28;
    desiredPosition.y += 16;
    desiredPosition.z += 52;
    const alpha = 1 - Math.exp(-7 * Math.min(delta, 0.05));
    camera.position.lerp(desiredPosition, alpha);
    lookAtRef.current.lerp(desiredLook, alpha);
    camera.lookAt(lookAtRef.current);
  });
  return null;
}

function PipRunway() {
  return (
    <>
      <color attach="background" args={["#cfe4ea"]} />
      <hemisphereLight args={["#e6f5ff", "#52634d", 1.35]} />
      <directionalLight position={[80, 130, 40]} intensity={1.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -1300]}>
        <planeGeometry args={[2500, 4000]} />
        <meshStandardMaterial color="#6f8f62" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1300]} receiveShadow>
        <planeGeometry args={[120, 3800]} />
        <meshStandardMaterial color="#3c464b" roughness={0.92} />
      </mesh>
      {Array.from({ length: 24 }, (_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -index * 145 - 40]}>
          <planeGeometry args={[3, 72]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}
    </>
  );
}

function PipScene({ design, isBot, phase, flightTime, flightDistance }: { design: GliderShape, isBot: boolean, phase: string, flightTime: number, flightDistance: number }) {
  const targetRef = useRef<THREE.Group | null>(null);
  return (
    <Canvas dpr={1} camera={{ position: [isBot ? 60 : -60, 50, 110], fov: 48 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
      <PipRunway />
      <SimulatedGlider design={design} isBot={isBot} phase={phase} flightTime={flightTime} flightDistance={flightDistance} objectRef={targetRef} />
      <FollowCamera targetRef={targetRef} isBot={isBot} />
    </Canvas>
  );
}


// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function CompetitionPage() {
  const store = useGliderStore();
  const metrics = store.getComputedMetrics();
  const botDesign = useMemo(() => getBotDesign(), []);
  
  const [phase, setPhase] = useState<"IDLE" | "LAUNCHING" | "GLIDING" | "LANDED">("IDLE");
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [cameraMode, setCameraMode] = useState<CameraMode>("free");
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userGliderRef = useRef<THREE.Group | null>(null);
  const botGliderRef = useRef<THREE.Group | null>(null);

  useEffect(() => () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
  }, []);

  // Simplified Bot Metrics (Pre-calculated roughly)
  const botMetrics = {
    mass: 12.5,
    liftEfficiencyRatio: 22.4,
    flightTimeSec: 4.12,
    specViolations: []
  };

  const startFlight = () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    setPhase("LAUNCHING");
    // Launch phase runs, then after flightTime we could set LANDED, but the component handles animation automatically
    const maxTime = Math.max(metrics.flightTimeSec, botMetrics.flightTimeSec);
    flightTimerRef.current = setTimeout(() => {
      setPhase("LANDED");
    }, maxTime * 1000);
  };

  const resetFlight = () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    setPhase("IDLE");
    setCameraMode("free");
    setCameraResetToken((token) => token + 1);
  };

  const userFlightDist = metrics.flightTimeSec * 200; // Arbitrary distance scale
  const botFlightDist = botMetrics.flightTimeSec * 200;

  return (
    <div className="relative flex flex-1 overflow-hidden bg-[#dce8e6] text-[var(--ink)]">
      {/* 3D ARENA CANVAS */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 1.35]} camera={{ position: [115, 78, 165], fov: 48 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <MainCameraRig resetToken={cameraResetToken} mode={cameraMode} userRef={userGliderRef} botRef={botGliderRef} finishZ={-Math.max(userFlightDist, botFlightDist)} />
          
          <AirfieldEnvironment />

          {/* User Glider */}
          <SimulatedGlider 
            design={store} 
            isBot={false} 
            phase={phase} 
            flightTime={metrics.flightTimeSec} 
            flightDistance={userFlightDist} 
            objectRef={userGliderRef}
          />

          {/* Bot Glider */}
          <SimulatedGlider 
            design={botDesign} 
            isBot={true} 
            phase={phase} 
            flightTime={botMetrics.flightTimeSec} 
            flightDistance={botFlightDist} 
            objectRef={botGliderRef}
          />
        </Canvas>
      </div>

      <aside className="relative z-10 flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--line)] bg-white/95 p-4 text-[var(--ink)] backdrop-blur-sm md:w-[292px]">
        <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Parvoz maydoni</h2><p className="mt-1 text-[10px] text-[var(--ink-muted)]">{phase === "IDLE" ? "Start relsida tayyor" : phase === "LANDED" ? "Sinov yakunlandi" : "Parvoz davom etmoqda"}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><IconCamera size={19} stroke={1.7} /></div></div>

        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><IconUser size={16} stroke={1.8} /> Sizning planyoringiz</div>
          <div className="mt-3 grid grid-cols-3 gap-2"><FlightMetric label="Massa" value={`${metrics.mass.toFixed(1)} g`} /><FlightMetric label="Ko'tarish" value={metrics.liftEfficiencyRatio.toFixed(1)} /><FlightMetric label="Vaqt" value={`${metrics.flightTimeSec.toFixed(2)} s`} /></div>
        </div>

        <div className="mt-2 rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><IconRobot size={16} stroke={1.8} /> Raqib bot</div>
          <div className="mt-3 grid grid-cols-3 gap-2"><FlightMetric label="Massa" value="12.5 g" muted /><FlightMetric label="Ko'tarish" value="22.4" muted /><FlightMetric label="Vaqt" value="4.12 s" muted /></div>
        </div>

        {phase === "LANDED" && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-medium text-emerald-700">G'olib</p><p className="mt-1 font-semibold">{metrics.flightTimeSec > botMetrics.flightTimeSec ? "Sizning dizayningiz" : "Raqib bot"}</p></div>}

        <div className="mt-auto space-y-2">
          <button type="button" onClick={() => { if (phase === "IDLE") startFlight(); else { if (flightTimerRef.current) clearTimeout(flightTimerRef.current); setPhase("IDLE"); flightTimerRef.current = setTimeout(startFlight, 100); } }} disabled={metrics.flightTimeSec === 0} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"><IconPlayerPlay size={17} stroke={1.8} /> {phase === "IDLE" ? "Parvozni boshlash" : "Qayta uchirish"}</button>
          <button type="button" onClick={resetFlight} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"><IconRefresh size={16} stroke={1.8} /> Parvoz va kamerani tiklash</button>
        </div>
      </aside>

      <div className="absolute right-5 top-4 z-10 flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white/95 p-1 shadow-lg backdrop-blur-sm">
        {([
          ["free", "Erkin", IconCamera], ["user", "CAM 1", IconUser], ["bot", "CAM 2", IconRobot], ["finish", "Marra", IconFocusCentered],
        ] as const).map(([mode, label, ModeIcon]) => <button key={mode} type="button" onClick={() => { setCameraMode(mode); if (mode === "free") setCameraResetToken((token) => token + 1); }} className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition-colors ${cameraMode === mode ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><ModeIcon size={15} stroke={1.8} /> {label}</button>)}
      </div>

      {cameraMode === "free" && <div className="pointer-events-none absolute right-5 top-[66px] z-10 rounded-lg border border-[var(--line)] bg-white/90 px-3 py-2 text-[10px] font-medium text-slate-600 backdrop-blur-sm">Chap tugma: aylantirish · o'ng tugma: surish · g'ildirak: zoom</div>}

      {/* Ikki mustaqil kamera: har biri gliderga real vaqtda ergashadi. */}
      <div className="pointer-events-none absolute bottom-5 left-[312px] right-5 hidden justify-between gap-5 lg:flex">
        {/* Left PIP (User) */}
        <button type="button" onClick={() => setCameraMode("user")} className="pointer-events-auto relative h-[158px] w-[270px] overflow-hidden rounded-xl border border-slate-500 bg-[#101820] text-left shadow-2xl transition-colors hover:border-blue-300">
          <PipScene design={store} isBot={false} phase={phase} flightTime={metrics.flightTimeSec} flightDistance={userFlightDist} />
          <div className="absolute left-2 top-2 rounded border border-blue-400/40 bg-[#071018]/85 px-2 py-1 font-mono text-[10px] font-bold text-blue-300">CAM 1 | SIZ</div>
          <div className="absolute bottom-2 right-2 bg-[#071018]/80 rounded px-2 py-1 text-[10px] text-slate-200 font-mono">{phase === "LANDED" ? "LANDED" : phase}</div>
        </button>

        {/* Right PIP (Bot) */}
        <button type="button" onClick={() => setCameraMode("bot")} className="pointer-events-auto relative h-[158px] w-[270px] overflow-hidden rounded-xl border border-slate-500 bg-[#101820] text-left shadow-2xl transition-colors hover:border-slate-300">
          <PipScene design={botDesign} isBot phase={phase} flightTime={botMetrics.flightTimeSec} flightDistance={botFlightDist} />
          <div className="absolute left-2 top-2 rounded border border-slate-400/40 bg-[#071018]/85 px-2 py-1 font-mono text-[10px] font-bold text-slate-200">CAM 2 | BOT</div>
          <div className="absolute bottom-2 right-2 bg-[#071018]/80 rounded px-2 py-1 text-[10px] text-slate-200 font-mono">{phase === "LANDED" ? "LANDED" : phase}</div>
        </button>
      </div>
    </div>
  );
}

function FlightMetric({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div><p className="text-[9px] text-slate-500">{label}</p><p className={`mt-1 font-mono text-[11px] font-semibold ${muted ? "text-slate-500" : "text-slate-900"}`}>{value}</p></div>;
}
