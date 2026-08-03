"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGliderStore } from "../../store/gliderStore";

export function WindTunnel() {
  const pointsRef = useRef<THREE.Points>(null);
  const { wing, fuselage } = useGliderStore();
  
  const SCALE = 0.1;
  const wSpan = wing.span * SCALE;
  const wChord = wing.chord * SCALE;
  const fuseLen = fuselage.length * SCALE;
  const noseZ = -fuseLen / 2;
  const wPosZ = noseZ + wing.leadingEdgeXOffset * SCALE + wChord / 2;
  
  const alpha = 5; // Angle of attack (degrees)
  // 18k points remain visually dense while avoiding the large upload and
  // fragment cost that made analysis mode stutter on integrated GPUs.
  const count = 18000;
  
  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    const seeded = (index: number, salt: number) => {
      const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (seeded(i, 1) - 0.5) * 160;
      pos[i * 3 + 1] = (seeded(i, 2) - 0.5) * 65;
      pos[i * 3 + 2] = (seeded(i, 3) - 0.5) * 220;
      
      rand[i * 3 + 0] = seeded(i, 4);
      rand[i * 3 + 1] = seeded(i, 5);
      rand[i * 3 + 2] = seeded(i, 6);
    }
    return [pos, rand];
  }, []);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_speed: { value: 85.0 },
    u_wingSpan: { value: wSpan },
    u_wingChord: { value: wChord },
    u_wingPositionZ: { value: wPosZ },
    u_angle: { value: 0.0 },
  }), [wSpan, wChord, wPosZ]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      if (mat && mat.uniforms) {
        mat.uniforms.u_time.value += delta;
        mat.uniforms.u_wingSpan.value = wSpan;
        mat.uniforms.u_wingChord.value = wChord;
        mat.uniforms.u_wingPositionZ.value = wPosZ;
        mat.uniforms.u_angle.value = (alpha * Math.PI) / 180;
      }
    }
  });

  const vertexShader = `
    uniform float u_time;
    uniform float u_speed;
    uniform float u_wingSpan;
    uniform float u_wingChord;
    uniform float u_wingPositionZ;
    uniform float u_angle;

    attribute vec3 a_random;

    varying float vPressure;
    varying float vDistance;

    void main() {
      vec3 pos = position;

      // 1. Wind Tunnel Z-axis Flow
      float speed = u_speed * (0.85 + 0.3 * a_random.x);
      float minZ = -110.0;
      float maxZ = 110.0;
      float rangeZ = maxZ - minZ;
      
      float zOffset = u_time * speed;
      pos.z = mod(pos.z - minZ + zOffset, rangeZ) + minZ;

      float halfSpan = u_wingSpan * 0.5;
      float halfChord = u_wingChord * 0.5;
      
      float isWithinSpan = step(abs(pos.x), halfSpan + 8.0);

      // Rotate around angle of attack (Z-Y plane)
      float dz = pos.z - u_wingPositionZ;
      float dy = pos.y;
      
      float cosA = cos(u_angle);
      float sinA = sin(u_angle);
      
      float localZ = dz * cosA + dy * sinA;
      float localY = -dz * sinA + dy * cosA;

      float pressure = 0.0;

      // 2. Airfoil Deflection & Tip Vortices (Three.js Shaders Skill)
      if (isWithinSpan > 0.5) {
        float tChord = localZ / halfChord;

        if (tChord > -1.8 && tChord < 2.5) {
          float xNorm = (tChord + 1.8) / 4.3;
          float thicknessProfile = u_wingChord * 0.15 * sin(xNorm * 3.14159) * (1.2 - xNorm * 0.4);

          float spanDecay = smoothstep(halfSpan + 8.0, halfSpan - 4.0, abs(pos.x));
          float surfaceOffset = abs(localY) - (thicknessProfile * 0.3);
          float yDecay = exp(-abs(surfaceOffset) * 0.22);

          float shapeDeflection = thicknessProfile * yDecay * spanDecay;
          float side = sign(localY);
          if (abs(localY) < 0.1) {
            side = (a_random.z > 0.5) ? 1.0 : -1.0;
          }
          localY += side * shapeDeflection;

          // Lift-induced downwash
          float circulationGlow = u_angle * halfChord * 0.85 * yDecay * spanDecay;
          float washFactor = (tChord < -1.0) ? (tChord + 1.8) * 0.5 : (0.9 - 0.4 * (tChord + 1.0) * exp(-(tChord - 1.0) * 0.4));
          localY += circulationGlow * washFactor;

          // Wingtip Vortex Swirl Simulation behind wingtips (x ≈ ±halfSpan)
          float distToTip = abs(abs(pos.x) - halfSpan);
          if (distToTip < 12.0 && tChord > 0.5) {
            float vortexFactor = smoothstep(12.0, 0.0, distToTip) * exp(-(tChord - 0.5) * 0.3);
            float angleVortex = (tChord - 0.5) * 4.0 + u_time * 10.0;
            localY += sin(angleVortex) * 2.5 * vortexFactor;
            pos.x += cos(angleVortex) * 2.5 * vortexFactor * sign(pos.x);
          }

          // Aerodynamic Pressure heat map values
          float leadEdgeDist = length(vec2(localZ + halfChord, localY));
          float stagnationPress = exp(-leadEdgeDist * 0.35) * 1.6;
          float liftPress = (localY < 0.0) ? clamp(-localY * u_angle * 0.3 * spanDecay, 0.0, 1.0) : 0.0;

          pressure = clamp(stagnationPress + liftPress, 0.0, 1.0);
        }
      }

      // 3. Stagnation Pressure at Fuselage Nose
      float fuseNoseZ = -50.0;
      float fuseDistToNose = length(vec3(pos.x, pos.y + 2.0, pos.z - fuseNoseZ));
      if (fuseDistToNose < 14.0) {
        pressure = max(pressure, exp(-fuseDistToNose * 0.22));
      }

      // 4. Deflection around Fuselage
      float fuseRadius = 5.0;
      float distToFuseAxis = length(vec2(pos.x, pos.y + 2.0));
      if (pos.z > -50.0 && pos.z < 50.0 && distToFuseAxis < 11.0) {
        float radialFactor = smoothstep(11.0, fuseRadius, distToFuseAxis);
        vec2 radialDir = normalize(vec2(pos.x, pos.y + 2.0) + vec2(0.001, 0.001));
        pos.x += radialDir.x * (11.0 - distToFuseAxis) * radialFactor;
        pos.y += radialDir.y * (11.0 - distToFuseAxis) * radialFactor;
      }

      pos.y = localY * cosA + localZ * sinA;
      pos.z = -localY * sinA + localZ * cosA + u_wingPositionZ;

      vPressure = pressure;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      gl_PointSize = (11.0 + 6.0 * a_random.y) * (260.0 / -mvPosition.z);
      vDistance = -mvPosition.z;
    }
  `;

  const fragmentShader = `
    varying float vPressure;
    varying float vDistance;

    vec3 getPressureColor(float p) {
      vec3 blue = vec3(0.0, 0.45, 1.0);
      vec3 green = vec3(0.0, 1.0, 0.5);
      vec3 yellow = vec3(1.0, 0.85, 0.0);
      vec3 red = vec3(1.0, 0.1, 0.1);
      
      if (p < 0.25) {
        return mix(blue, green, p / 0.25);
      } else if (p < 0.6) {
        return mix(green, yellow, (p - 0.25) / 0.35);
      } else {
        return mix(yellow, red, (p - 0.6) / 0.4);
      }
    }

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float glow = smoothstep(0.5, 0.1, dist);
      vec3 color = getPressureColor(vPressure);
      float alpha = glow * (0.35 + 0.65 * vPressure);

      if (vDistance < 6.0) {
        alpha *= smoothstep(0.0, 6.0, vDistance);
      }

      gl_FragColor = vec4(color, alpha);
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-a_random" args={[randoms, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  );
}
