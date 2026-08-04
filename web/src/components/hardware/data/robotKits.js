/**
 * Tayyor robot yig'malari — "Tayyorini yukla" rejimi uchun.
 *
 * Robot bu yerda 3D model EMAS: u mavjud detallarning ro'yxati va ularning
 * joylashuvi. Shuning uchun bola uni buzib, bir detalni almashtirib, o'ziga
 * moslashtira oladi (SPEC.md §7). Yaxlit model bo'lsa bu imkonsiz bo'lardi.
 *
 * ─── O'LCHOV BIRLIGI ───
 * Bu faylda hamma koordinata **millimetrda** yozilgan, chunki real detal
 * o'lchamlari mm da ma'lum va shunday yozilganda tekshirish oson.
 * Sahna esa LDU da ishlaydi (1 mm = 2.5 LDU), o'girish `toScene()` da bo'ladi.
 *
 * ─── KOORDINATA YO'NALISHI ───
 *   X — robotning uzunligi bo'yicha (+X = old tomon)
 *   Y — tepaga
 *   Z — robotning kengligi bo'yicha (+Z = o'ng tomon)
 * Shassi (0,0,0) da yotadi, ustki sirti y = +1.5 mm.
 *
 * ─── DIQQAT: burilishlar tekshirilishi kerak ───
 * Detallarning CAD modellari har xil yo'nalishda kelgan (masalan TT motorning
 * uzun o'qi model ichida Y bo'yicha). Quyidagi `rot` qiymatlari birinchi
 * taxmin — ularni ekranda ko'rib tuzatish kerak. Tuzatish oson: faqat shu
 * fayldagi sonlarni o'zgartirasiz, kodga tegmaysiz.
 */

const MM_TO_LDU = 2.5;

const D = Math.PI / 180;

/**
 * Model o'zining tabiiy yo'nalishini tuzatish (gradusda).
 *
 * CAD modellari har xil yo'nalishda chizilgan va bu detalning yig'madagi
 * joyiga bog'liq emas — shuning uchun tuzatma shu yerda, bir joyda turadi.
 * Yig'madagi `rot` esa ustiga qo'shiladi (detalni burish uchun).
 *
 * Qanday aniqlandi: har modelning o'lchami ma'lum (public/models/CREDITS.md),
 * qaysi o'q "yupqa" yoki "uzun" ekaniga qarab tabiiy holati bilinadi.
 *   tt-wheel-65mm  31.8 x 68.0 x 68.0 -> o'qi X bo'ylab, robotga esa Z kerak
 *                  (chap-o'ng), aks holda g'ildirak "qanot" bo'lib turadi.
 *   battery-18650-4 78.0 x 78.8 x 24.7 -> yupqa o'qi Z, ya'ni tikka turadi;
 *                  yotishi uchun yupqa o'q Y bo'lishi kerak.
 *   sg90           37.5 x 32.0 x 16.7 -> yupqa o'qi Z, shassiga yotishi kerak.
 *   hc-sr04        45.6 x 20.4 x 15.4 -> yupqa o'qi Z; sensor oldga (+X)
 *                  qarashi uchun Y atrofida buriladi.
 */
const TYPE_FIX = {
  'tt-wheel-65mm': [0, 90, 0],
  'tt-wheel-80mm': [0, 90, 0],
  'mecanum-wheel': [0, 90, 0],
  'battery-18650-4': [90, 0, 0],
  sg90: [90, 0, 0],
  mg90s: [90, 0, 0],
  'hc-sr04': [0, 90, 0],
};

/** mm va gradusdagi yozuvni sahna birligiga (LDU, radian) o'giradi. */
function toScene(part) {
  const [x, y, z] = part.pos;
  const [rx, ry, rz] = part.rot || [0, 0, 0];
  const [fx, fy, fz] = TYPE_FIX[part.type] || [0, 0, 0];
  return {
    type: part.type,
    name: part.name,
    position: [x * MM_TO_LDU, y * MM_TO_LDU, z * MM_TO_LDU],
    rotation: [(rx + fx) * D, (ry + fy) * D, (rz + fz) * D],
    params: part.params,
  };
}

