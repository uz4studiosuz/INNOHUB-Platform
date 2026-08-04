import * as THREE from 'three';

/**
 * INNOHUB Sinov Poligoni — bitta katta xona, ichida bir nechta zona.
 *
 * Avval uchta alohida poligon bor edi (slalom / labirint / ombor) va har
 * biriga o'tish uchun sinovni qaytadan boshlash kerak edi. Endi hammasi
 * bitta maydonda: robot chapdan o'ngga qarab slalom -> labirint -> xavf
 * zonasi -> yuk maydoni -> yetkazish nuqtasi bo'ylab yuradi. Shunday
 * qilingani bejiz emas — real robototexnika musobaqalarida ham maydon
 * bitta bo'lib, unda ketma-ket vazifalar joylashadi.
 *
 * Barcha o'lchamlar LDraw birligida (1 LDU = 0.4 mm), chunki sahnadagi
 * detallar ham shu birlikda. 2500 LDU = 1 metr.
 */
export const ROOM_WIDTH = 7200;   // X bo'ylab — 2.88 m
export const ROOM_DEPTH = 5200;   // Z bo'ylab — 2.08 m
export const WALL_HEIGHT = 420;
export const WALL_THICK = 55;
export const FLOOR_Y = 0;

const HALF_W = ROOM_WIDTH / 2;
const HALF_D = ROOM_DEPTH / 2;

/** Nisbiy koordinatalar: fx/fz = -1..+1 xonaning chekkalari. Xona o'lchami
 * o'zgarsa hamma zona birga kengayadi. */
const fx = (v) => v * HALF_W;
const fz = (v) => v * HALF_D;

/** LDU -> santimetr (HC-SR04 sensori santimetrda o'lchaydi). */
export const LDU_TO_CM = 0.04;

/** Aniq (deterministik) tasodifiy son — Math.random() ishlatilsa har qayta
 * qurishda to'siqlar joyini o'zgartirib yuboradi va bir xil kod har safar
 * boshqacha natija beradi. Bu esa sinovni ma'nosiz qiladi. */
function seeded(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ─────────────────────────── Teksturalar ─────────────────────────── */

let floorTextureCache = null;

/** Sanoat sinov maydonchasi poli: to'q kulrang plitka + oqartirilgan chok. */
function getFloorTexture() {
  if (floorTextureCache) return floorTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2b3440';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(120,140,165,0.30)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  for (let i = 0; i < 900; i++) {
    const g = seeded(i * 3 + 7);
    ctx.fillStyle = g > 0.5 ? `rgba(255,255,255,${g * 0.05})` : `rgba(0,0,0,${g * 0.14})`;
    ctx.fillRect(seeded(i * 3 + 8) * 128, seeded(i * 3 + 9) * 128, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_WIDTH / 150, ROOM_DEPTH / 150);
  texture.anisotropy = 4;
  floorTextureCache = texture;
  return texture;
}

let hazardTextureCache = null;

/** Sariq-qora ogohlantirish chizig'i (devor tagidagi xavfsizlik lentasi). */
function getHazardTexture() {
  if (hazardTextureCache) return hazardTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0b323';
  ctx.fillRect(0, 0, 64, 16);
  ctx.fillStyle = '#1c1f24';
  for (let i = -16; i < 64; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 16);
    ctx.lineTo(i + 8, 16);
    ctx.lineTo(i + 20, 0);
    ctx.lineTo(i + 12, 0);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  hazardTextureCache = texture;
  return texture;
}

let waterTextureCache = null;

/** Suv yuzasi: to'lqin naqshi. UV siljitilib animatsiya qilinadi. */
function getWaterTexture() {
  if (waterTextureCache) return waterTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0e5f8a';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) {
    const y = seeded(i * 5 + 3) * 128;
    ctx.strokeStyle = `rgba(180,235,255,${0.05 + seeded(i * 5 + 4) * 0.16})`;
    ctx.lineWidth = 1 + seeded(i * 5 + 5) * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y - 9, 96, y + 9, 128, y);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  waterTextureCache = texture;
  return texture;
}

/* ───────────────────────── Poligon tarkibi ───────────────────────── */

/**
 * Zonalar chapdan o'ngga joylashadi va har biri boshqa ko'nikmani sinaydi.
 * Koridorlar ataylab keng: robot radiusi ~130 LDU, eng tor joy ~420 LDU.
 */
