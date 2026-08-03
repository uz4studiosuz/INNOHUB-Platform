import * as THREE from 'three';

/**
 * Sinov xonasi (simulation room) — robotni haqiqiy to'siqlar orasida sinash uchun.
 *
 * Barcha o'lchamlar LDraw birligida (1 LDU = 0.4 mm), chunki sahnadagi
 * detallar ham shu birlikda. Ya'ni 2500 LDU = 1 metr: xona taxminan
 * 1.2 m x 0.9 m — real robot sinov stoli o'lchamida.
 */
export const ROOM_WIDTH = 5200;   // X bo'ylab
export const ROOM_DEPTH = 3800;   // Z bo'ylab
export const WALL_HEIGHT = 360;
export const WALL_THICK = 50;
export const FLOOR_Y = 0;

const HALF_W = ROOM_WIDTH / 2;
const HALF_D = ROOM_DEPTH / 2;

/** Poligonlar nisbiy koordinatalarda yoziladi: fx/fz = -1..+1 xonaning
 * chekkalari. Shunda xona o'lchamini o'zgartirish to'siqlarni ham birga
 * kengaytiradi — aks holda kattaroq xonada hamma to'siq markazda uyum
 * bo'lib qolardi va atrofda bo'sh maydon qolib ketardi. */
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
  // plitka choklari
  ctx.strokeStyle = 'rgba(120,140,165,0.30)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  // yengil g'adir-budurlik
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

/**
 * To'siq maketlari. Har bir poligon o'z ro'yxatini qaytaradi.
 *
 * box:      { kind:'box', x, z, w, d, h, color }
 * cylinder: { kind:'cylinder', x, z, r, h, color }  — konus/bochka
 *
 * MUHIM: qutilar faqat o'qlarga parallel (aylantirilmagan). Shu sharoitda
 * to'qnashuv tekshiruvi oddiy AABB bo'lib qoladi — burchak ostidagi devor
 * uchun OBB matematikasi kerak bo'lardi, u esa bu yerda hech qanday
 * pedagogik qiymat qo'shmaydi.
 */
const COURSE_BUILDERS = {
  /** Slalom: konuslar zigzagi + ikkita yarim devor + finish darvozasi. */
  slalom() {
    const obstacles = [];
    const cones = 8;
    for (let i = 0; i < cones; i++) {
      const x = fx(-0.66 + (1.32 * i) / (cones - 1));
      const z = i % 2 === 0 ? fz(-0.34) : fz(0.34);
      obstacles.push({ kind: 'cylinder', x, z, r: 62, h: 200, color: '#f97316', cone: true });
      obstacles.push({ kind: 'cylinder', x, z: -z * 0.28, r: 50, h: 165, color: '#f59e0b', cone: true });
    }
    obstacles.push({ kind: 'box', x: fx(-0.2), z: fz(-0.62), w: 70, d: fz(0.42), h: 220, color: '#3f4b5c' });
    obstacles.push({ kind: 'box', x: fx(0.24), z: fz(0.62), w: 70, d: fz(0.42), h: 220, color: '#3f4b5c' });
    // finish darvozasi
    obstacles.push({ kind: 'box', x: fx(0.78), z: fz(-0.22), w: 80, d: fz(0.28), h: 280, color: '#1f6f52' });
    obstacles.push({ kind: 'box', x: fx(0.78), z: fz(0.22), w: 80, d: fz(0.28), h: 280, color: '#1f6f52' });
    return {
      obstacles,
      spawn: { x: fx(-0.88), z: 0, heading: 0 },
      goal: { x: fx(0.9), z: 0, r: 260 },
    };
  },

  /** Labirint: to'g'ri burchakli devorlar tarmog'i, chiqish qarama-qarshi burchakda. */
  maze() {
    const obstacles = [];
    const wall = (x, z, w, d) => obstacles.push({ kind: 'box', x, z, w, d, h: 320, color: '#46536b' });
    const T = 65;
    // vertikal to'siqlar (Z bo'ylab cho'zilgan)
    wall(fx(-0.58), fz(-0.52), T, fz(0.86));
    wall(fx(-0.2), fz(0.5), T, fz(0.9));
    wall(fx(0.14), fz(-0.56), T, fz(0.78));
    wall(fx(0.52), fz(0.46), T, fz(0.94));
    // gorizontal to'siqlar (X bo'ylab cho'zilgan)
    wall(fx(-0.4), fz(0.08), fx(0.4), T);
    wall(fx(0.02), fz(-0.12), fx(0.4), T);
    wall(fx(0.36), fz(0.26), fx(0.32), T);
    wall(fx(-0.7), fz(-0.24), fx(0.26), T);
    // markazdagi ustun
    obstacles.push({ kind: 'box', x: 0, z: fz(0.36), w: 210, d: 210, h: 360, color: '#334056' });
    return {
      obstacles,
      spawn: { x: fx(-0.88), z: fz(-0.84), heading: 0 },
      goal: { x: fx(0.88), z: fz(0.84), r: 270 },
    };
  },

  /** Ombor: tarqoq yashiklar va bochkalar — eng erkin, "o'yin" xaritasi. */
  warehouse() {
    const obstacles = [];
    const crateColors = ['#8a5a2b', '#7a6a45', '#6b4f2a'];
    // Start va finish yo'laklari bo'sh qolishi kerak, aks holda robot
    // birinchi kadrdayoq yashik ichida paydo bo'ladi.
    const inEndZone = (x, z) => Math.abs(x) > HALF_W * 0.66 && Math.abs(z) < HALF_D * 0.3;

    for (let i = 0; i < 18; i++) {
      const x = (seeded(i * 5 + 21) - 0.5) * ROOM_WIDTH * 0.82;
      const z = (seeded(i * 5 + 22) - 0.5) * ROOM_DEPTH * 0.82;
      if (inEndZone(x, z)) continue;
      const size = 150 + seeded(i * 5 + 23) * 150;
      obstacles.push({
        kind: 'box',
        x,
        z,
        w: size,
        d: size,
        h: size * (0.7 + seeded(i * 5 + 24) * 0.6),
        color: crateColors[Math.floor(seeded(i * 5 + 25) * crateColors.length)],
      });
    }
    for (let i = 0; i < 11; i++) {
      const x = (seeded(i * 7 + 41) - 0.5) * ROOM_WIDTH * 0.78;
      const z = (seeded(i * 7 + 42) - 0.5) * ROOM_DEPTH * 0.78;
      if (inEndZone(x, z)) continue;
      obstacles.push({ kind: 'cylinder', x, z, r: 88, h: 240, color: i % 2 ? '#2b6cb0' : '#a13b3b' });
    }
    return {
      obstacles,
      spawn: { x: fx(-0.88), z: 0, heading: 0 },
      goal: { x: fx(0.89), z: 0, r: 280 },
    };
  },
};

