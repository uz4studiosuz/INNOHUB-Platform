import { getCatalogEntry } from '../data/catalog.js';

/**
 * Yig'ilgan robotni tahlil qiladi va uning **haqiqiy imkoniyatlarini** beradi.
 *
 * Nega kerak: avval simulyatsiya sahnada nima turganidan qat'i nazar bir xil
 * ishlardi — g'ildiraksiz robot ham yurar, manipulyatorli robot ham oddiy
 * mashina kabi harakatlanardi. Ya'ni qurish bosqichi hech narsaga ta'sir
 * qilmasdi, bu esa butun modulning ma'nosini yo'qotardi: bola nimani yig'sa
 * ham natija bir xil bo'lgach, to'g'ri yig'ishni o'rganmaydi.
 *
 * Endi harakat, tezlik, sezish va ko'tarish — hammasi detallar ro'yxatidan
 * kelib chiqadi. LEGO/Arduino ning real mantig'i shu: motor bor, lekin
 * g'ildirak yo'q bo'lsa, o'q aylanadi va robot joyida qoladi.
 *
 * Barcha massalar grammda (katalogdagi `massG`), o'lchamlar millimetrda.
 */

/** G'ildirak turi -> diametri (mm). Tezlik shundan chiqadi. */
const WHEEL_DIAMETER_MM = {
  'tt-wheel-65mm': 65,
  'tt-wheel-80mm': 80,
  'mecanum-wheel': 58,
  wheel: 60,
};

/** Motor turi -> bo'sh yurish aylanishi (RPM) va tishlashish momenti (N·cm).
 * Qiymatlar real datasheet'lardan: TT motor 6V da ~200 RPM, NEMA17 ancha
 * sekin lekin kuchli, 28BYJ-48 esa juda sekin. */
const MOTOR_SPECS = {
  'dc-tt-yellow': { rpm: 200, torqueNcm: 80, kind: 'dc' },
  'stepper-nema17': { rpm: 120, torqueNcm: 400, kind: 'stepper' },
  'stepper-28byj48': { rpm: 15, torqueNcm: 34, kind: 'stepper' },
  stepper: { rpm: 60, torqueNcm: 150, kind: 'stepper' },
};

const CONTROLLERS = ['arduino-uno', 'arduino-nano', 'esp32', 'raspberry-pi4'];
const DRIVERS = ['l298n', 'driver'];
const DISTANCE_SENSORS = ['hc-sr04', 'ultrasonic_sensor'];
const SERVOS = ['sg90', 'mg90s', 'servo'];
const BATTERIES = ['battery-18650-4', 'power'];

const has = (types, list) => types.some((t) => list.some((k) => t.includes(k)));

/**
 * @param {Array} sceneObjects - App dagi sahna obyektlari
 * @returns {{
 *   canDrive: boolean, canSense: boolean, canLift: boolean,
 *   wheelCount: number, wheelDiameterMm: number, motorCount: number,
 *   maxSpeedMmS: number, massKg: number, issues: string[], profile: string
 * }}
 */