function buildCourse() {
  const obstacles = [];
  const hazards = [];
  const payloads = [];

  // ── 1. Slalom yo'lagi ──
  const cones = 6;
  for (let i = 0; i < cones; i++) {
    const x = fx(-0.74 + (0.34 * i) / (cones - 1));
    const z = i % 2 === 0 ? fz(-0.3) : fz(0.3);
    obstacles.push({ kind: 'cylinder', x, z, r: 60, h: 200, color: '#f97316', cone: true });
  }

  // ── 2. Labirint bo'limi ──
  const wall = (x, z, w, d) => obstacles.push({ kind: 'box', x, z, w, d, h: 340, color: '#46536b' });
  wall(fx(-0.3), fz(-0.55), 70, fz(0.8));
  wall(fx(-0.16), fz(0.5), 70, fz(0.9));
  wall(fx(-0.02), fz(-0.5), 70, fz(0.86));
  wall(fx(-0.23), fz(0.02), fx(0.12), 70);

  // ── 3. Xavf zonasi: olov (yuqorida) va suv (pastda) ──
  // Ular robotni o'ldirmaydi, lekin ustidan yursa sinov "muvaffaqiyatsiz"
  // deb belgilanadi — real robotda ham motor suvga tushsa ishdan chiqadi.
  hazards.push({ kind: 'fire', x: fx(0.16), z: fz(-0.46), hw: 340, hd: 330 });
  hazards.push({ kind: 'water', x: fx(0.16), z: fz(0.46), hw: 420, hd: 380 });
  // Xavf zonalari orasidagi tor o'tish yo'li — robot shu yerdan o'tishi kerak.
  obstacles.push({ kind: 'box', x: fx(0.16), z: fz(-0.86), w: 90, d: fz(0.26), h: 300, color: '#3f4b5c' });
  obstacles.push({ kind: 'box', x: fx(0.16), z: fz(0.88), w: 90, d: fz(0.22), h: 300, color: '#3f4b5c' });

  // ── 4. Yuk maydoni: ko'chiriladigan yashik, bochka va shar ──
  // Bularni robot itarib yura oladi, manipulyatorli robot esa ko'tara oladi.
  const payloadSpots = [
    { x: fx(0.42), z: fz(-0.42), kind: 'crate' },
    { x: fx(0.52), z: fz(-0.06), kind: 'crate' },
    { x: fx(0.4), z: fz(0.34), kind: 'barrel' },
    { x: fx(0.6), z: fz(0.44), kind: 'ball' },
    { x: fx(0.64), z: fz(-0.3), kind: 'barrel' },
  ];
  payloadSpots.forEach((spot, i) => {
    if (spot.kind === 'crate') {
      payloads.push({ id: `payload-${i}`, kind: 'crate', x: spot.x, z: spot.z, r: 105, h: 190, massKg: 0.4, color: '#a06a30' });
    } else if (spot.kind === 'barrel') {
      payloads.push({ id: `payload-${i}`, kind: 'barrel', x: spot.x, z: spot.z, r: 88, h: 215, massKg: 0.55, color: '#2b6cb0' });
    } else {
      payloads.push({ id: `payload-${i}`, kind: 'ball', x: spot.x, z: spot.z, r: 82, h: 164, massKg: 0.25, color: '#e0b73c' });
    }
  });

  // Yuk maydonini ramkalovchi qat'iy javonlar — yuklar tarqab ketmasligi uchun.
  obstacles.push({ kind: 'box', x: fx(0.52), z: fz(-0.9), w: fx(0.36), d: 80, h: 260, color: '#4a5568' });
  obstacles.push({ kind: 'box', x: fx(0.52), z: fz(0.9), w: fx(0.36), d: 80, h: 260, color: '#4a5568' });

  return {
    obstacles,
    hazards,
    payloads,
    spawn: { x: fx(-0.9), z: 0, heading: 0 },
    goal: { x: fx(0.88), z: 0, r: 300 },
    /** Yuk tashlanadigan joy — manipulyatorli vazifa uchun. */
    dropZone: { x: fx(0.88), z: fz(-0.62), r: 260 },
  };
}

/** UI da ko'rsatiladigan zona izohlari — foydalanuvchi maydonni o'qiy olsin. */
export const ARENA_ZONES = [
  { id: 'slalom', label: 'Slalom', hint: 'Konuslar orasidan zigzag' },
  { id: 'maze', label: 'Labirint', hint: 'Devorlar orasidan chiqish' },
  { id: 'hazard', label: 'Xavf zonasi', hint: 'Olov va suvdan chetlab o‘tish' },
  { id: 'payload', label: 'Yuk maydoni', hint: 'Yashik va bochkalarni ko‘chirish' },
  { id: 'delivery', label: 'Yetkazish', hint: 'Yukni belgilangan joyga tashlash' },
];

