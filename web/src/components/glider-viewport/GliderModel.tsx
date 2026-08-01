"use client";

import React, { useRef, useState, useMemo } from "react";
import { useGliderStore, GliderShape } from "../../store/gliderStore";
import { Html } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Scale factor: 1mm = 0.1 units in 3D space
const SCALE = 0.1;

// WhiteBox-style wood color palette
const WOOD_COLOR = "#c9a66b";    // balsa wood base
const WOOD_DARK  = "#a67c52";    // slightly darker grain
const NOSE_COLOR = "#cc3333";    // red nose weight (clay ballast marker)

/**
 * Creates an airfoil-shaped cross-section using NACA 4-digit-like profile
 */
function createAirfoilShape(chord: number, thickness: number): THREE.Shape {
  const shape = new THREE.Shape();
  const steps = 40;

  // Upper surface
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * chord;
    // NACA symmetric thickness distribution (simplified)
    const yt = thickness * (
      0.2969 * Math.sqrt(t) -
      0.126  * t -
      0.3516 * t * t +
      0.2843 * t * t * t -
      0.1015 * t * t * t * t
    );
    if (i === 0) shape.moveTo(x - chord / 2, yt);
    else shape.lineTo(x - chord / 2, yt);
  }

  // Lower surface (reverse direction)
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = t * chord;
    const yt = thickness * (
      0.2969 * Math.sqrt(t) -
      0.126  * t -
      0.3516 * t * t +
      0.2843 * t * t * t -
      0.1015 * t * t * t * t
    );
    shape.lineTo(x - chord / 2, -yt);
  }

  shape.closePath();
  return shape;
}

/**
 * Creates a tapered fuselage shape (top-down cross-section)
 */
function createFuselageShape(length: number, noseH: number, bodyH: number, rearH: number): THREE.Shape {
  const shape = new THREE.Shape();
  const halfLen = length / 2;

  // Start at nose tip (front)
  shape.moveTo(-halfLen, 0);

  // Upper curve: nose → body → rear
  shape.bezierCurveTo(
    -halfLen * 0.6, bodyH / 2,
    -halfLen * 0.2, bodyH / 2,
    0, bodyH / 2
  );
  shape.bezierCurveTo(
    halfLen * 0.3, bodyH / 2,
    halfLen * 0.7, rearH / 2,
    halfLen, rearH / 4
  );

  // Rear end
  shape.lineTo(halfLen, -rearH / 4);

  // Lower curve: rear → body → nose
  shape.bezierCurveTo(
    halfLen * 0.7, -rearH / 2,
    halfLen * 0.3, -bodyH / 2,
    0, -bodyH / 2
  );
  shape.bezierCurveTo(
    -halfLen * 0.2, -bodyH / 2,
    -halfLen * 0.6, -noseH / 2,
    -halfLen, 0
  );

  shape.closePath();
  return shape;
}

function createTailGeometry(
  span: number, chord: number, shape: string = "rectangular", sandingLevel: string = "none", isVertical: boolean = false
) {
  const thickness = chord * 0.12;
  const airfoilShape = createAirfoilShape(chord, thickness);
  const extrudeSettings = {
    steps: 20,
    depth: span / (isVertical ? 1 : 2),
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
  };
  const geom = new THREE.ExtrudeGeometry(airfoilShape, extrudeSettings);
  
  const positions = geom.attributes.position;
  const sandingScale = ({ none: 1.0, light: 0.9, medium: 0.8, heavy: 0.7 } as Record<string, number>)[sandingLevel] || 1.0;
  const fullSpan = span / (isVertical ? 1 : 2);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    const t = z / fullSpan;
    
    let taperScale = 1.0;
    if (shape === "tapered") taperScale = 1.0 - 0.5 * t;
    else if (shape === "elliptical") taperScale = Math.sqrt(Math.max(0, 1 - t * t));
    
    positions.setXYZ(i, x * taperScale, y * taperScale * sandingScale, z);
  }
  geom.computeVertexNormals();
  return geom;
}

