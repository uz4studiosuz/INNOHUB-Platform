import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { asphaltTexture, grassTexture, rockTexture } from './textures'
import { DECK_WIDTH } from '../../analysis/model'

/**
 * Sky dome, river valley, banks and distant hills.
 * Everything here is low-poly and static so the frame budget goes to the
 * bridge itself (spec 11: 30+ FPS on integrated graphics).
 */

const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAG = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 bottom;
  void main() {
    float h = normalize(vWorld).y;
    vec3 c = h > 0.0
      ? mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55))
      : mix(horizon, bottom, pow(clamp(-h, 0.0, 1.0), 0.7));
    gl_FragColor = vec4(c, 1.0);
  }
`

function SkyDome() {
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color('#2f6ec4') },
      horizon: { value: new THREE.Color('#bcd8f2') },
      bottom: { value: new THREE.Color('#6f7d84') },
    }),
    [],
  )
  return (
    <mesh scale={[1, 1, 1]} frustumCulled={false}>
      <sphereGeometry args={[420, 24, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

const WATER_VERT = /* glsl */ `
  uniform float time;
  varying vec3 vPos;
  varying float vWave;

  // Two crossing sine trains — cheap, and enough at this camera distance.
  float wave(vec2 p) {
    float a = sin(p.x * 0.55 + time * 1.1) * 0.10;
    float b = sin(p.y * 0.42 - time * 0.85) * 0.08;
    float c = sin((p.x + p.y) * 0.9 + time * 1.7) * 0.035;
    return a + b + c;
  }

  void main() {
    vec3 p = position;
    float w = wave(p.xy);
    p.z += w;
    vWave = w;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const WATER_FRAG = /* glsl */ `
  uniform float time;
  uniform vec3 deep;
  uniform vec3 shallow;
  varying vec3 vPos;
  varying float vWave;

  void main() {
    float k = clamp(vWave * 3.5 + 0.5, 0.0, 1.0);
    vec3 c = mix(deep, shallow, k);

    // Sparkle rather than sheen: high-frequency ripples gate the highlight so
    // the crests break into small glints instead of one broad white blob. Two
    // overlapping wave trains at different angles and incommensurate
    // frequencies keep it from reading as a regular polka-dot lattice.
    float r1 = sin(vPos.x * 7.3 + time * 3.1) * sin(vPos.y * 6.1 - time * 2.4);
    float r2 = sin((vPos.x * 0.71 + vPos.y * 0.70) * 9.7 - time * 2.2);
    float ripple = r1 * 0.55 + r2 * 0.30 + r1 * r2 * 0.45;
    float glint = smoothstep(0.62, 0.98, ripple) * smoothstep(0.03, 0.11, vWave);
    c += glint * 0.42;

    gl_FragColor = vec4(c, 0.94);
  }
`

function Water({ span, clearance }: { span: number; clearance: number }) {
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      deep: { value: new THREE.Color('#0d3a52') },
      shallow: { value: new THREE.Color('#2f7fa3') },
    }),
    [],
  )
  useFrame((_, dt) => {
    uniforms.time.value += dt
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[span / 2, -clearance, 0]}>
      <planeGeometry args={[span * 4, 160, 90, 40]} />
      <shaderMaterial
        transparent
        uniforms={uniforms}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
      />
    </mesh>
  )
}

/**
 * The two river banks. Each bank is a plane pushed into a low-poly slope so the
 * valley reads as terrain rather than a flat card.
 */
function Bank({
  span,
  clearance,
  side,
}: {
  span: number
  clearance: number
  side: -1 | 1
}) {
  const geometry = useMemo(() => {
    const width = 90
    const depth = 160
    const geo = new THREE.PlaneGeometry(width, depth, 22, 26)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // x runs away from the river; ramp up to deck level then roll gently.
      const t = THREE.MathUtils.clamp((x + width / 2) / 22, 0, 1)
      const bankRise = -clearance + t * (clearance + 0.4)
      const roll =
        Math.sin(y * 0.09) * 1.1 + Math.cos(x * 0.13 + y * 0.05) * 0.8 * t
      pos.setZ(i, bankRise + roll * t)
    }
    geo.computeVertexNormals()
    return geo
  }, [clearance])

  const grass = grassTexture()
  // Left bank sits at negative x, right bank past the span; both face the river.
  const x = side === -1 ? -45 - 1 : span + 45 + 1
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, side === -1 ? Math.PI : 0]}
      position={[x, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial map={grass} roughness={0.95} metalness={0} />
    </mesh>
  )
}

/** Riverbed + rocky cliff faces under each abutment. */
function RiverBed({ span, clearance }: { span: number; clearance: number }) {
  const rock = rockTexture()
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[span / 2, -clearance - 2.4, 0]} receiveShadow>
        <planeGeometry args={[span + 40, 160]} />
        <meshStandardMaterial map={rock} roughness={1} metalness={0} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s === -1 ? -1.6 : span + 1.6, -clearance / 2 - 1, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[3.2, clearance + 3, 26]} />
          <meshStandardMaterial map={rock} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