/* ─────────────────────────── Xona qobig'i ─────────────────────────── */

function makeRoomShell(group) {
  const floorTexture = getFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    new THREE.MeshStandardMaterial({ color: '#8fa0b4', map: floorTexture, roughness: 0.88, metalness: 0.06 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#39424f', roughness: 0.82, metalness: 0.12 });
  const hazardTexture = getHazardTexture();

  const walls = [
    { x: 0, z: -HALF_D, w: ROOM_WIDTH + WALL_THICK * 2, d: WALL_THICK },
    { x: 0, z: HALF_D, w: ROOM_WIDTH + WALL_THICK * 2, d: WALL_THICK },
    { x: -HALF_W, z: 0, w: WALL_THICK, d: ROOM_DEPTH },
    { x: HALF_W, z: 0, w: WALL_THICK, d: ROOM_DEPTH },
  ];

  walls.forEach((w) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, WALL_HEIGHT, w.d), wallMaterial);
    mesh.position.set(w.x, WALL_HEIGHT / 2, w.z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);

    const stripeTexture = hazardTexture.clone();
    stripeTexture.needsUpdate = true;
    stripeTexture.repeat.set(Math.max(w.w, w.d) / 90, 1);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(w.w * 1.001, 46, w.d * 1.001),
      new THREE.MeshStandardMaterial({ map: stripeTexture, roughness: 0.7 }),
    );
    stripe.position.set(w.x, 23, w.z);
    group.add(stripe);
  });

  [[-HALF_W, -HALF_D], [HALF_W, -HALF_D], [-HALF_W, HALF_D], [HALF_W, HALF_D]].forEach(([x, z]) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 66, WALL_HEIGHT * 1.25, 12),
      new THREE.MeshStandardMaterial({ color: '#2a323d', roughness: 0.6, metalness: 0.35 }),
    );
    pillar.position.set(x, (WALL_HEIGHT * 1.25) / 2, z);
    pillar.castShadow = true;
    group.add(pillar);
  });

  const lampMaterial = new THREE.MeshStandardMaterial({
    color: '#dfe9f5',
    emissive: '#cfe4ff',
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  [-ROOM_WIDTH * 0.3, 0, ROOM_WIDTH * 0.3].forEach((x) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(170, 18, ROOM_DEPTH * 0.72), lampMaterial);
    lamp.position.set(x, WALL_HEIGHT * 1.18, 0);
    group.add(lamp);
  });
}

/* ─────────────────────── Olov va suv (animatsiyali) ─────────────────────── */

/**
 * Olov chuquri: emissiv konuslar + miltillovchi yorug'lik.
 *
 * Haqiqiy zarrachalar tizimi (particle system) emas — bu yerda u ortiqcha
 * bo'lardi: har kadr yuzlab zarrachani yangilash sinov xonasining asosiy
 * ishidan (fizika va sensor) resurs olib qo'yadi. Bir nechta konusni turli
 * fazada tebratish ham xuddi shunday ishonarli ko'rinadi.
 */
function makeFire(group, zone) {
  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(zone.hw * 2, 40, zone.hd * 2),
    new THREE.MeshStandardMaterial({ color: '#1b1512', roughness: 0.95 }),
  );
  pit.position.set(zone.x, 20, zone.z);
  pit.receiveShadow = true;
  group.add(pit);

  // Cho'g' — pastdagi qizil yorug'lik manbai
  const embers = new THREE.Mesh(
    new THREE.PlaneGeometry(zone.hw * 1.8, zone.hd * 1.8),
    new THREE.MeshBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: 0.75 }),
  );
  embers.rotation.x = -Math.PI / 2;
  embers.position.set(zone.x, 42, zone.z);
  group.add(embers);

  const flames = [];
  for (let i = 0; i < 7; i++) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(46 + seeded(i * 11 + 1) * 34, 190 + seeded(i * 11 + 2) * 150, 8),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#ffd24a' : i % 3 === 1 ? '#ff8a1f' : '#ff4d16',
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    flame.position.set(
      zone.x + (seeded(i * 11 + 3) - 0.5) * zone.hw * 1.3,
      120,
      zone.z + (seeded(i * 11 + 4) - 0.5) * zone.hd * 1.3,
    );
    flame.userData.phase = seeded(i * 11 + 5) * Math.PI * 2;
    flame.userData.baseY = flame.position.y;
    flame.userData.speed = 2.2 + seeded(i * 11 + 6) * 2.6;
    group.add(flame);
    flames.push(flame);
  }

  const light = new THREE.PointLight('#ff7a2a', 2.4, zone.hw * 9, 2);
  light.position.set(zone.x, 220, zone.z);
  group.add(light);

  return { flames, light, embers };
}

