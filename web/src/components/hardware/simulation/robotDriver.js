import * as THREE from 'three';
import { LDU_TO_CM } from './arenaBuilder.js';

/**
 * Robotning harakati va sezishi.
 *
 * Model — differensial privod (ikki g'ildirakli, chap/o'ng tezlik farqi bilan
 * buriladi): bu Arduino + L298N + ikkita DC motorli robotning aynan o'zi.
 * Fizika soddalashtirilgan, lekin o'zaro bog'liqliklar haqiqiy: PWM qiymati
 * chiziqli tezlikni beradi, tezlik burilish radiusiga ta'sir qiladi, sensor
 * to'siqqacha bo'lgan masofani o'lchaydi va shu masofa kodning qaroriga kiradi.
 */

/** analogWrite() 0..255 -> maksimal chiziqli tezlik (LDU/sekund).
 * 255 PWM ≈ 900 LDU/s = 360 mm/s — TT-motorli o'quv roboti uchun real qiymat. */
const MAX_LINEAR = 900;
/** Maksimal burilish tezligi (rad/sekund) to'liq gazda. */
const MAX_TURN = 2.2;
/** Tezlanish (LDU/s²) — motor bir zumda maksimal tezlikka chiqmaydi. */
const ACCEL = 2600;

const FORWARD_KEYS = new Set(['w', 'arrowup']);
const BACK_KEYS = new Set(['s', 'arrowdown']);
const LEFT_KEYS = new Set(['a', 'arrowleft']);
const RIGHT_KEYS = new Set(['d', 'arrowright']);

export function isDriveKey(key) {
  const k = String(key).toLowerCase();
  return FORWARD_KEYS.has(k) || BACK_KEYS.has(k) || LEFT_KEYS.has(k) || RIGHT_KEYS.has(k);
}

export function keyRole(key) {
  const k = String(key).toLowerCase();
  if (FORWARD_KEYS.has(k)) return 'forward';
  if (BACK_KEYS.has(k)) return 'back';
  if (LEFT_KEYS.has(k)) return 'left';
  if (RIGHT_KEYS.has(k)) return 'right';
  return null;
}

export function createRobotState(spawn) {
  return {
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading || 0,
    speed: 0,
    turnRate: 0,
    wheelAngle: 0,
    collisions: 0,
    goalReached: false,
    startedAt: performance.now(),
    finishedAt: null,
    distanceCm: 400,
    /** Avtonom rejim uchun qochish manevri holati. */
    avoid: null,
    lastCollisionAt: 0,
    /** "Tiqilib qolish" detektori uchun: oxirgi tekshiruvdagi joylashuv. */
    stuckAnchor: { x: spawn.x, z: spawn.z },
    stuckTimer: 0,
  };
}

const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();

/**
 * Ultratovush sensori: robot oldidan berilgan burchak ostida nur yuboradi va
 * birinchi to'siqqacha bo'lgan masofani santimetrda qaytaradi.
 *
 * HC-SR04 ning real chegarasi ~400 sm; undan uzoq masofa "to'siq yo'q" degani.
 */
export function measureDistanceCm(raycaster, colliders, state, offsetRad, sensorY) {
  const angle = state.heading + offsetRad;
  rayOrigin.set(state.x, sensorY, state.z);
  rayDirection.set(Math.cos(angle), 0, -Math.sin(angle)).normalize();
  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = 400 / LDU_TO_CM;
  const hits = raycaster.intersectObjects(colliders, false);
  if (!hits.length) return 400;
  return Math.min(400, hits[0].distance * LDU_TO_CM);
}

/**
 * Doira (robot) va o'qlarga parallel to'rtburchak / doira to'siqlar orasidagi
 * to'qnashuvni hal qiladi: robotni to'siqdan eng qisqa yo'l bilan itarib
 * chiqaradi va to'qnashuv sodir bo'lganini qaytaradi.
 */