/** Distant hills — a ring of squashed low-poly cones behind the valley. */
function Hills({ span }: { span: number }) {
  const hills = useMemo(() => {
    const out: { pos: [number, number, number]; r: number; h: number; c: string }[] = []
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2
      const dist = 150 + rand() * 90
      const h = 16 + rand() * 34
      out.push({
        pos: [span / 2 + Math.cos(angle) * dist, h / 2 - 6, Math.sin(angle) * dist],
        r: 26 + rand() * 26,
        h,
        c: ['#4a6b4e', '#3f5c46', '#57755a', '#6a7f6b'][(rand() * 4) | 0],
      })
    }
    return out
  }, [span])

  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={h.pos}>
          <coneGeometry args={[h.r, h.h, 7, 1]} />
          <meshStandardMaterial color={h.c} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** A few drifting cloud puffs, built from merged low-poly spheres. */
function Clouds({ span }: { span: number }) {
  const group = useRef<THREE.Group>(null)
  const puffs = useMemo(() => {
    const out: { pos: [number, number, number]; s: number }[] = []
    let seed = 21
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let c = 0; c < 9; c++) {
      const cx = (rand() - 0.5) * 320 + span / 2
      const cy = 55 + rand() * 30
      const cz = (rand() - 0.5) * 300
      for (let p = 0; p < 4; p++) {
        out.push({
          pos: [cx + (rand() - 0.5) * 22, cy + (rand() - 0.5) * 5, cz + (rand() - 0.5) * 16],
          s: 7 + rand() * 9,
        })
      }
    }
    return out
  }, [span])

  useFrame((_, dt) => {
    if (group.current) group.current.position.x += dt * 0.35
  })

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.s, 7, 5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The approach roads.
 *
 * Without these the deck simply stopped at the abutment and the asphalt looked
 * like it started in mid-air. Each side now carries the carriageway from the
 * abutment out to the edge of the valley on a solid embankment, with the same
 * lane markings and barriers as the bridge deck so the two read as one road.
 */
function Approach({
  span,
  clearance,
  side,
}: {
  span: number
  clearance: number
  side: -1 | 1
}) {
  const asphalt = asphaltTexture()
  const rock = rockTexture()

  const LENGTH = 60
  const WIDTH = DECK_WIDTH
  const start = side === -1 ? -LENGTH : span
  const centre = start + LENGTH / 2

  const dashes = useMemo(() => {
    const out: number[] = []
    for (let x = 2; x < LENGTH - 2; x += 6) out.push(start + x)
    return out
  }, [start])

  return (
    <group>
      {/* Carriageway, flush with the bridge deck. */}
      <mesh position={[centre, -0.12, 0]} receiveShadow>
        <boxGeometry args={[LENGTH, 0.24, WIDTH]} />
        <meshStandardMaterial map={asphalt} color="#565b63" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Embankment carrying it down to the valley floor. */}
      <mesh position={[centre, -clearance / 2 - 1.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[LENGTH, clearance + 2.6, WIDTH + 3.2]} />
        <meshStandardMaterial map={rock} color="#8a8375" roughness={1} metalness={0} />
      </mesh>

      {/* Centre line. */}
      {dashes.map((x) => (
        <mesh key={x} position={[x, 0.005, 0]}>
          <boxGeometry args={[3, 0.02, 0.14]} />
          <meshStandardMaterial color="#f2f3f5" roughness={0.7} />
        </mesh>
      ))}

      {/* Edge lines and barriers. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[centre, 0.005, s * (WIDTH / 2 - 0.55)]}>
            <boxGeometry args={[LENGTH - 1, 0.02, 0.14]} />
            <meshStandardMaterial color="#f2f3f5" roughness={0.7} />
          </mesh>
          <mesh position={[centre, 0.65, s * (WIDTH / 2 - 0.25)]} castShadow>
            <boxGeometry args={[LENGTH - 1, 0.1, 0.07]} />
            <meshStandardMaterial color="#c8ccd2" metalness={0.5} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Environment3D({ span, clearance }: { span: number; clearance: number }) {
  return (
    <group>
      <SkyDome />
      <Hills span={span} />
      <Clouds span={span} />
      <Bank span={span} clearance={clearance} side={-1} />
      <Bank span={span} clearance={clearance} side={1} />
      <Approach span={span} clearance={clearance} side={-1} />
      <Approach span={span} clearance={clearance} side={1} />
      <RiverBed span={span} clearance={clearance} />
      <Water span={span} clearance={clearance} />
      <fog attach="fog" args={['#b7cfe4', 120, 420]} />
    </group>
  )
}
