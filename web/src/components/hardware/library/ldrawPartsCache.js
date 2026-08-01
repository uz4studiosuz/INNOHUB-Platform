import * as THREE from 'three';
import { ldrawLoader, ensureLDrawMaterials } from './ldrawLibrary';
import { getLDrawColorHex } from './ldrawColors';
import {
  createLegoGearGeometry,
  createLegoBeamGeometry,
  createLegoAxleGeometry,
  createServoMotorMesh,
  createStepperMotorMesh,
} from '../utils/proceduralGeometries';

// Parse qilingan LDraw part guruhlarini keshda saqlash: Map<partNum, THREE.Group>
const partCache = new Map();

/**
 * LDraw detalini yuklash yoki keshdan olish.
 * Agar detal topilmasa, placeholder box yaratadi.
 */
export async function loadLDrawPart(partNum, colorCode = 71, partName = '') {
  const cacheKey = `${partNum}`;

  let baseGroup = partCache.get(cacheKey);

  if (!baseGroup) {
    try {
      await ensureLDrawMaterials();
      const fileName = partNum.endsWith('.dat') ? partNum : `${partNum}.dat`;
      baseGroup = await ldrawLoader.loadAsync(`parts/${fileName}`);
      
      // Soyalarni va materiallarni yoqish hamda geometriyani silliqlash
      baseGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.geometry && (!child.geometry.attributes.normal || child.geometry.attributes.normal.count === 0)) {
            child.geometry.computeVertexNormals();
          }
        }
      });

      partCache.set(cacheKey, baseGroup);
    } catch (err) {
      console.warn(`LDraw loader: ${partNum} yuklanmadi, placeholder quti yaratiladi. Xatolik:`, err);
      baseGroup = createPlaceholderBox(partNum, partName);
      partCache.set(cacheKey, baseGroup);
    }
  }

  // Sahnaga qo'shish uchun keshdagi guruhni nusxalash (clone)
  const instance = baseGroup.clone(true);
  
  // Rangni va material sifatini o'zgartirish
  applyColorToLDrawGroup(instance, colorCode);

  return instance;
}

/**
 * LDraw guruhining material rangini va sifatini o'zgartirish
 */
export function applyColorToLDrawGroup(group, colorCode) {
  const hexColor = getLDrawColorHex(colorCode);

  group.traverse((child) => {
    if (child.isMesh) {
      const applyMatProps = (mat) => {
        const clone = mat.clone();
        clone.color.set(hexColor);
        clone.roughness = 0.22;
        clone.metalness = 0.12;
        clone.envMapIntensity = 1.0;
        return clone;
      };

      if (!child.material) {
        child.material = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.22,
          metalness: 0.12,
          envMapIntensity: 1.0,
        });
      } else if (Array.isArray(child.material)) {
        child.material = child.material.map(m => applyMatProps(m));
      } else {
        child.material = applyMatProps(child.material);
      }
    }
  });
}

/**
 * LDraw modeli yuklanmaganda (masalan CDN rate-limit yoki offline) —
 * detal nomi/raqamiga qarab mos protsedural shakl yaratadi (quti emas).
 * Nomdagi kalit so'zlar (Gear, Beam, Axle, Pin, Wheel, Motor...) va sonlar
 * (12T, 1x5, Axle 4) shakl va o'lchamni belgilaydi.
 */
function createPlaceholderBox(partNum, name = '') {
  const n = `${name} ${partNum}`.toLowerCase();
  const num = (re, def) => {
    const m = n.match(re);
    return m ? Number(m[1]) : def;
  };
  const has = (...words) => words.some((w) => n.includes(w));

  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.15 });
  let mesh;

  if (has('gear', 'shester', 'tishli', 'bevel', 'worm', 'chervya', 'rack', 'reyka', 'differ', 'turntable', 'toj')) {
    const teeth = num(/(\d+)\s*(?:t\b|tooth|tishli)/, num(/\b(\d{1,2})\b/, 16));
    mesh = new THREE.Mesh(createLegoGearGeometry({ teeth: Math.min(Math.max(teeth, 8), 40) }), material);
  } else if (has('servo')) {
    mesh = createServoMotorMesh();
  } else if (has('motor', 'l298', 'driver', 'drayver', 'sensor')) {
    mesh = createStepperMotorMesh();
  } else if (has('axle', "o'q", 'val') && !has('beam')) {
    const len = num(/axle\s*(\d+)/, num(/\b(\d{1,2})\b/, 5));
    mesh = new THREE.Mesh(createLegoAxleGeometry({ lengthStuds: Math.min(Math.max(len, 2), 16) }), material);
  } else if (has('beam', 'balka', 'liftarm', "g'o'la", 'frame', 'ramka', 'panel')) {
    const holes = num(/\d+\s*x\s*(\d+)/, num(/beam\s*(\d+)/, num(/\b(\d{1,2})\b/, 5)));
    mesh = new THREE.Mesh(createLegoBeamGeometry({ holes: Math.min(Math.max(holes, 2), 15) }), material);
  } else if (has('bush', 'vtulka')) {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 8, 20), material);
  } else if (has('pin', 'shtift', 'connector', 'konnektor')) {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 20, 16), material);
    mesh.rotation.z = Math.PI / 2;
  } else if (has('tire', 'shina', 'tasma')) {
    mesh = new THREE.Mesh(new THREE.TorusGeometry(18, 7, 16, 32), material);
  } else if (has('wheel', 'rim', "g'ildirak", 'caster')) {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 10, 28), material);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), material);
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

  // Ko'rinadigan, izchil o'lchamga normallashtirish (bounding sphere radiusi ~42)
  const bbox = new THREE.Box3().setFromObject(mesh);
  const sphere = bbox.getBoundingSphere(new THREE.Sphere());
  if (sphere.radius > 0) {
    mesh.scale.multiplyScalar(42 / sphere.radius);
  }

  group.add(mesh);
  group.userData = { isPlaceholder: true, partNum, name };
  return group;
}

/**
 * Keshni tozalash
 */
export function clearLDrawCache() {
  partCache.clear();
}