const KITS = [
  {
    id: '2wd_car',
    title: '2WD Robot-Mashina',
    description: 'Eng oddiy robot: shassi, 2 ta TT motor, 2 g\'ildirak, kaster, Arduino, L298N, batareya',
    difficulty: 'Boshlang\'ich',
    // Real hayotda: 160x110 mm akril shassi, orqada 2 ta TT motor, oldida
    // erkin aylanuvchi kaster g'ildirak, ustida elektronika.
    parts: [
      { type: 'robot-chassis', name: 'Shassi', pos: [0, 0, 0],
        params: { lengthMm: 160, widthMm: 110, thickMm: 3, scalePercent: 100 } },

      // Motorlar orqada (-X), shassi ostida. Uzun o'qi robot uzunligi bo'ylab
      // yotishi kerak, shuning uchun Z atrofida 90 gradus.
      { type: 'dc-tt-yellow', name: 'TT motor (chap)',  pos: [-40, -22, -48], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (o\'ng)', pos: [-40, -22,  48], rot: [0, 0, 90] },

      // G'ildiraklar motorlarning tashqi tomonida (68 mm diametr, markazi
      // shassi ostida 22 mm da - shunda g'ildirak yerga tegadi).
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (chap)',  pos: [-40, -22, -70], rot: [0, 0, 0] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (o\'ng)', pos: [-40, -22,  70], rot: [0, 0, 0] },

      // Oldida kaster (uchinchi tayanch). Model hozircha noto'g'ri
      // (8 dyuymli sanoat g'ildiragi) - almashtirilgach o'lchami tuzatiladi.
      { type: 'caster-wheel', name: 'Kaster g\'ildirak', pos: [60, -20, 0] },

      // Elektronika shassi ustida: Arduino markazda, L298N orqada
      // (motorlarga yaqin), batareya oldida (og'irlik markazini oldga suradi).
      { type: 'arduino-uno', name: 'Arduino Uno', pos: [5, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N drayver', pos: [-52, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [48, 14, 0] },
    ],
  },

  {
    id: '4wd_car',
    title: '4WD Robot-Mashina',
    description: 'To\'rt g\'ildirakli: 4 ta TT motor, 2 ta L298N, kattaroq shassi',
    difficulty: 'Boshlang\'ich+',
    parts: [
      { type: 'robot-chassis', name: 'Shassi', pos: [0, 0, 0],
        params: { lengthMm: 200, widthMm: 130, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'TT motor (old chap)',   pos: [ 55, -22, -58], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (old o\'ng)',  pos: [ 55, -22,  58], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (orqa chap)',  pos: [-55, -22, -58], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (orqa o\'ng)', pos: [-55, -22,  58], rot: [0, 0, 90] },

      { type: 'tt-wheel-65mm', name: 'G\'ildirak (old chap)',   pos: [ 55, -22, -80] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (old o\'ng)',  pos: [ 55, -22,  80] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (orqa chap)',  pos: [-55, -22, -80] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (orqa o\'ng)', pos: [-55, -22,  80] },

      { type: 'arduino-uno', name: 'Arduino Uno', pos: [0, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N (old)',  pos: [ 62, 8, 0] },
      { type: 'l298n', name: 'L298N (orqa)', pos: [-62, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [0, 14, 42] },
    ],
  },

  {
    id: 'radar_bot',
    title: 'Aylanma Radar Robot',
    description: 'Servo ustida ultratovush sensor - atrofni skanerlaydi',
    difficulty: 'O\'rta',
    parts: [
      { type: 'robot-chassis', name: 'Shassi', pos: [0, 0, 0],
        params: { lengthMm: 140, widthMm: 110, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'TT motor (chap)',  pos: [-30, -22, -48], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (o\'ng)', pos: [-30, -22,  48], rot: [0, 0, 90] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (chap)',  pos: [-30, -22, -70] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (o\'ng)', pos: [-30, -22,  70] },
      { type: 'caster-wheel', name: 'Kaster g\'ildirak', pos: [52, -20, 0] },

      { type: 'arduino-uno', name: 'Arduino Uno', pos: [-10, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N drayver', pos: [-48, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [20, 14, 0] },

      // Servo shassi oldida, sensor uning ustida - servo burilganda sensor
      // ham buriladi (real robotda sensor servoning richagiga mahkamlanadi).
      { type: 'sg90', name: 'SG90 servo (radar)', pos: [55, 12, 0] },
      // Burilish TYPE_FIX da berilgan, shuning uchun bu yerda takrorlanmaydi.
      { type: 'hc-sr04', name: 'HC-SR04 sensor', pos: [55, 28, 0] },
    ],
  },

  {
    id: 'mecanum_omni',
    title: 'Mecanum Omni-Robot',
    description: 'To\'rt mecanum g\'ildirak — yon tomonga ham yura oladi. ESP32 + 2 ta L298N + MPU6050',
    difficulty: 'O\'rta+',
    // Mecanum g'ildiraklar rolikli: to'rttasi har xil yo'nalishda aylansa
    // robot joyidan burilmasdan yon tomonga suriladi. Shuning uchun kaster
    // kerak emas — to'rt nuqta tayanch.
    parts: [
      { type: 'robot-chassis', name: 'Shassi', pos: [0, 0, 0],
        params: { lengthMm: 200, widthMm: 130, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'Motor (old chap)',   pos: [ 58, -22, -50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (old o\'ng)',  pos: [ 58, -22,  50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (orqa chap)',  pos: [-58, -22, -50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (orqa o\'ng)', pos: [-58, -22,  50], rot: [0, 0, 90] },

      { type: 'mecanum-wheel', name: 'Mecanum (old chap)',   pos: [ 58, -22, -76] },
      { type: 'mecanum-wheel', name: 'Mecanum (old o\'ng)',  pos: [ 58, -22,  76] },
      { type: 'mecanum-wheel', name: 'Mecanum (orqa chap)',  pos: [-58, -22, -76] },
      { type: 'mecanum-wheel', name: 'Mecanum (orqa o\'ng)', pos: [-58, -22,  76] },

      { type: 'esp32', name: 'ESP32 kontroller', pos: [0, 8, -28], rot: [0, 90, 0] },
      { type: 'mpu6050', name: 'MPU6050 giroskop', pos: [0, 8, 24] },
      { type: 'l298n', name: 'L298N (old)',  pos: [ 64, 8, 0] },
      { type: 'l298n', name: 'L298N (orqa)', pos: [-64, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [0, 16, 44] },
    ],
  },

  {
    id: 'line_follower',
    title: 'Chiziq Kuzatuvchi Robot',
    description: 'Kichik va yengil: Arduino Nano + kichik shassi + 2 motor. Old tomonda sensor ko\'zi',
    difficulty: 'Boshlang\'ich',
    // Chiziq kuzatuvchi robot iloji boricha yengil va past bo'lishi kerak:
    // sensor polga qanchalik yaqin bo'lsa, chiziqni shunchalik aniq o'qiydi.
    parts: [
      { type: 'robot-chassis', name: 'Shassi (kichik)', pos: [0, 0, 0],
        params: { lengthMm: 120, widthMm: 110, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'TT motor (chap)',  pos: [-22, -22, -48], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (o\'ng)', pos: [-22, -22,  48], rot: [0, 0, 90] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (chap)',  pos: [-22, -22, -70] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (o\'ng)', pos: [-22, -22,  70] },
      { type: 'caster-wheel', name: 'Kaster g\'ildirak', pos: [44, -20, 0] },

      { type: 'arduino-nano', name: 'Arduino Nano', pos: [-8, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N drayver', pos: [-40, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [16, 14, 0] },

      // Sensor old chekkada, polga yaqin — chiziqni shu "ko'z" o'qiydi.
      { type: 'ultrasonic_sensor', name: 'Chiziq sensori (old)', pos: [52, -6, 0] },
    ],
  },

  {
    id: 'pan_tilt_scanner',
    title: 'Pan-Tilt Skaner',
    description: 'Ikki servo ustidagi sensor: gorizontal va vertikal skanerlaydi. Raspberry Pi 4 + MG90S',
    difficulty: 'O\'rta+',
    // Pan-tilt: pastki servo gorizontal buradi (pan), uning ustidagi ikkinchi
    // servo tepaga-pastga qiyalatadi (tilt). Sensor eng ustida.
    parts: [
      { type: 'robot-chassis', name: 'Asos plitasi', pos: [0, 0, 0],
        params: { lengthMm: 140, widthMm: 110, thickMm: 3, scalePercent: 100 } },

      { type: 'raspberry-pi4', name: 'Raspberry Pi 4', pos: [-30, 10, 0], rot: [0, 90, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [-30, 26, 0] },

      { type: 'mg90s', name: 'MG90S servo (pan)',  pos: [40, 10, 0] },
      { type: 'mg90s', name: 'MG90S servo (tilt)', pos: [40, 28, 0], rot: [90, 0, 0] },
      { type: 'hc-sr04', name: 'HC-SR04 sensor', pos: [40, 46, 0] },
      { type: 'mpu6050', name: 'MPU6050 giroskop', pos: [4, 8, 0] },
    ],
  },

  {
    id: 'stepper_rover',
    title: 'Qadamli Motorli Rover',
    description: 'NEMA17 qadamli motorlar — aniq masofaga yuradi. Katta g\'ildiraklar + ESP32',
    difficulty: 'Murakkab',
    // Qadamli motor har qadamda aniq burchakka buriladi, shuning uchun robot
    // "50 sm oldinga yur" buyrug'ini enkodersiz ham bajara oladi. Evaziga
    // og'irroq va sekinroq — shuning uchun katta g'ildirak va katta shassi.
    parts: [
      { type: 'robot-chassis', name: 'Shassi (katta)', pos: [0, 0, 0],
        params: { lengthMm: 220, widthMm: 130, thickMm: 3, scalePercent: 100 } },

      { type: 'stepper-nema17', name: 'NEMA17 (chap)',  pos: [-45, -18, -46], rot: [0, 0, 90] },
      { type: 'stepper-nema17', name: 'NEMA17 (o\'ng)', pos: [-45, -18,  46], rot: [0, 0, 90] },
      { type: 'tt-wheel-80mm', name: 'G\'ildirak 80mm (chap)',  pos: [-45, -18, -78] },
      { type: 'tt-wheel-80mm', name: 'G\'ildirak 80mm (o\'ng)', pos: [-45, -18,  78] },
      { type: 'caster-wheel', name: 'Kaster g\'ildirak', pos: [78, -18, 0] },

      { type: 'esp32', name: 'ESP32 kontroller', pos: [10, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N (chap motor)',  pos: [-70, 8, -30] },
      { type: 'l298n', name: 'L298N (o\'ng motor)', pos: [-70, 8,  30] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [52, 14, 0] },
      { type: 'hc-sr04', name: 'HC-SR04 sensor', pos: [95, 6, 0] },
    ],
  },

  {
    id: 'excavator',
    title: 'Ekskavator Robot',
    description: 'Bo\'g\'inli manipulyator va cho\'mich — sinov xonasidagi yuklarni ko\'taradi',
    difficulty: 'Murakkab',
    // Real ekskavator: pastda yuruvchi qism (xodovoy), ustida buriladigan
    // kabina, kabinadan strela -> tirsak -> cho'mich chiqadi. Har bo'g'inda
    // alohida servo — shuning uchun bu yig'mada 3 ta servo bor.
    parts: [
      { type: 'robot-chassis', name: 'Yuruvchi qism (shassi)', pos: [0, 0, 0],
        params: { lengthMm: 200, widthMm: 130, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'Motor (old chap)',   pos: [ 56, -22, -50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (old o\'ng)',  pos: [ 56, -22,  50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (orqa chap)',  pos: [-56, -22, -50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'Motor (orqa o\'ng)', pos: [-56, -22,  50], rot: [0, 0, 90] },

      { type: 'tt-wheel-80mm', name: 'G\'ildirak (old chap)',   pos: [ 56, -22, -78] },
      { type: 'tt-wheel-80mm', name: 'G\'ildirak (old o\'ng)',  pos: [ 56, -22,  78] },
      { type: 'tt-wheel-80mm', name: 'G\'ildirak (orqa chap)',  pos: [-56, -22, -78] },
      { type: 'tt-wheel-80mm', name: 'G\'ildirak (orqa o\'ng)', pos: [-56, -22,  78] },

      // Kabina va boshqaruv
      { type: 'arduino-uno', name: 'Arduino Uno', pos: [-52, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N (yurish)', pos: [-52, 26, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [-14, 14, 0] },

      // Manipulyator: bel servosi -> strela -> tirsak servosi -> tirsak ->
      // cho'mich servosi -> cho'mich. Har biri oldingisining uchida turadi.
      { type: 'sg90', name: 'Servo (bel)', pos: [26, 12, 0] },
      { type: 'arm-segment', name: 'Strela', pos: [34, 22, 0], rot: [0, 0, 35],
        params: { lengthMm: 110, widthMm: 22, scalePercent: 100 } },
      { type: 'sg90', name: 'Servo (tirsak)', pos: [124, 85, 0] },
      { type: 'arm-segment', name: 'Tirsak', pos: [128, 92, 0], rot: [0, 0, -42],
        params: { lengthMm: 90, widthMm: 18, scalePercent: 100 } },
      { type: 'sg90', name: 'Servo (cho\'mich)', pos: [193, 32, 0] },
      { type: 'gripper-bucket', name: 'Cho\'mich', pos: [204, 16, 0],
        params: { widthMm: 46, scalePercent: 100 } },

      { type: 'hc-sr04', name: 'HC-SR04 sensor', pos: [86, 12, 0] },
    ],
  },

  {
    id: 'loader_bot',
    title: 'Yuk Ortuvchi Robot',
    description: 'Oldingi ko\'taruvchi cho\'mich — yashiklarni olib, yetkazish zonasiga tashiydi',
    difficulty: 'O\'rta+',
    // Ekskavatordan farqi: qo'l bo'g'insiz, faqat tepaga-pastga ko'tariladi
    // (real pogruzchikdagidek). Soddaroq, lekin yuk vazifasini bajaradi.
    parts: [
      { type: 'robot-chassis', name: 'Shassi', pos: [0, 0, 0],
        params: { lengthMm: 180, widthMm: 120, thickMm: 3, scalePercent: 100 } },

      { type: 'dc-tt-yellow', name: 'TT motor (chap)',  pos: [-40, -22, -50], rot: [0, 0, 90] },
      { type: 'dc-tt-yellow', name: 'TT motor (o\'ng)', pos: [-40, -22,  50], rot: [0, 0, 90] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (chap)',  pos: [-40, -22, -74] },
      { type: 'tt-wheel-65mm', name: 'G\'ildirak (o\'ng)', pos: [-40, -22,  74] },
      { type: 'caster-wheel', name: 'Kaster g\'ildirak', pos: [66, -20, 0] },

      { type: 'arduino-uno', name: 'Arduino Uno', pos: [-20, 8, 0], rot: [0, 90, 0] },
      { type: 'l298n', name: 'L298N drayver', pos: [-56, 8, 0] },
      { type: 'battery-18650-4', name: 'Batareya boksi', pos: [10, 14, 0] },

      // Ko'tarish uzeli: kuchliroq MG90S (metall reduktorli), chunki yuk
      // og'irligi to'g'ridan-to'g'ri shu servoga tushadi.
      { type: 'mg90s', name: 'MG90S servo (ko\'tarish)', pos: [48, 12, 0] },
      { type: 'arm-segment', name: 'Ko\'taruvchi richag', pos: [56, 20, 0], rot: [0, 0, 18],
        params: { lengthMm: 75, widthMm: 20, scalePercent: 100 } },
      { type: 'gripper-bucket', name: 'Cho\'mich', pos: [128, 32, 0],
        params: { widthMm: 58, scalePercent: 100 } },

      { type: 'hc-sr04', name: 'HC-SR04 sensor', pos: [82, 4, 0] },
    ],
  },
];

/** Barcha yig'malar (UI ro'yxati uchun). */
export const ROBOT_KITS = KITS.map(k => ({
  id: k.id,
  title: k.title,
  description: k.description,
  difficulty: k.difficulty,
  partCount: k.parts.length,
}));

/**
 * Yig'mani sahnaga tushirishga tayyor detallar ro'yxatiga aylantiradi.
 * Qaytadigan har element: { type, name, position, rotation, params }.
 */
export function getKitParts(kitId) {
  const kit = KITS.find(k => k.id === kitId);
  if (!kit) return [];
  return kit.parts.map(toScene);
}
