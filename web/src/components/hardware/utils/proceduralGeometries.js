import * as THREE from 'three';

// LEGO Standart o'lchamlari (mm hisobida, 1 stud = 8mm, pitch = 8mm)
const LEGO_PITCH = 8;
const LEGO_HOLE_RADIUS = 2.4;

/**
 * LEGO Technic / Spike Beam (G'o'la / Ramka) geometriyasi.
 * @param {number} holes - Teshiklar soni (3, 5, 7, 9, 11, 13, 15 ...)
 */
export function createLegoBeamGeometry({ holes = 5 } = {}) {
  const shape = new THREE.Shape();
  const width = 7.8;
  const length = holes * LEGO_PITCH;
  const radius = width / 2;
  const halfLen = length / 2;

  // Rounded caps beam shape
  shape.moveTo(-halfLen + radius, -radius);
  shape.lineTo(halfLen - radius, -radius);
  shape.absarc(halfLen - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-halfLen + radius, radius);
  shape.absarc(-halfLen + radius, 0, radius, Math.PI / 2, (Math.PI * 3) / 2, false);

  // Teshiklar (Pin holes)
  for (let i = 0; i < holes; i++) {
    const x = -halfLen + radius + i * LEGO_PITCH;
    const holePath = new THREE.Path();
    holePath.absarc(x, 0, LEGO_HOLE_RADIUS, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  }

  const extrudeSettings = {
    steps: 1,
    depth: 7.8,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.4,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic L-Beam (Burchakli 90° g'o'la) geometriyasi.
 */
export function createLegoLBeamGeometry({ holes1 = 3, holes2 = 5 } = {}) {
  const group = new THREE.Group();
  const beam1 = new THREE.Mesh(createLegoBeamGeometry({ holes: holes1 }));
  const beam2 = new THREE.Mesh(createLegoBeamGeometry({ holes: holes2 }));

  beam1.position.set(0, 0, 0);
  beam2.rotation.z = Math.PI / 2;
  beam2.position.set((holes1 * 4), (holes2 * 4), 0);

  group.add(beam1);
  group.add(beam2);
  return group;
}

/**
 * LEGO Technic Gear (Shesternya).
 * @param {number} teeth - Tishlar soni (8, 12, 16, 20, 24, 36, 40)
 */
export function createLegoGearGeometry({ teeth = 16 } = {}) {
  const shape = new THREE.Shape();
  // The gear module in the engineering sense - tooth pitch. Named `module`
  // originally, which a bundler reads as the CommonJS global.
  const toothModule = 1.2;
  const pitchRadius = (teeth * toothModule) / 2;
  const outerRadius = pitchRadius + toothModule;
  const innerRadius = Math.max(pitchRadius - toothModule * 1.2, 4);

  const angleStep = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * angleStep;
    const a1 = a0 + angleStep * 0.25;
    const a2 = a0 + angleStep * 0.5;
    const a3 = a0 + angleStep * 0.75;

    if (i === 0) {
      shape.moveTo(Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius);
    } else {
      shape.lineTo(Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius);
    }

    shape.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * innerRadius, Math.sin(a3) * innerRadius);
  }

  // Cross Axle Hole
  const crossHole = new THREE.Path();
  const w = 1.2;
  const r = 2.4;
  crossHole.moveTo(-w, -r);
  crossHole.lineTo(w, -r);
  crossHole.lineTo(w, -w);
  crossHole.lineTo(r, -w);
  crossHole.lineTo(r, w);
  crossHole.lineTo(w, w);
  crossHole.lineTo(w, r);
  crossHole.lineTo(-w, r);
  crossHole.lineTo(-w, w);
  crossHole.lineTo(-r, w);
  crossHole.lineTo(-r, -w);
  crossHole.lineTo(-w, -w);
  crossHole.closePath();
  shape.holes.push(crossHole);

  const extrudeSettings = {
    steps: 1,
    depth: 6,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.4,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Cross Axle (O'q).
 * @param {number} lengthStuds - Uzunlik studs hisobida (2..12)
 */
export function createLegoAxleGeometry({ lengthStuds = 5 } = {}) {
  const shape = new THREE.Shape();
  const w = 1.15;
  const r = 2.35;

  // Cross '+' shakli
  shape.moveTo(-w, -r);
  shape.lineTo(w, -r);
  shape.lineTo(w, -w);
  shape.lineTo(r, -w);
  shape.lineTo(r, w);
  shape.lineTo(w, w);
  shape.lineTo(w, r);
  shape.lineTo(-w, r);
  shape.lineTo(-w, w);
  shape.lineTo(-r, w);
  shape.lineTo(-r, -w);
  shape.lineTo(-w, -w);
  shape.closePath();

  const length = lengthStuds * LEGO_PITCH - 0.4;
  const extrudeSettings = {
    steps: 1,
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.2,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Pin (Shtift) geometriyasi.
 */
export function createLegoPinGeometry({ isLong = false, isHalf = false } = {}) {
  const height = isLong ? 23.5 : isHalf ? 8.0 : 15.5;
  const geo = new THREE.CylinderGeometry(2.38, 2.38, height, 32);
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Bush (Vtulka) geometriyasi.
 */
export function createLegoBushGeometry({ isHalf = false } = {}) {
  const outerRadius = 3.75;
  const innerRadius = 2.4;
  const height = isHalf ? 3.8 : 7.8;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.3,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Connector / Cross Block geometriyasi.
 */
export function createLegoConnectorGeometry() {
  const shape = new THREE.Shape();
  const size = 7.8;
  const half = size / 2;

  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, LEGO_HOLE_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings = {
    steps: 1,
    depth: 15.6,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.4,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Tire (Shina) geometriyasi.
 */
export function createLegoTireGeometry() {
  const geo = new THREE.TorusGeometry(18, 6, 24, 48);
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Rim (Diska) geometriyasi.
 */
export function createLegoRimGeometry() {
  const outerRadius = 15;
  const innerRadius = 12;
  const height = 12;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.5,
    bevelSegments: 3,
    curveSegments: 32,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * LEGO Technic Panel geometriyasi.
 */
export function createLegoPanelGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(40, 0);
  shape.lineTo(32, 20);
  shape.lineTo(0, 20);
  shape.closePath();

  const extrudeSettings = {
    steps: 1,
    depth: 3.5,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.4,
    bevelSegments: 2,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

/**
 * Standart Tishli Shesternya (Generic Gear).
 */
export function createGearGeometry({ radius = 15, teeth = 12, depth = 5 } = {}) {
  return createLegoGearGeometry({ teeth });
}

/**
 * Spiral Prujina (Spring) geometriyasi.
 */
export function createSpringGeometry({ springSize = 'kichik', radius, tubeRadius, turns, height } = {}) {
  let r = radius || 8;
  let h = height || 30;
  let t = turns || 4;
  let tr = tubeRadius || 1.8;

  if (springSize === 'katta') {
    r = 15;
    h = 60;
    t = 8;
    tr = 2.4;
  }

  class SpiralCurve extends THREE.Curve {
    constructor(cr, ch, ct) {
      super();
      this.r = cr;
      this.h = ch;
      this.t = ct;
    }
    getPoint(u) {
      const theta = u * Math.PI * 2 * this.t;
      const x = this.r * Math.cos(theta);
      const z = this.r * Math.sin(theta);
      const y = (u - 0.5) * this.h;
      return new THREE.Vector3(x, y, z);
    }
  }

  const path = new SpiralCurve(r, h, t);
  const geo = new THREE.TubeGeometry(path, t * 30, tr, 12, false);
  geo.center();
  return geo;
}

/**
 * Uzatma Val / O'q geometriyasi.
 */
export function createAxleGeometry({ radius = 2.5, length = 60 } = {}) {
  return createLegoAxleGeometry({ lengthStuds: 8 });
}

/**
 * Korpus Ramka Bloki.
 */
export function createFrameBeamGeometry({ width = 40, height = 40, depth = 10 } = {}) {
  return createLegoBeamGeometry({ holes: 7 });
}

/**
 * Servo Motor (SG90).
 */
export function createServoMotorMesh() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(12.5, 22.5, 23);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  const shaftGeo = new THREE.CylinderGeometry(2.5, 2.5, 6, 16);
  const shaftMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.set(0, 14, -5);

  group.add(body);
  group.add(shaft);
  return group;
}

/**
 * Stepper Motor (NEMA 17).
 */
export function createStepperMotorMesh() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(42, 42, 40);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  const shaftGeo = new THREE.CylinderGeometry(2.5, 2.5, 20, 16);
  const shaftMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.1 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.set(0, 30, 0);

  group.add(body);
  group.add(shaft);
  return group;
}

/**
 * LEGO Distance Sensor (Masofa Sensori).
 */
export function createLegoDistanceSensorMesh() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(40, 20, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  const eyeGeo = new THREE.CylinderGeometry(6, 6, 4, 24);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2 });

  const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
  eye1.rotation.x = Math.PI / 2;
  eye1.position.set(-10, 0, 8);

  const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
  eye2.rotation.x = Math.PI / 2;
  eye2.position.set(10, 0, 8);

  group.add(body);
  group.add(eye1);
  group.add(eye2);
  return group;
}

/**
 * LEGO Spike Hub / Microcontroller.
 */
export function createLegoSpikeHubMesh() {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(56, 40, 32);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  const screenGeo = new THREE.PlaneGeometry(24, 24);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#0284c7' });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 20.1, 0);
  screen.rotation.x = -Math.PI / 2;

  group.add(body);
  group.add(screen);
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// Robot shassisi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MUHIM — O'LCHOV BIRLIGI.
 * Bu fayldagi boshqa geometriyalar millimetrda yasalgan (LEGO_PITCH = 8 mm).
 * Lekin sahnaning asosiy birligi LDU (LDraw unit, 1 LDU = 0.4 mm), chunki
 * detallarning katta qismi LDraw kutubxonasidan keladi, elektronika (.3mf) ham
 * shu birlikka keltiriladi (ThreeScene.jsx dagi MM_TO_LDU).
 *
 * Shassi real elektronika detallari yonida turishi kerak, shuning uchun u
 * LDU da yasaladi: mm qiymatlari MM ko'paytiruvchisi orqali o'tadi.
 * (Eski protsedural detallar mm da qolgan — ular LDraw detallaridan 2.5 barobar
 * kichik ko'rinadi. Bu avvaldan mavjud nomuvofiqlik, alohida hal qilinishi kerak.)
 */
const MM = 2.5; // 1 mm = 2.5 LDU

/**
 * Robot shassisi: burchaklari yumaloqlangan plita, ustida o'rnatish teshiklari
 * to'ri. Real 2WD/4WD robot shassisi akril yoki alyuminiy plita bo'ladi —
 * bu shuning modeli.
 *
 * @param {number} lengthMm - uzunligi (mm), default 160
 * @param {number} widthMm  - kengligi (mm), default 110
 * @param {number} thickMm  - qalinligi (mm), default 3
 */
/**
 * Shassi teshik markazlarini LDU koordinatalarida hisoblash
 */
export function getChassisHoles({ lengthMm = 160, widthMm = 110 } = {}) {
  const L = lengthMm * MM;
  const W = widthMm * MM;
  const pitch = 20 * MM;
  const margin = 12 * MM;
  const nx = Math.floor((L - 2 * margin) / pitch);
  const nz = Math.floor((W - 2 * margin) / pitch);
  const holes = [];

  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const x = -L / 2 + margin + i * pitch;
      const z = -W / 2 + margin + j * pitch;
      holes.push({ x, z });
    }
  }
  return holes;
}

export function createRobotChassisGeometry({ lengthMm = 160, widthMm = 110, thickMm = 3 } = {}) {
  const L = lengthMm * MM;
  const W = widthMm * MM;
  const T = thickMm * MM;
  const r = Math.min(L, W) * 0.08; // burchak radiusi

  const shape = new THREE.Shape();
  shape.moveTo(-L / 2 + r, -W / 2);
  shape.lineTo(L / 2 - r, -W / 2);
  shape.absarc(L / 2 - r, -W / 2 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(L / 2, W / 2 - r);
  shape.absarc(L / 2 - r, W / 2 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-L / 2 + r, W / 2);
  shape.absarc(-L / 2 + r, W / 2 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-L / 2, -W / 2 + r);
  shape.absarc(-L / 2 + r, -W / 2 + r, r, Math.PI, (Math.PI * 3) / 2, false);

  const holeR = 1.6 * MM; // M3 vint uchun ~3.2 mm diametr
  const holes = getChassisHoles({ lengthMm, widthMm });
  for (const h of holes) {
    const hole = new THREE.Path();
    hole.absarc(h.x, h.z, holeR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: T,
    bevelEnabled: true,
    bevelThickness: T * 0.12,
    bevelSize: T * 0.12,
    bevelSegments: 2,
    curveSegments: 12,
  });
  // Extrude XY tekislikda ishlaydi; plita yotgan holatda (XZ) bo'lishi kerak.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -T / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Kaster (erkin aylanuvchi tayanch g'ildirak) — 2WD robotning uchinchi tayanchi.
 *
 * Nega protsedural: bu oddiy mexanik shakl (g'ildirak + burilma kronshteyn),
 * uni yuklab olishning ma'nosi yo'q. Yuklab olingan CAD modeli 8 dyuymli
 * sanoat kasteri bo'lib chiqqan edi (244 mm) — robot uchun yaroqsiz.
 *
 * O'lchamlari real kichik robot kasteriga mos: g'ildirak diametri 25 mm,
 * umumiy balandligi ~34 mm. LDU da yasaladi (yuqoridagi MM izohiga qara).
 */
export function createCasterMesh({ wheelDiaMm = 25 } = {}) {
  const group = new THREE.Group();

  const wheelR = (wheelDiaMm / 2) * MM;
  const wheelW = 8 * MM;
  const forkH = wheelR + 4 * MM;    // vilka g'ildirak ustidan o'tadi
  const plateSize = 25 * MM;
  const plateT = 2 * MM;

  const rubber = new THREE.MeshStandardMaterial({ color: '#1f2328', metalness: 0, roughness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa4b2', metalness: 0.75, roughness: 0.35 });

  // G'ildirak: o'qi Z bo'ylab (robot kengligi), shuning uchun X atrofida 90°.
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 24), rubber);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = wheelR;
  group.add(wheel);

  // Vilkaning ikki yon plastinasi
  for (const z of [-(wheelW / 2 + plateT), wheelW / 2 + plateT]) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(wheelR * 1.6, forkH + wheelR, plateT * 1.4),
      steel
    );
    side.position.set(0, wheelR + forkH / 2 - wheelR * 0.1, z);
    group.add(side);
  }

  // Vilkaning tepasi va burilma plita (robotga vint bilan mahkamlanadigan qism)
  const yoke = new THREE.Mesh(
    new THREE.BoxGeometry(wheelR * 1.6, plateT * 1.4, wheelW + plateT * 4),
    steel
  );
  yoke.position.y = wheelR + forkH;
  group.add(yoke);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(plateSize, plateT, plateSize), steel);
  plate.position.y = wheelR + forkH + plateT * 1.5;
  group.add(plate);

  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(3 * MM, 3 * MM, plateT * 3, 12), steel);
  pivot.position.y = wheelR + forkH + plateT * 0.5;
  group.add(pivot);

  // Koordinata boshini markazga keltiramiz — yig'mada joylashtirish oson bo'lsin.
  const box = new THREE.Box3().setFromObject(group);
  const c = box.getCenter(new THREE.Vector3());
  group.children.forEach((ch) => ch.position.sub(c));

  group.traverse((ch) => {
    if (ch.isMesh) { ch.castShadow = true; ch.receiveShadow = true; }
  });
  return group;
}