/** Suv havzasi: shaffof ko'k yuza, UV siljishi bilan oqim taassuroti. */
function makeWater(group, zone) {
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(zone.hw * 2 + 60, 46, zone.hd * 2 + 60),
    new THREE.MeshStandardMaterial({ color: '#2f3a47', roughness: 0.9 }),
  );
  basin.position.set(zone.x, 23, zone.z);
  basin.receiveShadow = true;
  group.add(basin);

  const texture = getWaterTexture().clone();
  texture.needsUpdate = true;
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(zone.hw * 2, zone.hd * 2),
    new THREE.MeshStandardMaterial({
      color: '#2aa8dd',
      map: texture,
      transparent: true,
      opacity: 0.86,
      roughness: 0.12,
      metalness: 0.5,
      emissive: '#0b3f5e',
      emissiveIntensity: 0.35,
    }),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(zone.x, 50, zone.z);
  group.add(surface);

  return { surface, texture };
}

/* ───────────────────── Ko'chiriladigan yuklar ───────────────────── */

/**
 * Yuk jismi: robot itarganda suriladi, manipulyator bilan ko'tariladi.
 *
 * Har biri to'qnashuvda doira sifatida qaraladi (yashik ham) — burchakli
 * jismni itarish burilish momentini ham talab qilardi, u esa bu yoshdagi
 * o'quvchiga tushuntirib bo'lmaydigan darajada murakkab va o'yin sifatida
 * ham noqulay ("yashik nega o'girilib ketdi?").
 */
function makePayload(group, spec) {
  let geometry;
  if (spec.kind === 'crate') {
    geometry = new THREE.BoxGeometry(spec.r * 1.7, spec.h, spec.r * 1.7);
  } else if (spec.kind === 'barrel') {
    geometry = new THREE.CylinderGeometry(spec.r, spec.r * 1.04, spec.h, 18);
  } else {
    geometry = new THREE.SphereGeometry(spec.r, 20, 14);
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.kind === 'ball' ? 0.35 : 0.72,
      metalness: spec.kind === 'barrel' ? 0.4 : 0.1,
    }),
  );
  const restY = spec.kind === 'ball' ? spec.r : spec.h / 2;
  mesh.position.set(spec.x, restY, spec.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  return {
    id: spec.id,
    kind: spec.kind,
    mesh,
    x: spec.x,
    z: spec.z,
    r: spec.r,
    restY,
    massKg: spec.massKg,
    /** Manipulyator ushlab turganda true — bunda gravitatsiya ishlamaydi. */
    held: false,
    delivered: false,
  };
}

/** Start maydonchasi, finish halqasi va yuk tashlash zonasi. */
function makeZones(group, spawn, goal, dropZone) {
  const start = new THREE.Mesh(
    new THREE.CircleGeometry(230, 40),
    new THREE.MeshStandardMaterial({ color: '#1d4ed8', transparent: true, opacity: 0.32, roughness: 0.9 }),
  );
  start.rotation.x = -Math.PI / 2;
  start.position.set(spawn.x, FLOOR_Y + 1, spawn.z);
  group.add(start);

  const goalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(goal.r, 44),
    new THREE.MeshStandardMaterial({
      color: '#22c55e',
      emissive: '#16a34a',
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.4,
      roughness: 0.85,
    }),
  );
  goalDisc.rotation.x = -Math.PI / 2;
  goalDisc.position.set(goal.x, FLOOR_Y + 1.5, goal.z);
  group.add(goalDisc);

  const goalRing = new THREE.Mesh(
    new THREE.RingGeometry(goal.r * 0.92, goal.r, 48),
    new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide }),
  );
  goalRing.rotation.x = -Math.PI / 2;
  goalRing.position.set(goal.x, FLOOR_Y + 3, goal.z);
  group.add(goalRing);

  // Yuk tashlash zonasi — boshqa rangda, chunki vazifasi boshqa.
  const drop = new THREE.Mesh(
    new THREE.CircleGeometry(dropZone.r, 40),
    new THREE.MeshStandardMaterial({
      color: '#a855f7',
      emissive: '#7e22ce',
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.35,
      roughness: 0.9,
    }),
  );
  drop.rotation.x = -Math.PI / 2;
  drop.position.set(dropZone.x, FLOOR_Y + 1.5, dropZone.z);
  group.add(drop);

  const dropRing = new THREE.Mesh(
    new THREE.RingGeometry(dropZone.r * 0.9, dropZone.r, 44),
    new THREE.MeshBasicMaterial({ color: '#c084fc', side: THREE.DoubleSide }),
  );
  dropRing.rotation.x = -Math.PI / 2;
  dropRing.position.set(dropZone.x, FLOOR_Y + 3, dropZone.z);
  group.add(dropRing);
}

