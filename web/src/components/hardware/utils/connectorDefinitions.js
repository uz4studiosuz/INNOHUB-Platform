// Kengaytmalar (.js) ataylab yozilgan: Vite'ga farqi yo'q, lekin konnektorlarni
// Node'da tekshirish uchun (brauzersiz) kengaytma talab qilinadi.
import { getCatalogEntry } from '../data/catalog.js';
import { getLDrawConnectorsSync } from './ldrawConnectors.js';
import { getChassisHoles } from './proceduralGeometries.js';

const LEGO_PITCH = 20; // 8 mm = 20 LDU

/**
 * Har bir detal turi uchun local ulanish nuqtalarini (Connectors) aniqlaydi.
 * Barcha o'lchamlar LDU (LDraw Unit: 1 LDU = 0.4 mm) birligida.
 * Connector strukturasi:
 * {
 *   id: string,
 *   type: 'shaft' | 'hole' | 'peg' | 'mount' | 'm3_hole' | 'wheel_hub',
 *   pos: [x, y, z],     // Local koordinata (LDU da)
 *   dir: [dx, dy, dz],  // Local yo'nalish vektori (normal)
 *   radius?: number     // Radius (LDU da)
 * }
 */
export function getConnectorsForObject(objData) {
  if (!objData) return [];

  const connectors = [];
  const rawType = objData.type || objData.partNum || '';
  const entry = getCatalogEntry(rawType);

  const subcat = (entry?.subcat || objData.subcat || '').toLowerCase();
  const generator = (entry?.generator || entry?.generatorType || objData.generator || '').toLowerCase();
  const type = (rawType || entry?.type || '').toLowerCase();
  const name = (objData.name || entry?.name || '').toLowerCase();
  const params = { ...(entry?.defaultParams || {}), ...(objData.params || {}) };

  // Katalog entry'sida connectors maydoni bo'lsa (massiv yoki funksiya) shuni ishlatish
  if (entry?.connectors) {
    const rawConns = typeof entry.connectors === 'function' ? entry.connectors(params) : entry.connectors;
    if (Array.isArray(rawConns) && rawConns.length > 0) {
      return rawConns.map((c, idx) => ({
        id: c.id || `conn_${idx + 1}`,
        type: c.type,
        pos: [...c.pos],
        dir: [...c.dir],
        radius: c.radius || 4,
      }));
    }
  }


  // LDraw Part Number map to holes/studs for correct connector generation
  if (objData.isLDraw || type.startsWith('ldraw:')) {
    const partNum = objData.partNum || type.replace('ldraw:', '');

    // Avval avtomatik o'qilgan `.dat` konnektorlarini tekshirish
    const parsedConns = getLDrawConnectorsSync(partNum);
    if (parsedConns && parsedConns.length > 0) {
      return parsedConns;
    }

    // Beam hole counts
    const beamHoles = {
      '41677': 2,
      '32523': 3,
      '32316': 5,
      '32524': 7,
      '30400': 9,
      '32525': 11,
      '41239': 13,
      '32278': 15,
      '64178': 7,
      '64179': 11,
      '32526': 5,
      '32140': 4,
      '32009': 7,
      '6629': 6,
      '60484': 3,
      '3709': 4,
      '3894': 6
    };
    
    // Axle length studs
    const axleStuds = {
      '32062': 2,
      '4519': 3,
      '3705': 4,
      '32073': 5,
      '3706': 6,
      '44294': 7,
      '3707': 8,
      '3737': 10,
      '3708': 12,
      '87083': 4
    };
    
    if (beamHoles[partNum]) {
      params.holes = beamHoles[partNum];
    } else if (axleStuds[partNum]) {
      params.lengthStuds = axleStuds[partNum];
    }
  }

  // 1. Shassi (Robot Chassis)
  if (subcat === 'chassis' || type.includes('chassis') || generator === 'robot_chassis') {
    const holes = getChassisHoles({
      lengthMm: params.lengthMm || 160,
      widthMm: params.widthMm || 110,
    });
    holes.forEach((h, idx) => {
      connectors.push({
        id: `chassis_m3_${idx}`,
        type: 'm3_hole',
        pos: [h.x, 0, h.z],
        dir: [0, 1, 0],
        radius: 4,
      });
    });
  }
  // 2. Arduino Uno / Controller
  else if (subcat === 'controller' || type.includes('arduino') || type.includes('uno')) {
    connectors.push(
      { id: 'arduino_m3_1', type: 'm3_hole', pos: [-50.75, 0, -60.5], dir: [0, -1, 0], radius: 4 },
      { id: 'arduino_m3_2', type: 'm3_hole', pos: [-47.75, 0, 60.25], dir: [0, -1, 0], radius: 4 },
      { id: 'arduino_m3_3', type: 'm3_hole', pos: [79.25, 0, 22.25], dir: [0, -1, 0], radius: 4 },
      { id: 'arduino_m3_4', type: 'm3_hole', pos: [79.25, 0, -47.75], dir: [0, -1, 0], radius: 4 }
    );
  }
  // 3. Motor Drayver (L298N)
  else if (subcat === 'driver' || type.includes('l298n') || name.includes('l298n')) {
    connectors.push(
      { id: 'l298n_m3_1', type: 'm3_hole', pos: [-46.875, 0, -47.5], dir: [0, -1, 0], radius: 4 },
      { id: 'l298n_m3_2', type: 'm3_hole', pos: [46.875, 0, -47.5], dir: [0, -1, 0], radius: 4 },
      { id: 'l298n_m3_3', type: 'm3_hole', pos: [-46.875, 0, 47.5], dir: [0, -1, 0], radius: 4 },
      { id: 'l298n_m3_4', type: 'm3_hole', pos: [46.875, 0, 47.5], dir: [0, -1, 0], radius: 4 }
    );
  }
  // 4. Motor (DC Motor / TT Motor STL / Stepper)
  else if (subcat === 'motor' || type === 'motor' || type.includes('motor') || type === 'dc-tt-yellow' || name.includes('motor')) {
    connectors.push(
      { id: 'motor_shaft_front', type: 'shaft', pos: [0, 0, 55], dir: [0, 0, 1], radius: 6 },
      { id: 'motor_shaft_back', type: 'shaft', pos: [0, 0, -55], dir: [0, 0, -1], radius: 6 },
      { id: 'motor_mount_left', type: 'mount', pos: [-30, -20, 0], dir: [0, -1, 0] },
      { id: 'motor_mount_right', type: 'mount', pos: [30, -20, 0], dir: [0, -1, 0] }
    );
  }
  // 5. G'ildirak (Wheel / Tire)
  else if (subcat === 'wheel' || type.includes('wheel') || type.includes('tire') || name.includes('wheel') || name.includes('tire')) {
    connectors.push(
      { id: 'wheel_center_front', type: 'wheel_hub', pos: [0, 0, 0], dir: [0, 0, 1], radius: 6 },
      { id: 'wheel_center_back', type: 'wheel_hub', pos: [0, 0, 0], dir: [0, 0, -1], radius: 6 }
    );
  }
  // 6. Servo
  else if (subcat === 'servo' || type.includes('servo') || name.includes('servo')) {
    connectors.push(
      { id: 'servo_mount_1', type: 'm3_hole', pos: [-15, -10, 0], dir: [0, -1, 0], radius: 4 },
      { id: 'servo_mount_2', type: 'm3_hole', pos: [15, -10, 0], dir: [0, -1, 0], radius: 4 },
      { id: 'servo_shaft', type: 'shaft', pos: [0, 15, 0], dir: [0, 1, 0], radius: 6 }
    );
  }
  // 7. LEGO Gears (Shesternya)
  else if (subcat === 'gear' || generator === 'lego_gear' || type.includes('gear') || name.includes('gear')) {
    connectors.push(
      { id: 'gear_center_hole_f', type: 'axle_hole', pos: [0, 0, 10], dir: [0, 0, 1], radius: 6 },
      { id: 'gear_center_hole_b', type: 'axle_hole', pos: [0, 0, -10], dir: [0, 0, -1], radius: 6 }
    );
  }
  // 8. LEGO Axle (O'q / Val)
  else if (subcat === 'axle' || generator === 'lego_axle' || type.includes('axle') || name.includes('axle')) {
    const studs = params.lengthStuds || params.length || 5;
    const halfLen = (studs * LEGO_PITCH) / 2;
    connectors.push(
      { id: 'axle_tip_front', type: 'axle', pos: [0, 0, halfLen], dir: [0, 0, 1], radius: 6 },
      { id: 'axle_tip_back', type: 'axle', pos: [0, 0, -halfLen], dir: [0, 0, -1], radius: 6 },
      { id: 'axle_center', type: 'axle', pos: [0, 0, 0], dir: [0, 0, 1], radius: 6 }
    );
  }
  // 9. LEGO Beam (Balka / G'o'la) & Frame
  else if (subcat === 'beam' || subcat === 'frame' || generator === 'lego_beam' || type.includes('beam') || type.includes('frame') || name.includes('beam') || name.includes('frame')) {
    const holes = params.holes || 5;
    const length = holes * LEGO_PITCH;
    const halfLen = length / 2;
    const halfPitch = LEGO_PITCH / 2;

    for (let i = 0; i < holes; i++) {
      const x = -halfLen + halfPitch + i * LEGO_PITCH;
      connectors.push({
        id: `beam_hole_${i}`,
        type: 'pin_hole',
        pos: [x, 0, 0],
        dir: [0, 1, 0],
        radius: 6,
      });
    }
  }
  // 10. LEGO Pin (Shtift / Peg)
  else if (subcat === 'pin' || generator === 'lego_pin' || type.includes('pin') || name.includes('pin')) {
    connectors.push(
      { id: 'pin_end_1', type: 'pin', pos: [0, -10, 0], dir: [0, -1, 0], radius: 6 },
      { id: 'pin_end_2', type: 'pin', pos: [0, 10, 0], dir: [0, 1, 0], radius: 6 }
    );
  }
  // Default fallback: Markaziy va Yon ulanish nuqtalari
  else {
    connectors.push(
      { id: 'center_hole', type: 'hole', pos: [0, 0, 0], dir: [0, 1, 0], radius: 6 },
      { id: 'center_peg', type: 'peg', pos: [0, 0, 0], dir: [0, 1, 0], radius: 6 },
      { id: 'center_mount', type: 'mount', pos: [0, 0, 0], dir: [0, 0, 1] }
    );
  }

  return connectors;
}

