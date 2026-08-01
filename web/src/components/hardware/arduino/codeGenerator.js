/**
 * Sahnadagi elektronika va motorlar asosida Arduino (.ino) kodini
 * va simlash sxemasi ma'lumotlarini avtomatik generatsiya qilish kodi.
 */

import { getCatalogEntry } from '../data/catalog';

// Standart Arduino Uno pinlar zahirasi
const DEFAULT_PIN_ASSIGNMENTS = {
  l298n: { IN1: 2, IN2: 3, IN3: 4, IN4: 5, ENA: 6, ENB: 9 },
  motor: { IN1: 2, IN2: 3, ENA: 6 },
  servo: { PWM: 10 },
  stepper: { STEP: 8, DIR: 7 },
  ultrasonic: { TRIG: 12, ECHO: 13 },
};

/**
 * Detal va uning pinlarini aniqlash va avto-taqsimlash
 */
export function getComponentPinMappings(sceneObjects, customPinMappings = {}) {
  const electronics = [];
  const usedPins = new Set();
  const pinMappings = { ...customPinMappings };

  sceneObjects.forEach(obj => {
    const entry = getCatalogEntry(obj.type);
    const isElectronic = entry?.category === 'electronic' || 
                         obj.subcat === 'electronic' || 
                         obj.subcat === 'sensor' || 
                         obj.subcat === 'electric' || 
                         obj.type.includes('motor') || 
                         obj.type.includes('servo') || 
                         obj.type.includes('l298n') || 
                         obj.type.includes('stepper') || 
                         obj.type.includes('sensor') || 
                         Boolean(entry?.arduino);
    
    if (isElectronic) {
      const typeKey = obj.type.toLowerCase();
      const pinsNeeded = entry?.arduino?.pins || 
        (DEFAULT_PIN_ASSIGNMENTS[typeKey] ? Object.keys(DEFAULT_PIN_ASSIGNMENTS[typeKey]) : ['IN1', 'IN2']);
      
      const currentPins = pinMappings[obj.id] || {};
      const finalPins = {};

      // Agar avval saqlangan pin mapping bo'lmasa, avto-taqsimlaymiz
      const defaults = DEFAULT_PIN_ASSIGNMENTS[typeKey] || {};
      
      pinsNeeded.forEach((pinName, i) => {
        if (currentPins[pinName] !== undefined) {
          finalPins[pinName] = currentPins[pinName];
          usedPins.add(Number(currentPins[pinName]));
        } else {
          // Bosh pin topish
          let suggestedPin = defaults[pinName] || (2 + i);
          while (usedPins.has(suggestedPin) && suggestedPin < 13) {
            suggestedPin += 1;
          }
          finalPins[pinName] = suggestedPin;
          usedPins.add(suggestedPin);
        }
      });

      pinMappings[obj.id] = finalPins;

      electronics.push({
        id: obj.id,
        name: obj.name,
        type: obj.type,
        kind: entry?.arduino?.kind || typeKey,
        pins: finalPins,
      });
    }
  });

  return { electronics, pinMappings };
}

/**
 * Qaysi pinlarda konflikt (bir nechta detal ulanishi) borligini tekshirish
 */
export function detectPinConflicts(electronics) {
  const pinUsageMap = new Map(); // pin -> list of { objName, pinName }
  const conflicts = [];

  electronics.forEach(item => {
    Object.entries(item.pins).forEach(([pinName, pinNum]) => {
      if (pinNum === null || pinNum === undefined) return;
      const num = Number(pinNum);
      if (!pinUsageMap.has(num)) {
        pinUsageMap.set(num, []);
      }
      pinUsageMap.get(num).push({
        objName: item.name,
        pinName: pinName,
      });
    });
  });

  pinUsageMap.forEach((users, pinNum) => {
    if (users.length > 1) {
      conflicts.push({
        pinNum,
        users,
      });
    }
  });

  return conflicts;
}

/**
 * .ino Arduino kodini generatsiya qilish
 */