export const COURSE_PRESETS = [
  { id: 'slalom', label: 'Slalom poligoni', hint: 'Konuslar orasidan zigzag bo‘ylab o‘tish' },
  { id: 'maze', label: 'Labirint', hint: 'Devorlar orasidan chiqish yo‘lini topish' },
  { id: 'warehouse', label: 'Ombor', hint: 'Tarqoq yashik va bochkalar orasida yurish' },
];

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

    // devor tagidagi ogohlantirish lentasi
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

  // burchak ustunlari
  [[-HALF_W, -HALF_D], [HALF_W, -HALF_D], [-HALF_W, HALF_D], [HALF_W, HALF_D]].forEach(([x, z]) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 66, WALL_HEIGHT * 1.25, 12),
      new THREE.MeshStandardMaterial({ color: '#2a323d', roughness: 0.6, metalness: 0.35 }),
    );
    pillar.position.set(x, (WALL_HEIGHT * 1.25) / 2, z);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // shift chiroqlari — xonaga "ichkarida" hissini beradi
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: '#dfe9f5',
    emissive: '#cfe4ff',
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  [-ROOM_WIDTH * 0.28, ROOM_WIDTH * 0.28].forEach((x) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(160, 18, ROOM_DEPTH * 0.72), lampMaterial);
    lamp.position.set(x, WALL_HEIGHT * 1.18, 0);
    group.add(lamp);
  });
}

/** Start maydonchasi va finish halqasi — poligonning "o'yin" qismi. */
function makeZones(group, spawn, goal) {
  const start = new THREE.Mesh(
    new THREE.CircleGeometry(210, 40),
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
}

/**
 * Poligonni quradi va to'qnashuv ma'lumotlarini qaytaradi.
 *
 * Qaytadi: { group, colliders, boxes, circles, spawn, goal, dispose }
 *  - colliders: nur (raycast) uchun mesh ro'yxati — ultratovush sensori shularni "ko'radi"
 *  - boxes/circles: to'qnashuvni hal qilish uchun soddalashtirilgan shakllar
 */
export function buildArena(courseId = 'slalom') {
  const builder = COURSE_BUILDERS[courseId] || COURSE_BUILDERS.slalom;
  const { obstacles, spawn, goal } = builder();

  const group = new THREE.Group();
  group.name = 'simulation-arena';
  makeRoomShell(group);
  makeZones(group, spawn, goal);

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

  // Xona devorlari ham to'siq: robot ulardan o'tib keta olmasligi kerak.
  // Ichki yuzasi bo'ylab tekis to'rtta AABB sifatida yozamiz.
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

  const dispose = () => {
    group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
  };

  return { group, colliders, boxes, circles, spawn, goal, dispose };
}