/**
 * Ikki konnektor turi bir-biriga mos keladimi? (§4 jadvali bo'yicha)
 */
export function areConnectorsCompatible(typeA, typeB) {
  if (!typeA || !typeB) return false;

  // 1. pin <-> pin_hole (va eski peg <-> hole mosligi)
  if ((typeA === 'pin' || typeA === 'peg') && (typeB === 'pin_hole' || typeB === 'hole')) return true;
  if ((typeA === 'pin_hole' || typeA === 'hole') && (typeB === 'pin' || typeB === 'peg')) return true;

  // 2. axle <-> axle_hole
  if (typeA === 'axle' && (typeB === 'axle_hole' || typeB === 'hole')) return true;
  if ((typeA === 'axle_hole' || typeA === 'hole') && typeB === 'axle') return true;

  // 3. axle <-> wheel_hub
  if (typeA === 'axle' && typeB === 'wheel_hub') return true;
  if (typeA === 'wheel_hub' && typeB === 'axle') return true;

  // 4. shaft <-> wheel_hub
  if (typeA === 'shaft' && (typeB === 'wheel_hub' || typeB === 'hole')) return true;
  if ((typeA === 'wheel_hub' || typeA === 'hole') && typeB === 'shaft') return true;

  // 5. m3_hole <-> m3_hole
  if (typeA === 'm3_hole' && typeB === 'm3_hole') return true;

  // 6. surface <-> surface / mount <-> mount
  if (typeA === 'surface' && typeB === 'surface') return true;
  if (typeA === 'mount' && typeB === 'mount') return true;

  return false;
}
