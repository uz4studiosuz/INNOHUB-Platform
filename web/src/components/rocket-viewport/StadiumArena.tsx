"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Grid, Sky } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export function StadiumArena() {
  // Ground Texture/Material (Dirt/Sand color with realistic roughness)
  const groundMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: "#a18a66",
    roughness: 0.95,
    metalness: 0.05,
  }), []);

  // Mountains Background with elevation variations. The variation comes from a
  // seeded hash rather than Math.random: the same skyline has to come back on
  // every render, and an impure call here is a React rules violation.
  const mountains = useMemo(() => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: "#3f4a28", roughness: 0.85 });
    const jitter = (i: number, salt: number) => {
      const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    for (let i = 0; i < 16; i++) {
      const angle = Math.PI + (i / 15) * Math.PI;
      const radius = 420 + jitter(i, 1) * 80;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 100;
      const height = 90 + jitter(i, 2) * 110;
      const radiusBase = 110 + jitter(i, 3) * 40;

      const geo = new THREE.ConeGeometry(radiusBase, height, 10);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, height / 2 - 10, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }, []);

  // Stadium Seating (Bleachers)
  const bleachers = useMemo(() => {
    const group = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.8 });
    const seatsMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.9 });

    for (let i = -2; i <= 2; i++) {
      const block = new THREE.Group();
      
      const geo = new THREE.BoxGeometry(80, 40, 40);
      const mesh = new THREE.Mesh(geo, concreteMat);
      mesh.rotation.x = -Math.PI / 6;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const topGeo = new THREE.BoxGeometry(78, 41, 38);
      const topMesh = new THREE.Mesh(topGeo, seatsMat);
      topMesh.rotation.x = -Math.PI / 6;

      block.add(mesh);
      block.add(topMesh);
      block.position.set(i * 85, 10, -80);
      
      const angle = i * 0.1;
      block.rotation.y = -angle;
      block.position.z += Math.abs(i) * 5;

      group.add(block);
    }

    return group;
  }, []);

  // High-Intensity Stadium Floodlight Towers
  const lights = useMemo(() => {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.4, metalness: 0.8 });
    const panelMat = new THREE.MeshBasicMaterial({ color: "#ffffff" }); // Emissive glowing white panel for bloom effect

    const createLight = (x: number, z: number, rotY: number) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 80, 12), poleMat);
      pole.position.y = 40;
      pole.castShadow = true;
      g.add(pole);
      
      const panel = new THREE.Mesh(new THREE.BoxGeometry(32, 16, 2), panelMat);
      panel.position.y = 80;
      panel.position.z = 2;
      g.add(panel);

      const spotLight = new THREE.SpotLight(0xffffff, 3, 250, Math.PI / 4, 0.5, 2);
      spotLight.position.set(0, 80, 5);
      spotLight.castShadow = true;
      g.add(spotLight);

      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      return g;
    };

    group.add(createLight(-130, -100, Math.PI / 8));
    group.add(createLight(130, -100, -Math.PI / 8));

    return group;
  }, []);

  return (
    <group>
      {/* Dynamic Sky & Environment Lighting (Three.js Lighting Skill) */}
      <Sky sunPosition={[100, 40, 100]} turbidity={0.1} rayleigh={0.6} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#87ceeb", "#5c4033", 0.6]} />

      <directionalLight
        position={[100, 200, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0001}
      />

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <planeGeometry args={[2000, 2000]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>

      <Grid infiniteGrid fadeDistance={600} sectionColor="#8b7355" cellColor="#a18a66" position={[0, 0.01, 0]} />

      {/* Scenery Elements */}
      <primitive object={mountains} />
      <primitive object={bleachers} />
      <primitive object={lights} />

      {/* Postprocessing Stack: Bloom & Vignette (Three.js Postprocessing Skill) */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.3} intensity={0.6} />
        <Vignette eskil={false} offset={0.2} darkness={0.6} />
      </EffectComposer>
    </group>
  );
}
