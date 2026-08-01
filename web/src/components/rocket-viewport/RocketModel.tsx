"use client";

import React, { useMemo, useRef } from "react";
import { useRocketStore } from "../../store/rocketStore";
import {
  BOTTLE_INFO, TUBE_STOCK, computeRocketMetrics, finGeometry, finOutline, RocketDesign,
} from "../../lib/physics/rocketPhysics";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  makeBottleBody, makePetaloidBase, makeWaterGeometry, baseStartFraction,
} from "./bottleGeometry";
import { makeCheckerBallTexture, COMPONENT_MARKER_COLOURS } from "./markerTextures";

const SCALE = 0.1; // 1mm = 0.1 units

/** The fin colours the parts bin stocks, as the renderer needs them. */
const FIN_COLOUR_HEX: Record<string, string> = {
  "Royal Blue": "#2563eb",
  Black: "#1f2937",
  Yellow: "#facc15",
  Red: "#dc2626",
  White: "#f1f5f9",
};

/**
 * Animated Rocket Engine Exhaust Plume Shader Component
 */
/**
 * The water burn lasts about 30 ms, which is a frame and a half - far too quick
 * to read. So once the launch starts the flame is shown for `FLAME_S` and then
 * faded out, which is what a spectator actually perceives. The fade runs off the
 * render clock rather than React state so it costs no re-renders.
 */
const FLAME_S = 0.7;