export function resolveCollisions(state, radius, boxes, circles) {
  let hit = false;

  for (const b of boxes) {
    const dx = state.x - b.x;
    const dz = state.z - b.z;
    const closestX = Math.max(-b.hw, Math.min(b.hw, dx));
    const closestZ = Math.max(-b.hd, Math.min(b.hd, dz));
    const offX = dx - closestX;
    const offZ = dz - closestZ;
    const distSq = offX * offX + offZ * offZ;

    if (distSq >= radius * radius) continue;
    hit = true;

    if (distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const push = radius - dist;
      state.x += (offX / dist) * push;
      state.z += (offZ / dist) * push;
    } else {
      // Markaz to'rtburchak ichida: eng yaqin yon tomonga chiqaramiz.
      const toRight = b.hw - dx;
      const toLeft = dx + b.hw;
      const toFar = b.hd - dz;
      const toNear = dz + b.hd;
      const min = Math.min(toRight, toLeft, toFar, toNear);
      if (min === toRight) state.x = b.x + b.hw + radius;
      else if (min === toLeft) state.x = b.x - b.hw - radius;
      else if (min === toFar) state.z = b.z + b.hd + radius;
      else state.z = b.z - b.hd - radius;
    }
  }

  for (const c of circles) {
    const dx = state.x - c.x;
    const dz = state.z - c.z;
    const minDist = radius + c.r;
    const distSq = dx * dx + dz * dz;
    if (distSq >= minDist * minDist) continue;
    hit = true;
    const dist = Math.sqrt(distSq) || 1e-4;
    const push = minDist - dist;
    state.x += (dx / dist) * push;
    state.z += (dz / dist) * push;
  }

  return hit;
}

/** Orqaga qaytib, ochiqroq tomonga burilish manevri.
 *
 * Burilish bosqichi qat'iy vaqt bilan emas, old tomon bo'shaguncha davom
 * etadi (yuqori chegara bilan). Avval u 0.75 sekundga qat'iy belgilangan edi
 * va shu vaqtda robot atigi ~40 gradusga burilardi — to'siq hali oldida
 * qolar, manevr darhol qaytadan boshlanardi va robot burchakda cheksiz
 * tebranib turardi. */
function beginAvoid(state, sensors, hard = false) {
  const turnDir = sensors.right > sensors.left ? -1 : 1;
  state.avoid = {
    phase: 'reverse',
    throttle: hard ? -0.75 : -0.6,
    steer: 0,
    remaining: hard ? 0.8 : 0.5,
    turnDir,
    turnBudget: hard ? 3.2 : 2.2,
  };
}

/**
 * Avtonom boshqaruv — SimulationPanel dagi Arduino kodining mantig'i:
 * oldinga yur, to'siq `stopCm` dan yaqin bo'lsa orqaga qaytib burilib ket.
 * Qaysi tomonga burilish chap/o'ng "mo'ylov" nurlari bilan tanlanadi.
 */
function autonomousControl(state, sensors, stopCm, delta) {
  const avoid = state.avoid;
  if (avoid) {
    avoid.remaining -= delta;
    if (avoid.phase === 'reverse') {
      if (avoid.remaining <= 0) {
        avoid.phase = 'turn';
        avoid.remaining = avoid.turnBudget;
      }
      return { throttle: avoid.throttle, steer: 0 };
    }
    // 'turn': deyarli joyida aylanadi (diferensial privod shunga qodir) va
    // old tomon yetarlicha bo'shaguncha davom etadi.
    const clear = sensors.front > stopCm * 2.2 && sensors.left > stopCm && sensors.right > stopCm;
    if (clear || avoid.remaining <= 0) {
      state.avoid = null;
    } else {
      return { throttle: 0.06, steer: avoid.turnDir };
    }
  }

  if (sensors.front < stopCm) {
    beginAvoid(state, sensors);
    return { throttle: state.avoid.throttle, steer: 0 };
  }

  // To'siq uzoqda — to'liq gaz; yaqinlashganda sekinlashadi.
  const easing = Math.min(1, Math.max(0.25, (sensors.front - stopCm) / (stopCm * 3)));
  // Yon tomondagi to'siqdan yumshoq chetlanish (devor bo'ylab yurish).
  const sideBias = Math.max(-1, Math.min(1, (sensors.right - sensors.left) / 120));
  return { throttle: easing, steer: -sideBias * 0.45 };
}

/**
 * Bir kadrni hisoblaydi va `state` ni joyida yangilaydi.
 *
 * @returns {{distanceCm:number, collided:boolean, justReachedGoal:boolean}}
 */