export function generateArduinoCode(sceneObjects, customPinMappings = {}) {
  const { electronics, pinMappings } = getComponentPinMappings(sceneObjects, customPinMappings);
  const conflicts = detectPinConflicts(electronics);

  let hasServo = electronics.some(e => e.kind === 'servo');
  let hasL298N = electronics.some(e => e.type.includes('l298n') || e.type.includes('motor'));

  let code = `/*
 * -------------------------------------------------------------
 * Hardware Konstruktsiya Platformasi — Avtomatik Arduino Koda (.ino)
 * Generatsiya qilingan sana: ${new Date().toLocaleString()}
 * Jami elektronika va motorlar soni: ${electronics.length} ta
 * -------------------------------------------------------------
 */\n\n`;

  if (hasServo) {
    code += `#include <Servo.h>\n\n`;
  }

  // Pin Ta'riflari (#define)
  code += `// ===== ARDUINO PIN TA'RIFLARI =====\n`;
  electronics.forEach(item => {
    code += `// ${item.name} (${item.type})\n`;
    Object.entries(item.pins).forEach(([pinName, pinVal]) => {
      const macroName = `${item.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${pinName}`;
      code += `#define ${macroName} ${pinVal}\n`;
    });
    code += `\n`;
  });

  // O'zgaruvchilar va Obyektlar
  code += `// ===== O'ZGARUVCHILAR VA OBYEKTLAR =====\n`;
  if (hasServo) {
    electronics.filter(e => e.kind === 'servo').forEach((s, idx) => {
      code += `Servo servoEngine${idx + 1}; // ${s.name}\n`;
    });
    code += `\n`;
  }

  code += `int motorSpeed = 200; // Standart motor tezligi (0 - 255)\n\n`;

  // SETUP FUNKSIYASI
  code += `// ===== INITIALIZATION (SETUP) =====\n`;
  code += `void setup() {\n`;
  code += `  Serial.begin(9600);\n`;
  code += `  Serial.println("Robot konstruksiyasi ishga tushdi!");\n\n`;

  electronics.forEach(item => {
    code += `  // ${item.name} pinlarini sozlash\n`;
    Object.entries(item.pins).forEach(([pinName]) => {
      const macroName = `${item.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${pinName}`;
      if (pinName.includes('ECHO') || pinName.includes('IN_SENSOR')) {
        code += `  pinMode(${macroName}, INPUT);\n`;
      } else {
        code += `  pinMode(${macroName}, OUTPUT);\n`;
      }
    });
  });

  if (hasServo) {
    electronics.filter(e => e.kind === 'servo').forEach((s, idx) => {
      const macroName = `${s.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PWM`;
      code += `  servoEngine${idx + 1}.attach(${macroName});\n`;
      code += `  servoEngine${idx + 1}.write(90); // Boshlang'ich burchak: 90 degree\n`;
    });
  }

  code += `}\n\n`;

  // LOOP FUNKSIYASI
  code += `// ===== ASOSIY AMALLAR TSIKLI (LOOP) =====\n`;
  code += `void loop() {\n`;

  if (hasL298N) {
    code += `  // 1. Robotni oldinga harakatlantirish\n`;
    code += `  moveForward();\n`;
    code += `  delay(2000);\n\n`;
    code += `  // 2. Robotni to'xtatish va burish\n`;
    code += `  stopRobot();\n`;
    code += `  delay(1000);\n\n`;
  } else {
    code += `  // Odatiy sinov sikli\n`;
    code += `  Serial.println("Robot faol rejimda...");\n`;
    code += `  delay(1000);\n`;
  }

  if (hasServo) {
    code += `  // Servoni burish sikli\n`;
    code += `  for (int angle = 0; angle <= 180; angle += 45) {\n`;
    code += `    servoEngine1.write(angle);\n`;
    code += `    delay(300);\n`;
    code += `  }\n`;
  }

  code += `}\n\n`;

  // YORDAMCHI FUNKSIYALAR
  if (hasL298N) {
    const driver = electronics.find(e => e.type.includes('l298n')) || electronics.find(e => e.kind === 'dc_motor');
    const namePrefix = driver ? driver.name.toUpperCase().replace(/[^A-Z0-9]/g, '_') : 'MOTOR';

    code += `// ===== ROBOT MOTORI BOSHQARUV FUNKSIYALARI =====\n`;
    code += `void moveForward() {\n`;
    code += `  digitalWrite(${namePrefix}_IN1, HIGH);\n`;
    code += `  digitalWrite(${namePrefix}_IN2, LOW);\n`;
    if (driver?.pins?.IN3) {
      code += `  digitalWrite(${namePrefix}_IN3, HIGH);\n`;
      code += `  digitalWrite(${namePrefix}_IN4, LOW);\n`;
    }
    if (driver?.pins?.ENA) {
      code += `  analogWrite(${namePrefix}_ENA, motorSpeed);\n`;
    }
    if (driver?.pins?.ENB) {
      code += `  analogWrite(${namePrefix}_ENB, motorSpeed);\n`;
    }
    code += `  Serial.println("Harakat: Oldinga");\n`;
    code += `}\n\n`;

    code += `void stopRobot() {\n`;
    code += `  digitalWrite(${namePrefix}_IN1, LOW);\n`;
    code += `  digitalWrite(${namePrefix}_IN2, LOW);\n`;
    if (driver?.pins?.IN3) {
      code += `    digitalWrite(${namePrefix}_IN3, LOW);\n`;
      code += `    digitalWrite(${namePrefix}_IN4, LOW);\n`;
    }
    code += `  Serial.println("Harakat: To'xtatildi");\n`;
    code += `}\n`;
  }

  // WIRING DIAGRAM / SIMLASH SXEMASI RO'YXATI
  const wiringGuide = [];
  electronics.forEach(item => {
    Object.entries(item.pins).forEach(([pinName, pinVal]) => {
      let voltageInfo = '5V / Logic';
      if (pinName.includes('ENA') || pinName.includes('ENB')) voltageInfo = 'PWM (Tezlik)';
      if (pinName.includes('VCC') || item.type.includes('l298n')) voltageInfo = '12V / External Power';

      wiringGuide.push({
        component: item.name,
        componentPin: pinName,
        arduinoPin: `Pin D${pinVal}`,
        powerNote: voltageInfo,
      });
    });
  });

  return {
    code,
    electronics,
    pinMappings,
    conflicts,
    wiringGuide,
  };
}
