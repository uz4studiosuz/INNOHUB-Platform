/**
 * LDraw .dat fayllaridan ulanish nuqtalarini (connectors) avtomatik ajratib olish.
 * Primitiv teshik va studlar joylashuvini 3D koordinatalarga aylantiradi, dedup qiladi,
 * Pin va Axle detallari uchun erkak konnektorlarni generatsiya qiladi va keshlaydi.
 */

const connectorsCache = new Map();
const pendingRequests = new Map();

// Teshik va stud primitiv fayllari xaritasi
const PRIMITIVE_MAP = {
  // Pin teshiklari
  'peghole.dat': 'pin_hole',
  'npeghole.dat': 'pin_hole',
  'npeghol2.dat': 'pin_hole',
  'npeghol7.dat': 'pin_hole',
  'npeghol7a.dat': 'pin_hole',
  'connhole.dat': 'pin_hole',
  'beamhole.dat': 'pin_hole',

  // O'q (axle) teshiklari (aniq primitiv fayllar — axlehol* primitivlari o'q kesimi geometryasi, teshik emas)
  'axlehole.dat': 'axle_hole',
  'axl2hole.dat': 'axle_hole',
  'axlehole2.dat': 'axle_hole',
  'axlehole3.dat': 'axle_hole',
  'axlehole4.dat': 'axle_hole',
};


/**
 * Fayl nomidan konnektor turini aniqlash
 */
function classifyPrimitive(filename) {
  const clean = filename.toLowerCase().replace(/^(parts\/|p\/|s\/)/, '').trim();

  if (PRIMITIVE_MAP[clean]) {
    return PRIMITIVE_MAP[clean];
  }
  if (clean.startsWith('stud')) {
    return 'stud';
  }
  return null;
}

/**
 * Nuqtani matritsa va surilish bo'yicha o'zgartirish (3x3 matrix * pos + offset)
 */
function transformPoint(p, pos, mat) {
  return [
    pos[0] + mat[0] * p[0] + mat[1] * p[1] + mat[2] * p[2],
    pos[1] + mat[3] * p[0] + mat[4] * p[1] + mat[5] * p[2],
    pos[2] + mat[6] * p[0] + mat[7] * p[1] + mat[8] * p[2],
  ];
}

/**
 * Ikki 3x3 matritsani ko'paytirish
 */
function combineMatrix(parentMat, childMat) {
  const p = parentMat;
  const c = childMat;
  return [
    p[0] * c[0] + p[1] * c[3] + p[2] * c[6],
    p[0] * c[1] + p[1] * c[4] + p[2] * c[7],
    p[0] * c[2] + p[1] * c[5] + p[2] * c[8],

    p[3] * c[0] + p[4] * c[3] + p[5] * c[6],
    p[3] * c[1] + p[4] * c[4] + p[5] * c[7],
    p[3] * c[2] + p[4] * c[5] + p[5] * c[8],

    p[6] * c[0] + p[7] * c[3] + p[8] * c[6],
    p[6] * c[1] + p[7] * c[4] + p[8] * c[7],
    p[6] * c[2] + p[7] * c[5] + p[8] * c[8],
  ];
}

/**
 * Subfayl yo'lini aniqlash va fetch qilish.
 * Nomsiz primitivlar avval /ldraw/p/<nom>, topilmasa /ldraw/parts/<nom> dan sinab ko'riladi.
 * s/ prefiksli fayllar -> /ldraw/parts/s/<nom>.
 */
async function fetchLDrawContent(subFile) {
  const clean = subFile.toLowerCase().replace(/\\/g, '/').trim();
  const candidatePaths = [];

  if (clean.startsWith('s/')) {
    candidatePaths.push(`/ldraw/parts/${clean}`);
  } else if (clean.startsWith('p/')) {
    candidatePaths.push(`/ldraw/${clean}`);
  } else if (clean.startsWith('parts/')) {
    candidatePaths.push(`/ldraw/${clean}`);
  } else if (clean.startsWith('/') || clean.startsWith('http')) {
    candidatePaths.push(clean);
  } else {
    // Nomsiz primitiv/part: avval p/, so'ng parts/
    candidatePaths.push(`/ldraw/p/${clean}`);
    candidatePaths.push(`/ldraw/parts/${clean}`);
  }

  for (const path of candidatePaths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Keyingi yo'lni sinab ko'rish
    }
  }

  return null;
}

/**
 * .dat faylni rekursiv parse qilish (sarlavha va xom konnektorlar ro'yxatini qaytaradi)
 */
async function parseDatFile(subFile, currentPos = [0, 0, 0], currentMat = [1, 0, 0, 0, 1, 0, 0, 0, 1], depth = 0) {
  if (depth > 3) return { title: '', connectors: [] };

  const text = await fetchLDrawContent(subFile);
  if (!text) return { title: '', connectors: [] };

  const lines = text.split(/\r?\n/);
  let title = '';

  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('0 ')) {
      title = t.substring(2).trim();
      break;
    }
  }

  const connectors = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('1 ')) continue;

    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 15) continue;

    // 1 <colour> x y z a b c d e f g h i <file>
    const x = parseFloat(tokens[2]);
    const y = parseFloat(tokens[3]);
    const z = parseFloat(tokens[4]);

    const a = parseFloat(tokens[5]);
    const b = parseFloat(tokens[6]);
    const c = parseFloat(tokens[7]);
    const d = parseFloat(tokens[8]);
    const e = parseFloat(tokens[9]);
    const f = parseFloat(tokens[10]);
    const g = parseFloat(tokens[11]);
    const h = parseFloat(tokens[12]);
    const i = parseFloat(tokens[13]);

    const childFile = tokens.slice(14).join(' ').toLowerCase().replace(/\\/g, '/');

    const childMat = [a, b, c, d, e, f, g, h, i];
    const worldPos = transformPoint([x, y, z], currentPos, currentMat);
    const worldMat = combineMatrix(currentMat, childMat);

    const connType = classifyPrimitive(childFile);
    if (connType) {
      // LDraw primitivlarining o'q yo'nalishi Y ustuni: [b, e, h]
      const dirY = [worldMat[1], worldMat[4], worldMat[7]];
      const len = Math.hypot(dirY[0], dirY[1], dirY[2]) || 1;
      const normDir = [dirY[0] / len, dirY[1] / len, dirY[2] / len];

      connectors.push({
        type: connType,
        pos: worldPos,
        dir: normDir,
        radius: 6,
      });
    } else if (childFile.endsWith('.dat') || childFile.endsWith('.ldr')) {
      // Subfayllarga rekursiv kirish
      const subRes = await parseDatFile(childFile, worldPos, worldMat, depth + 1);
      connectors.push(...subRes.connectors);
    }
  }

  return { title, connectors };
}

