import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sahnadagi barcha detallarni standart LDraw (.ldr) formatida faylga saqlash (Export)
 */
export function exportToLdr(sceneObjects, objectsMap) {
  let ldrLines = [];
  ldrLines.push(`0 // LEGO Technic Assembly Created in Hardware Konstruktsiya 3D Platform`);
  ldrLines.push(`0 // Date: ${new Date().toISOString()}`);
  ldrLines.push(`0 Name: robot_assembly.ldr`);
  ldrLines.push(`0 UN-OFFICIAL MODEL`);
  ldrLines.push(``);

  sceneObjects.forEach((obj) => {
    const obj3d = objectsMap.get(obj.id);
    if (!obj3d || obj3d === 'loading') return;

    // Matritsani yangilash
    obj3d.updateMatrix();
    const m = obj3d.matrix.elements;

    // Three.js column-major [16] -> LDraw row-major 3x3 [a..i] & translation [x,y,z]
    const a = m[0],  b = m[4],  c = m[8];
    const d = m[1],  e = m[5],  f = m[9];
    const g = m[2],  h = m[6],  i = m[10];

    const x = m[12];
    const y = m[13];
    const z = m[14];

    const colorCode = obj.colorCode !== undefined ? obj.colorCode : 71;
    let partFileName = obj.partNum || obj.type || '32270';
    if (!partFileName.toLowerCase().endsWith('.dat')) {
      partFileName = `${partFileName}.dat`;
    }

    // LDraw Type 1 Line format:
    // 1 <color> x y z a b c d e f g h i <file.dat>
    const line = `1 ${colorCode} ${formatNum(x)} ${formatNum(y)} ${formatNum(z)} ${formatNum(a)} ${formatNum(b)} ${formatNum(c)} ${formatNum(d)} ${formatNum(e)} ${formatNum(f)} ${formatNum(g)} ${formatNum(h)} ${formatNum(i)} ${partFileName}`;
    ldrLines.push(line);
  });

  const ldrContent = ldrLines.join('\n');
  const blob = new Blob([ldrContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `lego_assembly_${new Date().toISOString().slice(0, 10)}.ldr`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sonlarni yaxlitlab formatlash
 */
function formatNum(num) {
  if (Math.abs(num) < 0.000001) return '0';
  return Number(num.toFixed(4)).toString();
}

/**
 * LDraw (.ldr) fayl matnini o'qib, sahnaga obyektlar ro'yxatini yuklash (Import)
 */
export function importFromLdr(ldrText) {
  const lines = ldrText.split(/\r?\n/);
  const importedObjects = [];

  const tempMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('1 ')) return; // Faqat Type 1 (Part instance) qatolarini o'qiymiz

    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 15) return;

    const colorCode = parseInt(tokens[1], 10);
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

    const datFile = tokens[14];
    const partNum = datFile.replace(/\.dat$/i, '');

    // Matrix4.set(a, b, c, x,  d, e, f, y,  g, h, i, z,  0, 0, 0, 1)
    tempMatrix.set(
      a, b, c, x,
      d, e, f, y,
      g, h, i, z,
      0, 0, 0, 1
    );

    tempMatrix.decompose(position, quaternion, scale);
    euler.setFromQuaternion(quaternion);

    const newId = uuidv4();
    importedObjects.push({
      id: newId,
      isLDraw: true,
      partNum: partNum,
      type: `ldraw:${partNum}`,
      name: `LDraw Part ${partNum}`,
      colorCode: colorCode,
      visible: true,
      position: [position.x, position.y, position.z],
      rotation: [euler.x, euler.y, euler.z],
      params: { scalePercent: 100 },
    });
  });

  return importedObjects;
}
