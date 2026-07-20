"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

export function DetailedLaunchPad({ position }: { position: [number, number, number] }) {
  // Enhanced PBR Materials (Three.js Materials Skill)
  const padMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0f172a",
    roughness: 0.7,
    metalness: 0.5,
  }), []);

  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f8fafc",
    roughness: 0.2,
    metalness: 0.1,
  }), []);

  const towerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#dc2626",
    roughness: 0.4,
    metalness: 0.3,
  }), []);

  const yellowMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#eab308",
    roughness: 0.3,
    metalness: 0.2,
  }), []);

  const steelRailMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#94a3b8",
    roughness: 0.2,
    metalness: 0.9, // Brushed steel rails
  }), []);

  const statusLedGreen = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#22c55e",
  }), []);

  return (
    <group position={position}>
      {/* Octagonal Heavy Base */}
      <mesh position={[0, 1, 0]} receiveShadow castShadow material={padMaterial}>
        <cylinderGeometry args={[12, 14, 2, 8]} />
      </mesh>

      {/* Safety Trim ring around the launch pad base */}
      <mesh position={[0, 2.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11.2, 12, 8]} />
        <primitive object={trimMaterial} attach="material" />
      </mesh>

      {/* Central Launch Stand Support */}
      <mesh position={[0, 3, 0]} receiveShadow castShadow material={towerMaterial}>
        <cylinderGeometry args={[2.2, 2.8, 2, 8]} />
      </mesh>

      {/* Heavy Precision Steel Launch Guide Rails */}
      {[-1.2, 1.2].map((xOffset, i) => (
        <group key={i} position={[xOffset, 8, 0]}>
          <mesh receiveShadow castShadow material={towerMaterial}>
            <boxGeometry args={[0.6, 10, 0.6]} />
          </mesh>
          {/* Inner smooth steel guide track */}
          <mesh position={[-xOffset * 0.2, 0, 0.35]} material={steelRailMaterial}>
            <boxGeometry args={[0.2, 10, 0.1]} />
          </mesh>
        </group>
      ))}

      {/* Rear Support Truss */}
      <mesh position={[0, 8, -1.2]} receiveShadow castShadow material={towerMaterial}>
        <boxGeometry args={[0.6, 10, 0.6]} />
      </mesh>

      {/* Pneumatic Quick-Release Clamp Bracket holding the rocket */}
      <mesh position={[0, 10, 0]} receiveShadow castShadow material={yellowMaterial} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.25, 16, 32]} />
      </mesh>

      {/* Status Readiness Indicators */}
      {[-2, 2].map((x, i) => (
        <mesh key={i} position={[x, 2.2, 4]} material={statusLedGreen}>
          <sphereGeometry args={[0.2, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}