/**
 * Bir xil turdagi va bir-biridan 4 LDU dan yaqin konnektorlarni bittaga birlashtirish (Dedup)
 */
function deduplicateConnectors(connectors) {
  const result = [];

  for (const conn of connectors) {
    const existing = result.find((item) => {
      if (item.type !== conn.type) return false;
      const dx = item.pos[0] - conn.pos[0];
      const dy = item.pos[1] - conn.pos[1];
      const dz = item.pos[2] - conn.pos[2];
      const dist = Math.hypot(dx, dy, dz);
      return dist <= 4;
    });

    if (!existing) {
      result.push({
        type: conn.type,
        pos: [conn.pos[0], conn.pos[1], conn.pos[2]],
        dir: [conn.dir[0], conn.dir[1], conn.dir[2]],
        radius: conn.radius || 6,
      });
    }
  }

  return result;
}

/**
 * Pin yoki Axle kabi teshiksiz "erkak" detallar uchun konnektorlarni generatsiya qilish
 */
function generateMaleConnectorsIfNeeded(partNum, title, holeConnectors) {
  const name = (title || '').toLowerCase();

  // Pin bo'lsa erkak 'pin' konnektorlarini yaratish
  if (name.includes('pin') && !name.includes('axle')) {
    let studs = 2;
    if (name.includes('3l')) studs = 3;
    else if (name.includes('1/2') || name.includes('half')) studs = 1;

    const lenLdu = studs * 20;
    const halfLen = lenLdu / 2;
    const endPosOffset = Math.max(5, halfLen - 10);

    return [
      {
        type: 'pin',
        pos: [-endPosOffset, 0, 0],
        dir: [-1, 0, 0],
        radius: 6,
      },
      {
        type: 'pin',
        pos: [endPosOffset, 0, 0],
        dir: [1, 0, 0],
        radius: 6,
      },
    ];
  }

  // Axle bo'lsa erkak 'axle' konnektorlarini yaratish (va axle_hole teshiklarini umuman olib tashlash)
  const isAxle = name.includes('axle') || String(partNum).includes('3705') || String(partNum).includes('3706') || String(partNum).includes('3707') || String(partNum).includes('3708');
  if (isAxle) {
    const match = (title || '').match(/Axle\s+(\d+)/i);
    const studs = match ? parseInt(match[1], 10) : 4;
    const lenLdu = studs * 20;
    const halfLen = lenLdu / 2;

    const list = [];
    for (let i = 0; i < studs; i++) {
      const x = -halfLen + 10 + i * 20;
      list.push({
        type: 'axle',
        pos: [x, 0, 0],
        dir: [1, 0, 0],
        radius: 6,
      });
    }
    return list;
  }

  return holeConnectors;

}

/**
 * Part number uchun konnektorlarni yuklash, dedup qilish, ketma-ket ID berish va keshga saqlash
 */
export async function loadLDrawConnectors(partNum) {
  if (!partNum) return [];
  const cleanPartNum = String(partNum).replace(/^ldraw:/, '').replace(/\.dat$/, '');
  if (connectorsCache.has(cleanPartNum)) {
    return connectorsCache.get(cleanPartNum);
  }
  if (pendingRequests.has(cleanPartNum)) {
    return pendingRequests.get(cleanPartNum);
  }

  const promise = (async () => {
    const parsed = await parseDatFile(`${cleanPartNum}.dat`);
    const dedupedList = deduplicateConnectors(parsed.connectors);
    const finalRaw = generateMaleConnectorsIfNeeded(cleanPartNum, parsed.title, dedupedList);

    const typeCounters = {};
    const finalConnectors = finalRaw.map((conn) => {
      const t = conn.type;
      typeCounters[t] = (typeCounters[t] || 0) + 1;
      return {
        id: `${t}_${typeCounters[t]}`,
        ...conn,
      };
    });

    connectorsCache.set(cleanPartNum, finalConnectors);
    pendingRequests.delete(cleanPartNum);
    return finalConnectors;
  })();

  pendingRequests.set(cleanPartNum, promise);
  return promise;
}

/**
 * Sinkron ravishda keshdagi konnektorlarni olish
 */
export function getLDrawConnectorsSync(partNum) {
  if (!partNum) return null;
  const cleanPartNum = String(partNum).replace(/^ldraw:/, '').replace(/\.dat$/, '');
  if (connectorsCache.has(cleanPartNum)) {
    return connectorsCache.get(cleanPartNum);
  }
  loadLDrawConnectors(cleanPartNum);
  return null;
}
