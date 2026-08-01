import * as THREE from 'three';
import { loadLDrawPart } from '../library/ldrawPartsCache';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  getCatalogEntry,
  getMaterialConfig,
} from '../data/catalog';
import {
  createLegoGearGeometry,
  createLegoBeamGeometry,
  createLegoAxleGeometry,
  createLegoPinGeometry,
  createLegoBushGeometry,
  createLegoConnectorGeometry,
  createLegoTireGeometry,
  createLegoRimGeometry,
  createLegoPanelGeometry,
  createLegoLBeamGeometry,
  createLegoDistanceSensorMesh,
  createGearGeometry,
  createSpringGeometry,
  createAxleGeometry,
  createFrameBeamGeometry,
  createServoMotorMesh,
  createStepperMotorMesh,
  createCasterMesh,
  createRobotChassisGeometry,
} from './proceduralGeometries';

// ── IndexedDB Keshlash (hk_thumbs) ──
const DB_NAME = 'hk_thumbs';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const CURRENT_VERSION = 2;

let dbPromise = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

async function getCachedThumbnailFromDB(key) {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result;
        if (res && res.v === CURRENT_VERSION && res.dataUrl) {
          resolve(res.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveThumbnailToDB(key, dataUrl) {
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ v: CURRENT_VERSION, dataUrl }, key);
  } catch {
    // IDB xatolarini yutish
  }
}

// ── Uncolored 3MF Tekshiruv Xizmati ──
export function checkIs3mfModelUncolored(model) {
  const uniq = new Set();
  model.traverse((child) => {
    const col = child.geometry?.attributes?.color;
    if (!col || uniq.size > 2) return;
    const step = Math.max(1, Math.floor(col.count / 8));
    for (let i = 0; i < col.count; i += step) {
      uniq.add(
        [0, 1, 2].map((k) => Math.round(col.getComponent(i, k) * 255)).join(',')
      );
    }
  });
  return uniq.size <= 2;
}

// ── Bitta Offscreen Renderer va Kesh ──
const memoryCache = new Map();
const pendingRequests = new Map();

const queue = [];
let activeCount = 0;
const MAX_PARALLEL = 2;

let offscreenRenderer = null;
let offscreenScene = null;
let offscreenCamera = null;
let ldrawRootGroup = null;
let mainGroup = null;

function initOffscreenRenderer() {
  if (offscreenRenderer) return;

  offscreenRenderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  offscreenRenderer.setSize(96, 96);
  offscreenRenderer.setPixelRatio(1);
  offscreenRenderer.setClearColor(0x000000, 0);

  offscreenScene = new THREE.Scene();

  const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(100, 200, 150);
  offscreenScene.add(ambLight);
  offscreenScene.add(dirLight);

  // LDraw Y pastga qaragani uchun root guruh rotation.x = Math.PI bo'ladi
  ldrawRootGroup = new THREE.Group();
  ldrawRootGroup.rotation.x = Math.PI;
  offscreenScene.add(ldrawRootGroup);

  mainGroup = new THREE.Group();
  offscreenScene.add(mainGroup);

  offscreenCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
}

function frameAndRender(model, isLDraw, itemKey = 'unknown') {
  ldrawRootGroup.clear();
  mainGroup.clear();

  // Keshdagi asl obyektga tegmaslik uchun har safar clone(true) qilamiz
  const clonedModel = model.clone(true);

  // Aylantirilmagan wrapper ichida markazlashtirish (Box3 setFromObject dunyo koordinatasini beradi)
  const wrapper = new THREE.Group();
  wrapper.add(clonedModel);
  wrapper.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(wrapper);
  const sphere = box.getBoundingSphere(new THREE.Sphere());

  if (sphere.radius === 0) sphere.radius = 10;

  clonedModel.position.sub(sphere.center);

  if (isLDraw) {
    ldrawRootGroup.add(wrapper);
  } else {
    mainGroup.add(wrapper);
  }

  const d = sphere.radius * 2.6;
  offscreenCamera.position.set(d * 0.6, d * 0.5, d * 0.75);
  offscreenCamera.lookAt(0, 0, 0);

  offscreenRenderer.render(offscreenScene, offscreenCamera);
  const dataUrl = offscreenRenderer.domElement.toDataURL('image/webp', 0.8);

  // Instrumentatsiya: har render'dan keyin konsolga chiqarish (Tugma 3)
  console.log(`[THUMB] ${itemKey} | radius: ${sphere.radius.toFixed(2)} | dataUrl.length: ${dataUrl.length}`);

  ldrawRootGroup.clear();
  mainGroup.clear();

  // Bo'sh rasmni keshlamaslik (dataUrl.length < 800 bo'lsa render muvaffaqiyatsiz, Tugma 4)
  if (dataUrl.length < 800) {
    return null;
  }

  return dataUrl;
}