function ExhaustPlume({ active = true }: { active?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startRef = useRef<number | null>(null);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_colorInner: { value: new THREE.Color("#fbbf24") }, // Bright orange/yellow
    u_colorOuter: { value: new THREE.Color("#ef4444") }, // Fiery red
    u_opacity: { value: 0.85 }
  }), []);

  const vertexShader = `
    uniform float u_time;
    varying vec2 vUv;
    varying float vNoise;

    // Simple noise generator
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Expand plume outward towards the bottom
      float expand = (1.0 - uv.y) * 0.8;
      
      // Animated turbulence displacement
      float n = noise(vec2(uv.x * 6.0, uv.y * 10.0 - u_time * 12.0));
      vNoise = n;

      pos.x += pos.x * expand + sin(uv.y * 20.0 - u_time * 15.0) * 0.15 * (1.0 - uv.y);
      pos.z += pos.z * expand + cos(uv.y * 20.0 - u_time * 15.0) * 0.15 * (1.0 - uv.y);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec3 u_colorInner;
    uniform vec3 u_colorOuter;
    uniform float u_opacity;
    varying vec2 vUv;
    varying float vNoise;

    void main() {
      // Flame core gradient: bright yellow at top (y=1), red fading out at bottom (y=0)
      float gradient = pow(vUv.y, 1.5);
      vec3 color = mix(u_colorOuter, u_colorInner, gradient + vNoise * 0.2);

      // Edge glow and pulsing intensity
      float alpha = gradient * u_opacity * (0.7 + 0.3 * sin(u_time * 25.0 + vNoise * 5.0));

      gl_FragColor = vec4(color, alpha);
    }
  `;

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (!active) { startRef.current = null; g.visible = false; return; }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;

    const age = state.clock.elapsedTime - startRef.current;
    const fade = Math.max(0, 1 - age / FLAME_S);
    g.visible = fade > 0.01;
    g.scale.setScalar(0.6 + 0.4 * fade);

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.u_time.value += delta;
      mat.uniforms.u_opacity.value = 0.85 * fade;
    }
    if (lightRef.current) {
      lightRef.current.intensity = (3 + Math.sin(state.clock.elapsedTime * 30) * 1.5) * fade;
    }
  });

  return (
    <group ref={groupRef} visible={false} position={[0, -25 * SCALE, 0]}>
      {/* Dynamic thrust light source */}
      <pointLight ref={lightRef} color="#f59e0b" intensity={4} distance={60 * SCALE} />

      {/* Fiery exhaust cone */}
      <mesh ref={meshRef} position={[0, -15 * SCALE, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[14 * SCALE, 3 * SCALE, 35 * SCALE, 32, 16, true]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Shock diamonds / inner high-temperature core */}
      <mesh position={[0, -10 * SCALE, 0]}>
        <coneGeometry args={[5 * SCALE, 20 * SCALE, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export function RocketModel({
  designOverride, hideUI = false, isLaunching = false, showMarkers = false,
}: {
  designOverride?: RocketDesign;
  hideUI?: boolean;
  isLaunching?: boolean;
  /** Draw the CG / CP rings that the stability panel talks about. */
  showMarkers?: boolean;
}) {
  const store = useRocketStore();
  const { propulsion: sp, recovery: sr, nose: sn, coneTube: sct, coneTransition: scr, fins: sf } = store;
  const source: RocketDesign = useMemo(
    () => designOverride ?? { propulsion: sp, recovery: sr, nose: sn, coneTube: sct, coneTransition: scr, fins: sf },
    [designOverride, sp, sr, sn, sct, scr, sf]
  );
  const visibility = hideUI ? {} : store.visibility;
  const analysis = useMemo(() => computeRocketMetrics(source), [source]);

  const { propulsion, nose, coneTube, coneTransition, fins } = source;
  const groupRef = useRef<THREE.Group>(null);

  // Bottle geometry comes from the same table the physics uses, so the model on
  // screen is the rocket the numbers describe.
  const bottleProps = useMemo(() => {
    const b = BOTTLE_INFO[propulsion.bottleSize] ?? BOTTLE_INFO["20oz_coke"];
    const tint: Record<string, { color: string; waterColor: string }> = {
      "20oz_coke": { color: "#1e3a8a", waterColor: "#60a5fa" },
      "1L": { color: "#1e3a8a", waterColor: "#3b82f6" },
      "2L_coke": { color: "#1e3a8a", waterColor: "#0284c7" },
      "2L_pepsi": { color: "#0ea5e9", waterColor: "#38bdf8" },
    };
    return {
      radius: (b.diameterMm / 2) * SCALE,
      height: b.bodyLengthMm * SCALE,
      volumeCm3: b.volumeCm3,
      ...(tint[propulsion.bottleSize] ?? tint["20oz_coke"]),
    };
  }, [propulsion.bottleSize]);

  // Dimensions
  const bottleR = bottleProps.radius;
  const bottleH = bottleProps.height;
  const transL = coneTransition.transitionLengthMm * SCALE;
  const tubeL = coneTube.lengthMm * SCALE;
  // The payload tube's diameter comes from its stock, so the model changes
  // shape when the material is switched - which is how the app explains it.
  const tubeR = ((TUBE_STOCK[coneTube.material]?.diameterMm ?? coneTube.diameterMm ?? 42) / 2) * SCALE;
  const noseL = nose.lengthMm * SCALE;
  const ballR = (nose.ballSizeMm / 2) * SCALE;

  // Materials with PBR Physical properties (Three.js Materials Skill)
  const bottleMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: bottleProps.color,
    transmission: 0.92,
    opacity: 1,
    metalness: 0.0,
    roughness: 0.05,
    ior: 1.52, // PET plastic index of refraction
    thickness: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  }), [bottleProps.color]);

  // Internal Water Fill Material
  const waterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: bottleProps.waterColor,
    transmission: 0.85,
    opacity: 0.8,
    metalness: 0.0,
    roughness: 0.1,
    ior: 1.333, // Water IOR
  }), [bottleProps.waterColor]);

  const tubeMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f8fafc",
    roughness: 0.35,
    metalness: 0.1,
  }), []);

  const transitionMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f59e0b",
    roughness: 0.4,
    metalness: 0.2,
  }), []);

  const noseMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ef4444",
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  }), []);

  const nozzleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#334155",
    roughness: 0.3,
    metalness: 0.8, // Machined aluminum nozzle
  }), []);

  // Fin colour is a design choice, so the model paints the stock the student picked.
  const finMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: FIN_COLOUR_HEX[fins.color] ?? "#2563eb",
    roughness: 0.35,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }), [fins.color]);

  // Positions (Y-axis up, starting from nozzle at Y=0)
  const bottleY = bottleH / 2;
  const transY = bottleH + transL / 2;
  const tubeY = bottleH + transL + tubeL / 2;
  const noseY = bottleH + transL + tubeL + noseL / 2;
  const ballY = bottleH + transL + tubeL + noseL;

  // The fin is extruded straight from the outline the student drew. Its own
  // coordinates are (span, station-from-tail), which is exactly the shape the
  // editor shows, so the 3D fin and the 2D drawing can never disagree.
  const finShape = useMemo(() => {
    // finOutline flattens curved edges, so a curved fin extrudes as the same
    // shape the editor draws and the physics measures.
    const pts = finOutline(fins);
    if (pts.length < 3) return null;
    const shape = new THREE.Shape();
    pts.forEach((p, i) => {
      const x = p.x * SCALE;      // outward from the body
      const y = p.y * SCALE;      // up the body from the tail
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.5, fins.thicknessMm) * SCALE,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.25 * SCALE,
      bevelThickness: 0.25 * SCALE,
    });
  }, [fins]);

  // Procedural Engine Vibration & Roll Stabilization (Three.js Animation Skill)
  useFrame((state) => {
    if (groupRef.current && isLaunching) {
      const time = state.clock.elapsedTime;
      // High-frequency motor jitter
      groupRef.current.position.x = (Math.random() - 0.5) * 0.4 * SCALE;
      groupRef.current.position.z = (Math.random() - 0.5) * 0.4 * SCALE;
      // Smooth aerodynamic roll response
      groupRef.current.rotation.y = Math.sin(time * 2) * 0.05;
    }
  });

  // Water level from the volume the student actually dialled in. This used to
  // read a `waterCapacityFraction` field that does not exist on the design, so
  // the bottle sat frozen at 40% no matter what was set.
  const waterFraction = Math.max(0, Math.min(1,
    (propulsion.waterVolumeL * 1000) / bottleProps.volumeCm3
  ));

  // The bottle is generated once per size, the water column whenever the fill
  // changes - both procedurally, so there is no model file to load.
  const bottleShell = useMemo(
    () => makeBottleBody(bottleR, bottleH, propulsion.bottleSize),
    [bottleR, bottleH, propulsion.bottleSize]
  );
  const bottleBase = useMemo(() => makePetaloidBase(bottleR, bottleH), [bottleR, bottleH]);
  // The marker balls' textures are drawn on a canvas once and reused.
  const cgTexture = useMemo(() => makeCheckerBallTexture("#111827", "#f8fafc"), []);
  const cpTexture = useMemo(() => makeCheckerBallTexture("#dc2626", "#f8fafc"), []);
  const finGeo = useMemo(() => finGeometry(fins), [fins]);

  /**
   * The transition, lathed from the bottle's base up to the payload tube. In the
   * hand-built rocket this cone is glued down over the petaloid base, so it
   * starts where the base begins and swallows the feet. Slight overshoot at each
   * end so there is no hairline gap against the bottle below or the tube above.
   */
  const transitionGeometry = useMemo(() => {
    const yBottom = baseStartFraction(propulsion.bottleSize) * bottleH;
    const yTop = bottleH + transL;
    if (yTop <= yBottom) return new THREE.BufferGeometry();
    const pts = [
      new THREE.Vector2(bottleR * 1.005, yBottom),
      new THREE.Vector2(bottleR * 0.92, yBottom + (yTop - yBottom) * 0.28),
      new THREE.Vector2(tubeR * 1.35, yBottom + (yTop - yBottom) * 0.72),
      new THREE.Vector2(tubeR * 1.02, yTop),
    ];
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.computeVertexNormals();
    return geo;
  }, [propulsion.bottleSize, bottleH, bottleR, tubeR, transL]);
  const waterGeometry = useMemo(
    () => makeWaterGeometry(bottleR, bottleH, propulsion.bottleSize, waterFraction),
    [bottleR, bottleH, propulsion.bottleSize, waterFraction]
  );

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      {/* Propulsion (Bottle) */}
      {visibility["propulsion"] !== false && (
        <group>
          {/* A real lathed PET bottle, flown upside down: its neck and support
              ring are at the tail because the mouth IS the nozzle. */}
          <mesh geometry={bottleShell} material={bottleMaterial} castShadow receiveShadow />

          {/* The petaloid base, five feet - at the top, under the nose section. */}
          <mesh geometry={bottleBase} material={bottleMaterial} castShadow receiveShadow />

          {/* Water follows the bottle's own inner wall, so its surface is always
              the right diameter for the height it has reached. */}
          {waterGeometry && <mesh geometry={waterGeometry} material={waterMaterial} />}

          {/* Machined Metal Nozzle, clamped onto the neck at the tail */}
          <mesh position={[0, -10 * SCALE, 0]} material={nozzleMaterial} castShadow>
            <cylinderGeometry args={[11 * SCALE, 15 * SCALE, 20 * SCALE, 32]} />
          </mesh>

          {/* Animated Thrust Exhaust Plume */}
          <ExhaustPlume active={isLaunching} />
        </group>
      )}

      {/* Cone Transition. In the hand-built rocket this cone is glued down over
          the bottle's shoulder, so it starts at the full body diameter where the
          shoulder begins and swallows the neck - it does not perch on top of it.
          Its upper edge still lands exactly where the physics puts the tube. */}
      {visibility["conetransition"] !== false && (
        <mesh geometry={transitionGeometry} material={transitionMaterial} castShadow receiveShadow />
      )}

      {/* Cone Tube */}
      {visibility["conetube"] !== false && (
        <mesh position={[0, tubeY, 0]} material={tubeMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[tubeR, tubeR, tubeL, 32]} />
        </mesh>
      )}

      {/* Nose */}
      {visibility["nose"] !== false && (
        <group>
          {/* Aerodynamic Nose Cone */}
          <mesh position={[0, noseY, 0]} material={noseMaterial} castShadow receiveShadow>
            <cylinderGeometry args={[ballR, tubeR, noseL, 32]} />
          </mesh>
          {/* Nose Clay Ballast Tip */}
          <mesh position={[0, ballY, 0]} material={noseMaterial} castShadow receiveShadow>
            <sphereGeometry args={[ballR, 32, 32]} />
          </mesh>
        </group>
      )}

      {/* Centre of gravity and centre of pressure, the two stations the
          stability panel compares. The physics measures them from the nose tip,
          while the model is built up from the nozzle, hence total - x. */}
      {showMarkers && (() => {
        const total = bottleH + transL + tubeL + noseL;
        const station = (xMm: number) => total - xMm * SCALE;
        const ballR = Math.max(bottleR, tubeR) * 0.34;
        const offset = Math.max(bottleR, tubeR) * 1.5;
        /** Where each component's own centre sits, for its station marker. */
        const stations: { key: string; y: number }[] = [
          { key: "propulsion", y: bottleY },
          { key: "conetransition", y: transY },
          { key: "conetube", y: tubeY },
          { key: "recovery", y: tubeY },
          { key: "nose", y: noseY },
          { key: "fins", y: station(analysis.bodyLengthMm - finGeo.rootLeadingStationMm) },
        ];
        return (
          <group>
            {/* Component stations, colour-matched to the sidebar. */}
            {stations.map((s) => (
              <mesh key={s.key} position={[offset * 0.72, s.y, 0]}>
                <sphereGeometry args={[ballR * 0.62, 20, 16]} />
                <meshStandardMaterial
                  color={COMPONENT_MARKER_COLOURS[s.key] ?? "#94a3b8"}
                  roughness={0.25}
                  metalness={0.35}
                />
              </mesh>
            ))}

            {/* Centre of gravity: the conventional quartered ball. */}
            <mesh position={[offset, station(analysis.cgDryMm), 0]}>
              <sphereGeometry args={[ballR, 32, 24]} />
              <meshStandardMaterial map={cgTexture} roughness={0.4} />
            </mesh>
            {/* Centre of pressure: the same ball in red and white. */}
            <mesh position={[offset, station(analysis.cpMm), 0]}>
              <sphereGeometry args={[ballR, 32, 24]} />
              <meshStandardMaterial map={cpTexture} roughness={0.4} />
            </mesh>
          </group>
        );
      })()}

      {/* Fins */}
      {visibility["fins"] !== false && finShape && (
        // The outline's y is already measured from the tail, so the fin group
        // sits at the tail and needs no offset of its own.
        <group>
          {Array.from({ length: Math.max(0, Math.round(fins.count)) }).map((_, i) => {
            const angle = (i * Math.PI * 2) / Math.max(1, fins.count);
            return (
              <group key={i} rotation={[0, angle, 0]}>
                <mesh
                  position={[bottleR * 0.94, 0, -(fins.thicknessMm / 2) * SCALE]}
                  geometry={finShape}
                  material={finMaterial}
                  castShadow
                  receiveShadow
                />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