export function analyzeBuild(sceneObjects = []) {
  const types = sceneObjects.map((o) => String(o.type || '').toLowerCase());

  const wheels = sceneObjects.filter((o) => {
    const t = String(o.type || '').toLowerCase();
    // Kaster g'ildirak tayanch, u yetaklamaydi — shuning uchun hisobga kirmaydi.
    return (t.includes('wheel') || t.includes('tire')) && !t.includes('caster');
  });
  const motors = sceneObjects.filter((o) => {
    const t = String(o.type || '').toLowerCase();
    return t.includes('motor') || t.includes('stepper') || t === 'dc-tt-yellow';
  });
  const servos = sceneObjects.filter((o) => SERVOS.some((s) => String(o.type || '').toLowerCase().includes(s)));
  const armSegments = types.filter((t) => t.includes('arm-segment')).length;
  const buckets = types.filter((t) => t.includes('gripper-bucket')).length;

  const hasController = has(types, CONTROLLERS);
  const hasDriver = has(types, DRIVERS);
  const hasBattery = has(types, BATTERIES);
  const hasDistanceSensor = has(types, DISTANCE_SENSORS);

  // ── Massa: har detalning katalogdagi og'irligi ──
  const massG = sceneObjects.reduce((sum, o) => {
    const entry = getCatalogEntry(o.type);
    return sum + (entry?.massG || 20);
  }, 0);
  const massKg = Math.max(0.05, massG / 1000);

  // ── G'ildirak diametri: eng ko'p uchraydigani ──
  const diameters = wheels
    .map((w) => {
      const t = String(w.type || '').toLowerCase();
      const key = Object.keys(WHEEL_DIAMETER_MM).find((k) => t.includes(k));
      return key ? WHEEL_DIAMETER_MM[key] : 60;
    })
    .sort((a, b) => a - b);
  const wheelDiameterMm = diameters.length ? diameters[Math.floor(diameters.length / 2)] : 0;

  // ── Motor xarakteristikasi: eng sekin motor butun robotni cheklaydi ──
  const motorSpecs = motors.map((m) => {
    const t = String(m.type || '').toLowerCase();
    const key = Object.keys(MOTOR_SPECS).find((k) => t.includes(k));
    return key ? MOTOR_SPECS[key] : MOTOR_SPECS['dc-tt-yellow'];
  });
  const rpm = motorSpecs.length ? Math.min(...motorSpecs.map((s) => s.rpm)) : 0;
  const torqueNcm = motorSpecs.reduce((sum, s) => sum + s.torqueNcm, 0);

  /**
   * Maksimal tezlik = g'ildirak aylanasi x aylanishlar soni.
   * v = pi * D * RPM / 60  (mm/s)
   * Bu — real formulaning aynan o'zi, taxmin emas: shuning uchun 80 mm li
   * g'ildirak 65 mm likdan aniq 1.23 barobar tez yuradi.
   */
  const freeSpeedMmS = (Math.PI * wheelDiameterMm * rpm) / 60;

  /**
   * Og'irlik tezlikni pasaytiradi: moment o'zgarmas bo'lsa, og'ir robot
   * sekinroq tezlashadi va tepalikda qiynaladi. Bu yerda soddalashtirilgan
   * model — moment/massa nisbati 1.0 dan past bo'lsa tezlik proporsional
   * kamayadi.
   */
  const loadFactor = torqueNcm > 0 ? Math.min(1, torqueNcm / (massKg * 60)) : 0;
  const maxSpeedMmS = freeSpeedMmS * (0.35 + 0.65 * loadFactor);

  // ── Nima ishlaydi, nima yo'q ──
  const driveWheels = wheels.length;
  const canDrive = hasController && hasDriver && hasBattery && motors.length > 0 && driveWheels >= 2;
  const canSense = hasController && hasDistanceSensor;
  const canLift = servos.length > 0 && armSegments > 0 && buckets > 0;

  const issues = [];
  if (!hasController) issues.push('Kontroller yo‘q — kod bajariladigan qurilma topilmadi (Arduino / ESP32 / Raspberry Pi).');
  if (!hasBattery) issues.push('Quvvat manbai yo‘q — batareya boksini qo‘shing.');
  // Statsionar skanerda motor bo'lmasligi normal — uni "xato" deb ko'rsatish
  // o'quvchini yo'q muammoni tuzatishga majbur qilardi.
  const stationaryByDesign = servos.length > 0 && hasDistanceSensor && wheels.length === 0 && motors.length === 0;
  if (motors.length === 0 && !stationaryByDesign) {
    issues.push('Motor yo‘q — robotni harakatlantiradigan hech nima topilmadi.');
  }
  // Drayver faqat motor bo'lganda kerak: motorsiz skanerdan L298N so'rash
  // mavjud bo'lmagan muammoni tuzatishga chorlash bo'lardi.
  if (motors.length > 0 && !hasDriver) {
    issues.push('Motor drayveri yo‘q — Arduino motorni to‘g‘ridan-to‘g‘ri tortolmaydi, L298N kerak.');
  }
  if (motors.length > 0 && driveWheels === 0) {
    issues.push('G‘ildirak yo‘q — motor o‘qi aylanadi, lekin robot joyidan qimirlamaydi.');
  } else if (driveWheels === 1) {
    issues.push('Faqat 1 ta yetaklovchi g‘ildirak — robot to‘g‘ri yura olmaydi, kamida 2 ta kerak.');
  }
  if (!hasDistanceSensor) issues.push('Masofa sensori yo‘q — robot to‘siqni «ko‘rmaydi», avtonom rejim ko‘r holda yuradi.');
  if (armSegments > 0 && buckets === 0) issues.push('Qo‘l bor, lekin cho‘mich yo‘q — yukni ushlab bo‘lmaydi.');
  if (buckets > 0 && servos.length === 0) issues.push('Cho‘mich bor, lekin servo yo‘q — qo‘lni harakatlantirib bo‘lmaydi.');

  /** Robot turi — panel va HUD shuni ko'rsatadi. */
  let profile = 'noma’lum';
  if (canLift && canDrive) profile = 'Manipulyatorli robot';
  else if (canLift) profile = 'Statsionar robot qo‘l';
  else if (canDrive && driveWheels >= 4) profile = '4WD robot-mashina';
  else if (canDrive) profile = '2WD robot-mashina';
  // Yurmaydigan, lekin sensori va servosi bor yig'ma — bu nosozlik emas,
  // bu statsionar skaner (pan-tilt). Uni "to'liq bo'lmagan" deb belgilash
  // xato bo'lardi: u o'z vazifasini bajaradi, shunchaki g'ildiragi yo'q.
  else if (!canDrive && hasDistanceSensor && servos.length > 0) profile = 'Statsionar skaner';
  else if (motors.length > 0) profile = 'to‘liq bo‘lmagan yig‘ma';

  return {
    canDrive,
    canSense,
    canLift,
    wheelCount: driveWheels,
    wheelDiameterMm,
    motorCount: motors.length,
    servoCount: servos.length,
    armSegments,
    buckets,
    rpm,
    torqueNcm,
    maxSpeedMmS: Math.round(maxSpeedMmS),
    massKg: Number(massKg.toFixed(3)),
    hasController,
    hasDriver,
    hasBattery,
    hasDistanceSensor,
    issues,
    profile,
  };
}
