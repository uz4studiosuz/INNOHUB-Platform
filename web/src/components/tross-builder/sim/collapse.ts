/**
 * Collapse physics.
 *
 * Once a member fails the structure stops being a structure, so the solver has
 * nothing useful left to say. Every piece becomes a free rigid body with
 * gravity, spin and a bouncy ground plane. This is deliberately a light custom
 * integrator rather than a full physics engine: it only has to look right for
 * about four seconds and it must not cost frames on integrated graphics.
 */

import * as THREE from 'three'

export interface RigidBody {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  velocity: THREE.Vector3
  /** angular velocity, rad/s, applied as an incremental rotation */
  spin: THREE.Vector3
  /** half-height used for the ground contact test */
  radius: number
  resting: boolean
  age: number
  /** small pieces are culled early to keep the draw count down */
  small: boolean
  opacity: number
}

const GRAVITY = -9.81
const RESTITUTION = 0.22
const FRICTION = 0.72
const AIR = 0.012

export function makeBody(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  radius: number,
  small: boolean,
): RigidBody {
  return {
    position: position.clone(),
    quaternion: quaternion.clone(),
    velocity: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    radius,
    resting: false,
    age: 0,
    small,
    opacity: 1,
  }
}

/**
 * Kick a body outwards from the failure point. Pieces close to the break get
 * the most energy, which reads as the collapse propagating from the failure.
 */
export function seedImpulse(body: RigidBody, origin: THREE.Vector3, strength = 1) {
  const dir = body.position.clone().sub(origin)
  const dist = Math.max(dir.length(), 0.5)
  dir.normalize()
  const falloff = strength * Math.min(1.6, 4 / dist)
  body.velocity.addScaledVector(dir, falloff * (1.2 + Math.random() * 1.4))
  body.velocity.y += (Math.random() - 0.2) * falloff * 1.5
  // A little out-of-plane scatter so the debris does not stay coplanar.
  body.velocity.z += (Math.random() - 0.5) * falloff * 1.8
  body.spin.set(
    (Math.random() - 0.5) * 5 * falloff,
    (Math.random() - 0.5) * 4 * falloff,
    (Math.random() - 0.5) * 5 * falloff,
  )
}

const tmpQuat = new THREE.Quaternion()
const tmpEuler = new THREE.Euler()

/** Integrate one body. `groundY` is the water/riverbed surface. */
export function stepBody(body: RigidBody, dt: number, groundY: number) {
  body.age += dt
  if (body.resting) return

  body.velocity.y += GRAVITY * dt
  body.velocity.multiplyScalar(1 - AIR)
  body.position.addScaledVector(body.velocity, dt)

  tmpEuler.set(body.spin.x * dt, body.spin.y * dt, body.spin.z * dt)
  tmpQuat.setFromEuler(tmpEuler)
  body.quaternion.premultiply(tmpQuat)

  const floor = groundY + body.radius * 0.5
  if (body.position.y < floor) {
    body.position.y = floor
    body.velocity.y = -body.velocity.y * RESTITUTION
    body.velocity.x *= FRICTION
    body.velocity.z *= FRICTION
    body.spin.multiplyScalar(FRICTION)
    // Once it has stopped bouncing, freeze it — no more integration cost.
    if (Math.abs(body.velocity.y) < 0.35 && body.velocity.lengthSq() < 0.6) {
      body.resting = true
      body.velocity.set(0, 0, 0)
      body.spin.set(0, 0, 0)
    }
  }
}

/**
 * Fade schedule. Spec 4.3: small debris disappears after 3 s; the larger pieces
 * hang around a bit longer so the wreck is still readable when the overlay
 * appears.
 */
export function debrisOpacity(body: RigidBody): number {
  const life = body.small ? 3 : 6
  const fade = 0.8
  if (body.age < life) return 1
  return Math.max(0, 1 - (body.age - life) / fade)
}
