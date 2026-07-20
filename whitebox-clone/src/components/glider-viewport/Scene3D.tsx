"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useGliderStore } from "@/store/gliderStore";

// The internal Glider model mesh component
function GliderMesh() {
  const { wing } = useGliderStore();

  // Convert mm specifications to 3D units for a standard screen view
  // 1 unit in 3D = 100mm (e.g. 200mm = 2.0 units)
  const spanScale = wing.span / 100;
  const chordScale = wing.chord / 100;
  
  // Left/Right wing dimensions
  const halfSpan = spanScale / 2;
  const wingThickness = 0.04;
  
  // Dihedral angle in radians
  const radDihedral = (wing.dihedralAngle * Math.PI) / 180;

  return (
    <group position={[0, 0, 0]}>
      {/* Fuselage / Korpus */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.15, 2.5]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Horizontal Stabilizer (Tail) */}
      <mesh position={[0, 0.1, -1.0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.02, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>

      {/* Vertical Stabilizer (Fin) */}
      <mesh position={[0, 0.25, -1.1]} castShadow receiveShadow>
        <boxGeometry args={[0.02, 0.4, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>

      {/* Wings group (positioned slightly above fuselage) */}
      <group position={[0, 0.08, 0.3]}>
        
        {/* Left Wing (rotated upwards on the left side) */}
        <group position={[0, 0, 0]} rotation={[0, 0, radDihedral]}>
          <mesh position={[-halfSpan / 2, 0, 0]} castShadow>
            <boxGeometry args={[halfSpan, wingThickness, chordScale]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.5} metalness={0.1} />
          </mesh>
        </group>

        {/* Right Wing (rotated upwards on the right side) */}
        <group position={[0, 0, 0]} rotation={[0, 0, -radDihedral]}>
          <mesh position={[halfSpan / 2, 0, 0]} castShadow>
            <boxGeometry args={[halfSpan, wingThickness, chordScale]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.5} metalness={0.1} />
          </mesh>
        </group>
        
      </group>
    </group>
  );
}

export default function Scene3D() {
  return (
    <div className="w-full h-full relative bg-[#090d16] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] shadow-2xl">
      <Canvas
        camera={{ position: [3, 2.5, 4], fov: 45 }}
        shadows
      >
        {/* Scene Background Color */}
        <color attach="background" args={["#090d16"]} />

        {/* CAD Grid layout */}
        <Grid 
          position={[0, -0.6, 0]} 
          args={[10.5, 10.5]}
          cellSize={0.5}
          cellThickness={1}
          cellColor="#1e293b"
          sectionSize={2.0}
          sectionThickness={1.5}
          sectionColor="#334155"
          fadeDistance={30}
        />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 7]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        {/* Core Model Mesh */}
        <GliderMesh />

        {/* Camera interaction */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
export { GliderMesh };