export function stepRobot({
  state,
  delta,
  arena,
  raycaster,
  radius,
  sensorY,
  motorSpeed,
  servoAngle,
  stopCm,
  manual,
  keys,
}) {
  // Servo sensor kallagini buradi: 90° = to'g'ri oldinga. Bu — panelda va
  // Serial Monitor da ko'rsatiladigan o'lchov.
  const servoOffset = ((servoAngle - 90) * Math.PI) / 180;
  const sensorCm = measureDistanceCm(raycaster, arena.colliders, state, servoOffset, sensorY);
  state.distanceCm = sensorCm;

  // Boshqaruv esa har doim tananing haqiqiy old tomonini ham o'lchaydi:
  // servo yon tomonga burilgan bo'lsa, robot ko'r holda yurib devorga
  // urilib turardi.
  const bodyFront = servoOffset === 0 ? sensorCm : measureDistanceCm(raycaster, arena.colliders, state, 0, sensorY);
  const front = Math.min(sensorCm, bodyFront);
  const left = measureDistanceCm(raycaster, arena.colliders, state, 0.55, sensorY);
  const right = measureDistanceCm(raycaster, arena.colliders, state, -0.55, sensorY);

  let throttle = 0;
  let steer = 0;

  if (manual) {
    if (keys.forward) throttle += 1;
    if (keys.back) throttle -= 1;
    if (keys.left) steer += 1;
    if (keys.right) steer -= 1;
  } else {
    // Tiqilib qolishdan chiqish: agar robot 2 sekundda deyarli qimirlamagan
    // bo'lsa (burchakka kirib qolgan, yoki qochish manevri aylanib qolgan),
    // majburiy uzun orqaga + keng burilish beriladi.
    state.stuckTimer += delta;
    if (state.stuckTimer >= 2) {
      const moved = Math.hypot(state.x - state.stuckAnchor.x, state.z - state.stuckAnchor.z);
      if (moved < 120 && !state.goalReached) beginAvoid(state, { left, right }, true);
      state.stuckAnchor = { x: state.x, z: state.z };
      state.stuckTimer = 0;
    }

    const control = autonomousControl(state, { front, left, right }, stopCm, delta);
    throttle = control.throttle;
    steer = control.steer;
  }

  const pwm = Math.max(0, Math.min(255, motorSpeed)) / 255;
  const maxLinear = MAX_LINEAR * pwm;
  const targetSpeed = throttle * maxLinear;
  const speedDelta = targetSpeed - state.speed;
  const maxChange = ACCEL * delta;
  state.speed += Math.max(-maxChange, Math.min(maxChange, speedDelta));

  // Differensial privodda burilish g'ildirak tezliklari farqidan chiqadi:
  // vL = v - w*b/2, vR = v + w*b/2, ikkalasi ham vmax bilan cheklangan.
  // Demak chiziqli tezlik qancha kam bo'lsa, burilishga shuncha ko'p zaxira
  // qoladi — turgan joyida to'liq tezlikda aylana oladi. Avvalgi formula
  // buning teskarisini qilardi (sekin yurganda kam burilardi), shuning uchun
  // robot to'siq oldida burila olmay tiqilib qolardi.
  const headroom = maxLinear > 0 ? Math.max(0, 1 - Math.abs(state.speed) / maxLinear) : 0;
  state.turnRate = steer * MAX_TURN * pwm * (0.25 + 0.75 * headroom);
  state.heading += state.turnRate * delta;

  state.x += Math.cos(state.heading) * state.speed * delta;
  state.z += -Math.sin(state.heading) * state.speed * delta;

  const collided = resolveCollisions(state, radius, arena.boxes, arena.circles);
  if (collided) {
    // Devorga urilganda tezlik so'nadi va hisob faqat yangi urilishda oshadi.
    state.speed *= 0.25;
    const now = performance.now();
    if (now - state.lastCollisionAt > 700) {
      state.collisions += 1;
      state.lastCollisionAt = now;
    }
  }

  // G'ildirak burchagi chiziqli tezlikdan kelib chiqadi (sirpanishsiz dumalash):
  // omega = v / r. Bu qiymat sahnadagi g'ildiraklarni aylantirish uchun.
  state.wheelAngle += (state.speed * delta) / 26;

  let justReachedGoal = false;
  if (!state.goalReached) {
    const gdx = state.x - arena.goal.x;
    const gdz = state.z - arena.goal.z;
    if (Math.sqrt(gdx * gdx + gdz * gdz) < arena.goal.r) {
      state.goalReached = true;
      state.finishedAt = performance.now();
      justReachedGoal = true;
    }
  }

  return { distanceCm: sensorCm, collided, justReachedGoal };
}
