"use client";

import React, { useMemo, useRef } from "react";
import { useRocketStore } from "../../store/rocketStore";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const SCALE = 0.1; // 1mm = 0.1 units

/**
 * Animated Rocket Engine Exhaust Plume Shader Component
 */
function ExhaustPlume({ active = true, scale = 1 }: { active?: boolean; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

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
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.u_time.value += delta;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 30) * 1.5;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, -25 * SCALE, 0]}>
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

export function RocketModel({ designOverride, hideUI = false, isLaunching = false }: { designOverride?: any; hideUI?: boolean; isLaunching?: boolean }) {
  const store = useRocketStore();
  const source = designOverride || store;
  const visibility = hideUI ? {} : store.visibility;

  const { propulsion, nose, coneTube, coneTransition, fins } = source;
  const groupRef = useRef<THREE.Group>(null);

  // Geometry properties based on bottle size
  const bottleProps = useMemo(() => {
    switch (propulsion.bottleSize) {
      case "1L": return { radius: 42 * SCALE, height: 200 * SCALE, color: "#1e3a8a", waterColor: "#3b82f6" };
      case "2L_coke": return { radius: 55 * SCALE, height: 280 * SCALE, color: "#1e3a8a", waterColor: "#0284c7" };
      case "2L_pepsi": return { radius: 55 * SCALE, height: 280 * SCALE, color: "#0ea5e9", waterColor: "#38bdf8" };
      case "20oz_coke":
      default: return { radius: 35 * SCALE, height: 160 * SCALE, color: "#1e3a8a", waterColor: "#60a5fa" };
    }
  }, [propulsion.bottleSize]);

  // Dimensions
  const bottleR = bottleProps.radius;
  const bottleH = bottleProps.height;
  const transL = coneTransition.transitionLengthMm * SCALE;
  const tubeL = coneTube.lengthMm * SCALE;
  const tubeR = (coneTube.diameterMm / 2) * SCALE;
  const noseL = 50 * SCALE;
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

  const finMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#facc15",
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }), []);

  // Positions (Y-axis up, starting from nozzle at Y=0)
  const bottleY = bottleH / 2;
  const transY = bottleH + transL / 2;
  const tubeY = bottleH + transL + tubeL / 2;
  const noseY = bottleH + transL + tubeL + noseL / 2;
  const ballY = bottleH + transL + tubeL + noseL;

  // Extruded Fin Geometry with Bevels (Three.js Geometry Skill)
  const finGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const rootC = fins.rootChordMm * SCALE;
    const tipC = fins.tipChordMm * SCALE;
    const span = fins.spanMm * SCALE;
    const sweep = fins.sweepMm * SCALE;

    shape.moveTo(0, 0);
    shape.lineTo(0, rootC);
    shape.lineTo(span, rootC - sweep);
    shape.lineTo(span, rootC - sweep - tipC);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: 2 * SCALE,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.3 * SCALE,
      bevelThickness: 0.3 * SCALE,
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

  // Calculate water height based on propulsion water fraction
  const waterFraction = (propulsion.waterCapacityFraction || 40) / 100;
  const waterH = bottleH * waterFraction;

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      {/* Propulsion (Bottle) */}
      {visibility["propulsion"] !== false && (
        <group>
          {/* Outer Translucent Bottle Mesh */}
          <mesh position={[0, bottleY, 0]} material={bottleMaterial} castShadow receiveShadow>
            <cylinderGeometry args={[bottleR, bottleR, bottleH, 32]} />
          </mesh>

          {/* Inner Water Fill Level */}
          <mesh position={[0, waterH / 2, 0]} material={waterMaterial}>
            <cylinderGeometry args={[bottleR * 0.97, bottleR * 0.97, waterH, 32]} />
          </mesh>

          {/* Machined Metal Nozzle */}
          <mesh position={[0, -10 * SCALE, 0]} material={nozzleMaterial} castShadow>
            <cylinderGeometry args={[11 * SCALE, 15 * SCALE, 20 * SCALE, 32]} />
          </mesh>

          {/* Animated Thrust Exhaust Plume */}
          <ExhaustPlume active={isLaunching} scale={SCALE} />
        </group>
      )}

      {/* Cone Transition */}
      {visibility["conetransition"] !== false && (
        <mesh position={[0, transY, 0]} material={transitionMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[tubeR, bottleR, transL, 32]} />
        </mesh>
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

      {/* Fins */}
      {visibility["fins"] !== false && (
        <group position={[0, bottleH * 0.2, 0]}>
          {Array.from({ length: fins.count }).map((_, i) => {
            const angle = (i * Math.PI * 2) / fins.count;
            return (
              <group key={i} rotation={[0, angle, 0]}>
                <mesh
                  position={[bottleR, 0, -1 * SCALE]}
                  geometry={finGeometry}
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