function loadFileModel(fileName, item, entry) {
  return new Promise((resolve) => {
    const path = `/models/${fileName}`;
    if (fileName.endsWith('.3mf')) {
      const loader = new ThreeMFLoader();
      loader.load(
        path,
        (model) => {
          const uncolored = checkIs3mfModelUncolored(model);
          if (uncolored) {
            const hexColor = item.colorHex || getMaterialConfig(item.type || entry?.type)?.color || '#3b82f6';
            model.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: hexColor,
                  roughness: 0.3,
                  metalness: 0.2,
                });
              }
            });
          }
          resolve(model);
        },
        undefined,
        () => resolve(null)
      );
    } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
      const loader = new GLTFLoader();
      loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        () => resolve(null)
      );
    } else if (fileName.endsWith('.stl')) {
      const loader = new STLLoader();
      loader.load(
        path,
        (geometry) => {
          const mat = new THREE.MeshStandardMaterial({ color: item.colorHex || '#3b82f6' });
          resolve(new THREE.Mesh(geometry, mat));
        },
        undefined,
        () => resolve(null)
      );
    } else {
      resolve(null);
    }
  });
}

function createProceduralModelForItem(item, entry) {
  const type = item.type || '';
  const genType = entry?.generatorType || entry?.generator || type || item.generator;
  const config = getMaterialConfig(type);
  const color = item.colorHex || config?.color || '#3b82f6';

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: config?.roughness ?? 0.3,
    metalness: config?.metalness ?? 0.2,
  });

  let geo = null;
  const sc = item.subcat;

  if (genType === 'lego_beam' || sc === 'beam_straight' || sc === 'beam_frame') {
    geo = createLegoBeamGeometry({ holes: item.params?.holes || entry?.defaultParams?.holes || 5 });
  } else if (genType === 'lego_gear' || sc === 'gear') {
    geo = createLegoGearGeometry({ teeth: item.params?.teeth || entry?.defaultParams?.teeth || 16 });
  } else if (genType === 'lego_axle' || sc === 'axle') {
    geo = createLegoAxleGeometry({ lengthStuds: item.params?.lengthStuds || entry?.defaultParams?.lengthStuds || 5 });
  } else if (sc === 'pin') {
    geo = createLegoPinGeometry({});
  } else if (sc === 'bush') {
    geo = createLegoBushGeometry({});
  } else if (sc === 'connector') {
    geo = createLegoConnectorGeometry({});
  } else if (sc === 'tire') {
    geo = createLegoTireGeometry();
  } else if (sc === 'wheel' || sc === 'pulley') {
    geo = createLegoRimGeometry();
  } else if (sc === 'panel') {
    geo = createLegoPanelGeometry();
  } else if (sc === 'beam_angular') {
    geo = createLegoLBeamGeometry({ holes1: 3, holes2: 5 });
  } else if (sc === 'sensor') {
    return createLegoDistanceSensorMesh();
  } else if (genType === 'gear') {
    geo = createGearGeometry({ teeth: item.params?.teeth || 12 });
  } else if (genType === 'spring') {
    geo = createSpringGeometry({ springSize: item.params?.springSize || 'kichik' });
  } else if (genType === 'axle') {
    geo = createAxleGeometry();
  } else if (genType === 'frame_beam') {
    geo = createFrameBeamGeometry();
  } else if (genType === 'servo' || sc === 'electric') {
    return createServoMotorMesh();
  } else if (genType === 'stepper') {
    return createStepperMotorMesh();
  } else if (genType === 'caster') {
    return createCasterMesh({ wheelDiaMm: item.params?.wheelDiaMm || 25 });
  } else if (genType === 'robot_chassis') {
    geo = createRobotChassisGeometry({
      lengthMm: item.params?.lengthMm || 160,
      widthMm: item.params?.widthMm || 110,
      thickMm: item.params?.thickMm || 3,
    });
  }

  if (geo) {
    return new THREE.Mesh(geo, material);
  }
  return null;
}