/**
 * Poligonni quradi va to'qnashuv ma'lumotlarini qaytaradi.
 *
 * Qaytadi: { group, colliders, boxes, circles, payloads, hazards,
 *            spawn, goal, dropZone, update, dispose }
 *  - colliders: nur (raycast) uchun mesh ro'yxati — ultratovush sensori shularni "ko'radi"
 *  - boxes/circles: qat'iy to'siqlar (soddalashtirilgan shakllar)
 *  - payloads: ko'chiriladigan jismlar (holati har kadrda yangilanadi)
 *  - hazards: olov/suv to'rtburchaklari
 *  - update(t): olov va suv animatsiyasi
 */
export function buildArena() {
  const { obstacles, hazards, payloads: payloadSpecs, spawn, goal, dropZone } = buildCourse();

  const group = new THREE.Group();
  group.name = 'simulation-arena';
  makeRoomShell(group);
  makeZones(group, spawn, goal, dropZone);

  const colliders = [];
  const boxes = [];
  const circles = [];

  obstacles.forEach((o) => {
    let mesh;
    if (o.kind === 'cylinder') {
      const geometry = o.cone
        ? new THREE.ConeGeometry(o.r, o.h, 20)
        : new THREE.CylinderGeometry(o.r, o.r * 1.06, o.h, 20);
      mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55, metalness: 0.15 }),
      );
      mesh.position.set(o.x, o.h / 2, o.z);
      circles.push({ x: o.x, z: o.z, r: o.r });
    } else {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(o.w, o.h, o.d),
        new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.72, metalness: 0.1 }),
      );
      mesh.position.set(o.x, o.h / 2, o.z);
      boxes.push({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 });
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(mesh);
  });

  const fire = makeFire(group, hazards.find((h) => h.kind === 'fire'));
  const water = makeWater(group, hazards.find((h) => h.kind === 'water'));

  const payloads = payloadSpecs.map((spec) => makePayload(group, spec));
  // Yuklar ham sensor uchun ko'rinadi: robot ularni "ko'rib" chetlab o'tsin.
  payloads.forEach((p) => colliders.push(p.mesh));

  // Xona devorlari ham to'siq: robot ulardan o'tib keta olmasligi kerak.
  const wallColliders = [
    { x: 0, z: -HALF_D - WALL_THICK / 2, hw: HALF_W + WALL_THICK, hd: WALL_THICK },
    { x: 0, z: HALF_D + WALL_THICK / 2, hw: HALF_W + WALL_THICK, hd: WALL_THICK },
    { x: -HALF_W - WALL_THICK / 2, z: 0, hw: WALL_THICK, hd: HALF_D + WALL_THICK },
    { x: HALF_W + WALL_THICK / 2, z: 0, hw: WALL_THICK, hd: HALF_D + WALL_THICK },
  ];
  wallColliders.forEach((w) => boxes.push(w));

  // Devorlarning o'zi ham nurni to'sishi kerak — aks holda sensor xonadan
  // tashqariga "qarab", to'siq yo'q deb hisoblaydi.
  group.children.forEach((child) => {
    if (child.isMesh && child.geometry?.type === 'BoxGeometry' && child.position.y > 40 && !colliders.includes(child)) {
      colliders.push(child);
    }
  });

  /** Olov tebranishi va suv oqimi. `t` — sekundlarda o'tgan vaqt. */
  const update = (t) => {
    fire.flames.forEach((flame) => {
      const wobble = Math.sin(t * flame.userData.speed + flame.userData.phase);
      flame.scale.set(1 + wobble * 0.16, 1 + wobble * 0.34, 1 + wobble * 0.16);
      flame.position.y = flame.userData.baseY + wobble * 22;
      flame.material.opacity = 0.62 + (wobble + 1) * 0.16;
    });
    fire.light.intensity = 2.1 + Math.sin(t * 9.3) * 0.45 + Math.sin(t * 3.1) * 0.3;
    fire.embers.material.opacity = 0.6 + Math.sin(t * 4.2) * 0.16;

    water.texture.offset.x = (t * 0.06) % 1;
    water.texture.offset.y = (Math.sin(t * 0.4) * 0.05) % 1;
    water.surface.position.y = 50 + Math.sin(t * 1.6) * 3;
  };

  const dispose = () => {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  };

  return { group, colliders, boxes, circles, payloads, hazards, spawn, goal, dropZone, update, dispose };
}
