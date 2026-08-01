import * as THREE from 'three';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js';

// Blob URL va papka fayllar xaritasi (Map<relativePath, blobUrl>)
const localFilesMap = new Map();
let isLocalLibraryLoaded = false;
let currentCdnUrl = '/ldraw/';

// LoadingManager va LDrawLoader tayyorlash
const loadingManager = new THREE.LoadingManager();
const ldrawLoader = new LDrawLoader(loadingManager);
ldrawLoader.setConditionalLineMaterial(LDrawConditionalLineMaterial);

// URLModifier orqali so'rovlarni mahalliy Blob URL larga yoki CDN ga yo'naltirish
loadingManager.setURLModifier((url) => {
  if (isLocalLibraryLoaded && localFilesMap.size > 0) {
    // Nisbiy yo'lni tozalash (masalan: "parts/32270.dat" yoki "p/4-4edge.dat")
    let cleanPath = url.replace(/\\/g, '/');
    const partsIdx = cleanPath.indexOf('parts/');
    const pIdx = cleanPath.indexOf('p/');

    let relativePath = cleanPath;
    if (partsIdx !== -1) {
      relativePath = cleanPath.substring(partsIdx);
    } else if (pIdx !== -1) {
      relativePath = cleanPath.substring(pIdx);
    } else {
      const lastSlash = cleanPath.lastIndexOf('/');
      if (lastSlash !== -1) {
        relativePath = cleanPath.substring(lastSlash + 1);
      }
    }

    const lowerKey = relativePath.toLowerCase();

    // Map dan qidirish
    for (const [key, blobUrl] of localFilesMap.entries()) {
      if (key.toLowerCase().endsWith(lowerKey) || lowerKey.endsWith(key.toLowerCase())) {
        return blobUrl;
      }
    }
  }

  return url;
});

// Default kutubxona yo'lini sozlash.
// DIQQAT: LDrawLoader ikkita alohida yo'l ishlatadi va ikkalasi ham kerak:
//   setPath()             — so'ralgan asosiy detal fayli uchun;
//   setPartsLibraryPath() — o'sha detal ichidan havola qilingan primitivlar
//                           (4-4cyli.dat, stud.dat, parts/s/*.dat...) uchun.
// Ikkinchisi sozlanmasa, primitivlar sahifa ildizidan ("/4-4cyli.dat") so'raladi,
// Vite esa mavjud bo'lmagan yo'lga index.html qaytaradi va loader
// "Unknown line type <!doctype" xatosi bilan yiqiladi — natijada har bir detal
// placeholder qutiga aylanadi. Shuning uchun ikkalasini birga sozlaymiz.
function applyLibraryPath(path) {
  ldrawLoader.setPath(path);
  ldrawLoader.setPartsLibraryPath(path);
}

applyLibraryPath(currentCdnUrl);

let materialsPreloaded = false;
export async function ensureLDrawMaterials() {
  if (materialsPreloaded) return;
  try {
    await ldrawLoader.preloadMaterials('LDConfig.ldr');
    materialsPreloaded = true;
  } catch (err) {
    console.warn('LDConfig.ldr yuklashda ogohlantirish (default materiallar qo\'llanadi):', err);
  }
}

/**
 * Mahalliy LDraw papkasini (<input webkitdirectory>) ulash
 */
export function setLocalLDrawFolder(fileList) {
  localFilesMap.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
  localFilesMap.clear();

  let count = 0;
  Array.from(fileList).forEach((file) => {
    // webkitRelativePath masalan: "ldraw/parts/32270.dat"
    const relPath = file.webkitRelativePath || file.name;
    const blobUrl = URL.createObjectURL(file);
    localFilesMap.set(relPath, blobUrl);
    count++;
  });

  isLocalLibraryLoaded = count > 0;
  return count;
}

/**
 * CDN manbasini o'zgartirish
 */
export function setCdnFallbackUrl(cdnUrl) {
  if (!cdnUrl) return;
  currentCdnUrl = cdnUrl.endsWith('/') ? cdnUrl : `${cdnUrl}/`;
  applyLibraryPath(currentCdnUrl);
}

export function getLDrawLibraryStatus() {
  return {
    isLocal: isLocalLibraryLoaded,
    fileCount: localFilesMap.size,
    cdnUrl: currentCdnUrl,
  };
}

export { ldrawLoader };