async function renderItemThumbnail(item) {
  initOffscreenRenderer();

  const isLDraw = item.isLDraw || (item.type && item.type.startsWith('ldraw:'));
  const partNum = item.partNum || (item.type && item.type.replace('ldraw:', ''));
  const itemKey = isLDraw ? `ldraw_${partNum}` : item.type || item.partNum || item.name || 'unknown';

  if (isLDraw && partNum) {
    try {
      const ldrawGroup = await loadLDrawPart(partNum, item.colorCode || 71, item.name || '');
      return frameAndRender(ldrawGroup, true, itemKey);
    } catch {
      // Fallback below
    }
  }

  const type = item.type || '';
  const entry = getCatalogEntry(type);
  const fileName = item.file || entry?.file;

  if (fileName) {
    const model = await loadFileModel(fileName, item, entry);
    if (model) return frameAndRender(model, false, itemKey);
  }

  const procModel = createProceduralModelForItem(item, entry);
  if (procModel) {
    return frameAndRender(procModel, false, itemKey);
  }

  return null;
}

function processQueue() {
  if (activeCount >= MAX_PARALLEL || queue.length === 0) return;

  activeCount++;
  const task = queue.shift();

  renderItemThumbnail(task.item)
    .then((dataUrl) => {
      task.onComplete(dataUrl);
    })
    .catch((err) => {
      console.warn(`Thumbnail render error for ${task.key}:`, err);
      task.onComplete(null);
    })
    .finally(() => {
      activeCount--;
      processQueue();
    });
}

/**
 * Detal uchun 3D rasmni olish / generatsiya qilish
 */
export function getPartThumbnail(item) {
  if (!item) return Promise.resolve(null);

  const key = item.isLDraw ? `ldraw_${item.partNum}` : item.type || item.partNum || item.name;

  if (memoryCache.has(key)) {
    return Promise.resolve(memoryCache.get(key));
  }

  if (pendingRequests.has(key)) {
    return new Promise((resolve) => {
      pendingRequests.get(key).push(resolve);
    });
  }

  pendingRequests.set(key, []);

  return new Promise((resolve) => {
    getCachedThumbnailFromDB(key).then((dbData) => {
      if (dbData) {
        memoryCache.set(key, dbData);
        resolve(dbData);
        const pending = pendingRequests.get(key) || [];
        pendingRequests.delete(key);
        pending.forEach((cb) => cb(dbData));
        return;
      }

      queue.push({
        item,
        key,
        onComplete: (dataUrl) => {
          if (dataUrl) {
            memoryCache.set(key, dataUrl);
            saveThumbnailToDB(key, dataUrl);
          }
          resolve(dataUrl);
          const pending = pendingRequests.get(key) || [];
          pendingRequests.delete(key);
          pending.forEach((cb) => cb(dataUrl));
        },
      });

      processQueue();
    });
  });
}

/**
 * Oldindan keshlash (§4) — background idle task
 */
export function preloadThumbnails(itemList = []) {
  const runPreload = () => {
    itemList.forEach((item) => {
      getPartThumbnail(item);
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(runPreload, { timeout: 3000 });
  } else {
    setTimeout(runPreload, 1000);
  }
}
