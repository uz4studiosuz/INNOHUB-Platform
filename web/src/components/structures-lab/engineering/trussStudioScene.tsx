"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * The one bridge-viewing environment, shared by the Engineering viewport and
 * the Competition arena.
 *
 * These were two separate scenes before: Engineering showed a clean dark
 * studio, Competition showed a daylit stadium bowl with a dirt floor and a
 * crowd. The same bridge therefore looked like two different objects - the
 * timber-forced arena version in particular hid the material the student had
 * actually chosen. Both now render the structure identically; only the load
 * test that happens on top of it differs.
 */

export const STUDIO_BG = "#17212b";

/** Image-based lighting. Directional lights alone leave metal looking like
 * plastic - what reads as metal is a reflected environment. Generated from
 * three's own procedural room, so nothing is fetched over the network. */
export function StudioEnvironment() {
  const gl = useThree((state) => state.gl);

  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    return texture;
  }, [gl]);

  useEffect(() => () => envMap.dispose(), [envMap]);

  // attach="environment" hands this to the parent (the scene) declaratively
  // and detaches it again when the component unmounts.
  return <primitive attach="environment" object={envMap} />;
}

/**
 * Lights, ground, grid and contact shadows, all scaled to the truss's own
 * bounding radius so a 4 m bridge and a 40 cm model frame identically.
 */
export function StudioStage({ radius, floorY }: { radius: number; floorY?: number }) {
  const groundY = floorY ?? -radius * 1.08;

  return (
    <>
      <color attach="background" args={[STUDIO_BG]} />
      <fog attach="fog" args={[STUDIO_BG, radius * 5.5, radius * 15]} />

      <StudioEnvironment />

      {/* Flat fill stays low on purpose: the environment map above already
          lights every surface from every side, and piling ambient on top of
          it is what washes the shadows out and flattens the structure. */}
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#e3f1ec", "#293136", 0.42]} />
      <directionalLight
        position={[radius * 2.5, radius * 4, radius * 2]}
        intensity={2.35}
        color="#fff8ea"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={radius * 12}
        // A directional light's shadow camera is orthographic and defaults to
        // a 10-unit box; on anything but a tiny truss most of the bridge falls
        // outside it and casts no shadow at all.
        shadow-camera-left={-radius * 3}
        shadow-camera-right={radius * 3}
        shadow-camera-top={radius * 3}
        shadow-camera-bottom={-radius * 3}
        shadow-bias={-0.00015}
      />
      <directionalLight position={[-radius * 2.2, radius * 1.5, radius]} intensity={0.72} color="#b9d9ff" />
      <directionalLight position={[0, radius * 2, -radius * 3]} intensity={0.46} color="#d9eee7" />

      <mesh position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[radius * 14, radius * 14]} />
        <meshStandardMaterial color="#222c31" roughness={0.96} metalness={0.02} />
      </mesh>
      <gridHelper args={[radius * 9, 40, "#397565", "#2a3a40"]} position={[0, groundY + 0.005, 0]} />
      <ContactShadows
        frames={1}
        position={[0, groundY + 0.015, 0]}
        opacity={0.38}
        scale={radius * 6}
        blur={2.6}
        far={radius * 4}
        color="#09100e"
      />
    </>
  );
}