function createMaterial(color: string | undefined, sandingLevel: string | undefined, isHovered: boolean = false) {
  let baseColor = WOOD_COLOR;
  let roughness = 0.7;
  
  if (sandingLevel === "none") roughness = 0.9;
  if (sandingLevel === "light") roughness = 0.7;
  if (sandingLevel === "medium") roughness = 0.5;
  if (sandingLevel === "heavy") roughness = 0.3;

  if (color === "painted_red") baseColor = "#ef4444";
  if (color === "painted_blue") baseColor = "#3b82f6";
  if (color === "painted_white") baseColor = "#f8fafc";
  
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: roughness,
    metalness: 0.0,
    emissive: isHovered ? "#38bdf8" : "#000000",
    emissiveIntensity: isHovered ? 0.35 : 0.0,
  });
}

function DimensionLine({ start, end, label, color = "#f5a623", offset = 0 }: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  color?: string;
  offset?: number;
}) {
  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + offset,
    (start[2] + end[2]) / 2,
  ];

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([...start, ...end]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>

      {[start, end].map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}

      <Html position={midPoint} center zIndexRange={[100, 0]}>
        <div style={{
          background: "rgba(0, 0, 0, 0.85)",
          color: color,
          padding: "2px 6px",
          borderRadius: 3,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          border: `1px solid ${color}40`,
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

export function GliderModel({ designOverride, hideUI = false }: { designOverride?: GliderShape; hideUI?: boolean }) {
  const store = useGliderStore();
  const source = designOverride || store;
  const fuselage = source.fuselage;
  const wing = source.wing;
  const horizontalStabilizer = source.horizontalStabilizer;
  const verticalStabilizer = source.verticalStabilizer;
  const activePanel = hideUI ? null : store.activePanel;
  const visibility = hideUI ? {} : store.visibility;

  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredLeft, setHoveredLeft] = useState(false);
  const [hoveredRight, setHoveredRight] = useState(false);

  const gliderGroupRef = useRef<THREE.Group>(null);

  // Drag state
  const dragState = useRef({
    active: false,
    startX: 0,
    startSpan: 0,
    side: "none" as "left" | "right" | "none"
  });

  const isWingActive = activePanel === "wing";
  const showWingOverlay = isWingActive && visibility["wing"];
  const showDimensions = activePanel === "wing" || activePanel === "fuselage" || activePanel === "h-stab" || activePanel === "v-stab";

  const onPointerDown = (e: ThreeEvent<PointerEvent>, side: "left" | "right") => {
    if (!isWingActive) return;
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.setPointerCapture) target.setPointerCapture(e.pointerId);

    dragState.current = {
      active: true,
      startX: e.clientX,
      startSpan: wing.span,
      side
    };
    document.body.style.cursor = "ew-resize";
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState.current.active) return;
    e.stopPropagation();

    const dx = e.clientX - dragState.current.startX;
    const sensitivity = 0.5;

    let newSpan = dragState.current.startSpan;
    if (dragState.current.side === "right") {
      newSpan += dx * sensitivity * 2;
    } else if (dragState.current.side === "left") {
      newSpan -= dx * sensitivity * 2;
    }

    newSpan = Math.max(50, Math.min(300, newSpan));
    store.updateWing({ span: newSpan });
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState.current.active) return;
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target.releasePointerCapture) target.releasePointerCapture(e.pointerId);

    dragState.current.active = false;
    dragState.current.side = "none";
    document.body.style.cursor = "auto";
  };

  // Convert mm to visual scale
  const fuseLen = fuselage.length * SCALE;
  const fuseNoseH = fuselage.noseHeight * SCALE;
  const fuseBodyH = fuselage.bodyHeight * SCALE;
  const fuseRearH = fuselage.rearHeight * SCALE;

  const wSpan = wing.span * SCALE;
  const wChord = wing.chord * SCALE;
  const wDihedralRad = (wing.dihedral * Math.PI) / 180;

  // Position offsets
  const noseZ = -fuseLen / 2;
  const wingZ = noseZ + wing.leadingEdgeXOffset * SCALE + wChord / 2;

  const hStabSpan = horizontalStabilizer.span * SCALE;
  const hStabChord = horizontalStabilizer.chord * SCALE;
  const hStabZ = fuseLen / 2 - hStabChord / 2;

  const vStabHeight = verticalStabilizer.height * SCALE;
  const vStabChord = verticalStabilizer.chord * SCALE;
  const vStabZ = fuseLen / 2 - vStabChord / 2;

  // Create NACA-style airfoil geometry with Bevel & Dihedral (Three.js Geometry Skill)
  const wingGeometry = useMemo(() => {
    const airfoilShape = createAirfoilShape(wChord, wChord * 0.15);
    const extrudeSettings = {
      steps: 40,
      depth: wSpan / 2,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.3,
    };
    const geom = new THREE.ExtrudeGeometry(airfoilShape, extrudeSettings);
    
    const positions = geom.attributes.position;
    const halfSpan = wSpan / 2;
    const innerSpan = halfSpan * 0.7;
    const tipDihedralRad = (wing.tipDihedral * Math.PI) / 180;
    const dihedralRad = (wing.dihedral * Math.PI) / 180;
    const isTipDihedral = wing.dihedralType === "tipDihedral";
    const sandingScale = ({ none: 1.0, light: 0.9, medium: 0.8, heavy: 0.7 } as Record<string, number>)[wing.sandingLevel] || 1.0;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const t = z / halfSpan;
      
      let taperScale = 1.0;
      if (wing.shape === "tapered") {
        taperScale = 1.0 - 0.5 * t;
      } else if (wing.shape === "elliptical") {
        taperScale = Math.sqrt(Math.max(0, 1 - t * t));
      }
      
      let newX = x * taperScale;
      let newY = y * taperScale * sandingScale;
      let newZ = z;

      let dihedralRise = Math.tan(dihedralRad) * z;
      if (isTipDihedral && z > innerSpan) {
        const dz = z - innerSpan;
        dihedralRise = Math.tan(dihedralRad) * innerSpan + Math.tan(tipDihedralRad) * dz;
      }
      newY += dihedralRise;

      positions.setXYZ(i, newX, newY, newZ);
    }
    geom.computeVertexNormals();
    return geom;
  }, [wChord, wSpan, wing.shape, wing.dihedralType, wing.dihedral, wing.tipDihedral, wing.sandingLevel]);

  // Fuselage Geometry
  const fuselageGeometry = useMemo(() => {
    const fuseShape = createFuselageShape(fuseLen, fuseNoseH, fuseBodyH, fuseRearH);
    const extrudeSettings = {
      steps: 1,
      depth: fuseBodyH * 0.6,
      bevelEnabled: true,
      bevelThickness: fuseBodyH * 0.15,
      bevelSize: fuseBodyH * 0.1,
      bevelSegments: 3,
    };
    return new THREE.ExtrudeGeometry(fuseShape, extrudeSettings);
  }, [fuseLen, fuseNoseH, fuseBodyH, fuseRearH]);

  // Materials with Interactive Glow Highlight (Three.js Materials & Interaction Skills)
  const woodMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: WOOD_COLOR,
    roughness: 0.6,
    metalness: 0.05,
    emissive: hoveredComponent === "fuselage" || activePanel === "fuselage" ? "#38bdf8" : "#000000",
    emissiveIntensity: hoveredComponent === "fuselage" || activePanel === "fuselage" ? 0.35 : 0.0,
  }), [hoveredComponent, activePanel]);

  const wingMaterial = useMemo(() => 
    createMaterial(wing.color, wing.sandingLevel, hoveredComponent === "wing" || activePanel === "wing"), 
  [wing.color, wing.sandingLevel, hoveredComponent, activePanel]);

  const hStabMaterial = useMemo(() => 
    createMaterial(horizontalStabilizer.color, horizontalStabilizer.sandingLevel, hoveredComponent === "h-stab" || activePanel === "h-stab"), 
  [horizontalStabilizer.color, horizontalStabilizer.sandingLevel, hoveredComponent, activePanel]);

  const vStabMaterial = useMemo(() => 
    createMaterial(verticalStabilizer.color, verticalStabilizer.sandingLevel, hoveredComponent === "v-stab" || activePanel === "v-stab"), 
  [verticalStabilizer.color, verticalStabilizer.sandingLevel, hoveredComponent, activePanel]);

  const hStabGeometry = useMemo(() => 
    createTailGeometry(hStabSpan, hStabChord, horizontalStabilizer.shape, horizontalStabilizer.sandingLevel, false), 
  [hStabSpan, hStabChord, horizontalStabilizer.shape, horizontalStabilizer.sandingLevel]);

  const vStabGeometry = useMemo(() => 
    createTailGeometry(vStabHeight, vStabChord, verticalStabilizer.shape, verticalStabilizer.sandingLevel, true), 
  [vStabHeight, vStabChord, verticalStabilizer.shape, verticalStabilizer.sandingLevel]);

  // Procedural Aeroelastic Wing Flexing & Aerodynamic Glide Oscillations (Three.js Animation Skill)
  useFrame((state) => {
    if (gliderGroupRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle thermal glide pitch and roll motions
      gliderGroupRef.current.rotation.z = Math.sin(time * 0.8) * 0.02;
      gliderGroupRef.current.rotation.x = Math.sin(time * 0.5) * 0.015;
      gliderGroupRef.current.position.y = Math.sin(time * 1.2) * 0.5 * SCALE;
    }
  });

  return (
    <group ref={gliderGroupRef}>
      {/* Fuselage */}
      {visibility["fuselage"] !== false && (
        <group 
          position={[0, 0, 0]} 
          rotation={[0, -Math.PI / 2, 0]}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredComponent("fuselage"); }}
          onPointerOut={() => setHoveredComponent(null)}
        >
          <mesh geometry={fuselageGeometry} material={woodMaterial} position={[0, 0, -fuseBodyH * 0.3]} castShadow receiveShadow />
        </group>
      )}

      {/* Nose weight marker (red clay) */}
      {visibility["fuselage"] !== false && (
        <mesh position={[0, -fuseBodyH * 0.1, noseZ + 1]} castShadow receiveShadow>
          <boxGeometry args={[fuseBodyH * 0.4, fuseBodyH * 0.4, fuseBodyH * 0.3]} />
          <meshStandardMaterial color={NOSE_COLOR} roughness={0.8} />
        </mesh>
      )}

      {/* Main Wing */}
      {visibility["wing"] !== false && (
        <group 
          position={[0, fuseBodyH * 0.35, wingZ]}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredComponent("wing"); }}
          onPointerOut={() => setHoveredComponent(null)}
        >
          {/* Right half wing */}
          <group>
            <mesh
              geometry={wingGeometry}
              material={wingMaterial}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow
              receiveShadow
            />
          </group>
          {/* Left half wing (mirrored) */}
          <group scale={[-1, 1, 1]}>
            <group>
              <mesh
                geometry={wingGeometry}
                material={wingMaterial}
                rotation={[0, -Math.PI / 2, 0]}
                castShadow
                receiveShadow
              />
            </group>
          </group>

          {/* Interactive Span Handles */}
          {showWingOverlay && (
            <>
              <mesh
                position={[wSpan / 2, wSpan / 2 * Math.sin(wDihedralRad), 0]}
                onPointerDown={(e) => onPointerDown(e, "right")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerOver={(e) => { e.stopPropagation(); setHoveredRight(true); document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { setHoveredRight(false); if (!dragState.current.active) document.body.style.cursor = "auto"; }}
              >
                <sphereGeometry args={[hoveredRight ? 1.5 : 1, 16, 16]} />
                <meshStandardMaterial color="#f5a623" emissive="#f5a623" emissiveIntensity={0.8} />
              </mesh>

              <mesh
                position={[-wSpan / 2, wSpan / 2 * Math.sin(wDihedralRad), 0]}
                onPointerDown={(e) => onPointerDown(e, "left")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLeft(true); document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { setHoveredLeft(false); if (!dragState.current.active) document.body.style.cursor = "auto"; }}
              >
                <sphereGeometry args={[hoveredLeft ? 1.5 : 1, 16, 16]} />
                <meshStandardMaterial color="#f5a623" emissive="#f5a623" emissiveIntensity={0.8} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Horizontal Stabilizer */}
      {visibility["h-stab"] !== false && (
        <group 
          position={[0, fuseBodyH * 0.1, hStabZ]}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredComponent("h-stab"); }}
          onPointerOut={() => setHoveredComponent(null)}
        >
          <group>
            <mesh
              geometry={hStabGeometry}
              material={hStabMaterial}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow
              receiveShadow
            />
          </group>
          <group scale={[-1, 1, 1]}>
            <group>
              <mesh
                geometry={hStabGeometry}
                material={hStabMaterial}
                rotation={[0, -Math.PI / 2, 0]}
                castShadow
                receiveShadow
              />
            </group>
          </group>
        </group>
      )}

      {/* Vertical Stabilizer */}
      {visibility["v-stab"] !== false && (
        <group 
          position={[0, fuseBodyH * 0.1, vStabZ]}
          onPointerOver={(e) => { e.stopPropagation(); setHoveredComponent("v-stab"); }}
          onPointerOut={() => setHoveredComponent(null)}
        >
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh 
              geometry={vStabGeometry}
              material={vStabMaterial}
              rotation={[0, -Math.PI / 2, 0]}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      )}

      {/* Dimension Lines */}
      {showDimensions && (
        <group>
          {activePanel === "wing" && (
            <>
              <DimensionLine
                start={[-wSpan / 2, fuseBodyH * 0.35 + 5, wingZ]}
                end={[wSpan / 2, fuseBodyH * 0.35 + 5, wingZ]}
                label={`${wing.span.toFixed(0)}`}
                color="#f5a623"
              />
              <DimensionLine
                start={[wSpan / 2 + 3, fuseBodyH * 0.35, wingZ - wChord / 2]}
                end={[wSpan / 2 + 3, fuseBodyH * 0.35, wingZ + wChord / 2]}
                label={`${wing.chord.toFixed(0)}`}
                color="#22d3ee"
              />
            </>
          )}

          {activePanel === "fuselage" && (
            <DimensionLine
              start={[0, -5, noseZ]}
              end={[0, -5, noseZ + fuseLen]}
              label={`${fuselage.length.toFixed(0)}`}
              color="#f5a623"
            />
          )}

          {activePanel === "h-stab" && (
            <DimensionLine
              start={[-hStabSpan / 2, fuseBodyH * 0.1 + 3, hStabZ]}
              end={[hStabSpan / 2, fuseBodyH * 0.1 + 3, hStabZ]}
              label={`${horizontalStabilizer.span.toFixed(0)}`}
              color="#f5a623"
            />
          )}

          {activePanel === "v-stab" && (
            <DimensionLine
              start={[3, fuseBodyH * 0.1, vStabZ]}
              end={[3, fuseBodyH * 0.1 + vStabHeight, vStabZ]}
              label={`${verticalStabilizer.height.toFixed(0)}`}
              color="#f5a623"
            />
          )}
        </group>
      )}
    </group>
  );
}
