export interface Mission {
  id: string;
  module: string;
  title: string;
  description: string;
  goal: string;
  check: (params: Record<string, number>) => { passed: boolean; message: string };
  params: MissionParam[];
}

export interface MissionParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

const ELECTRONICS_MISSIONS: Mission[] = [
  {
    id: "led_light_up",
    module: "electronics",
    title: "LED yoqish",
    description: "LEDni xavfsiz yoqish uchun to'g'ri rezistorni tanlang",
    goal: "LEDdan o'tayotgan tok 20 mA dan oshmasligi kerak, lekin 5 mA dan kam bo'lmasligi kerak",
    params: [
      { key: "supplyVoltage", label: "Ta'minot kuchlanishi", min: 3, max: 12, step: 1, default: 9, unit: "V" },
      { key: "ledForwardVoltage", label: "LED kuchlanishi", min: 1.2, max: 3.3, step: 0.1, default: 2.2, unit: "V" },
      { key: "resistor", label: "Rezistor qiymati", min: 100, max: 5000, step: 100, default: 1000, unit: "\u03a9" },
    ],
    check: (p) => {
      const current = (p.supplyVoltage - p.ledForwardVoltage) / p.resistor;
      if (current <= 0) return { passed: false, message: "LED yonmaydi — kuchlanish yetarli emas" };
      if (current > 0.02) return { passed: false, message: `Tok juda katta (${(current * 1000).toFixed(1)} mA) — LED kuyadi!` };
      if (current < 0.005) return { passed: false, message: `Tok juda kichik (${(current * 1000).toFixed(1)} mA) — LED yonmaydi` };
      return { passed: true, message: `Ajoyib! LED xavfsiz yonmoqda — tok ${(current * 1000).toFixed(1)} mA` };
    },
  },
  {
    id: "voltage_divider",
    module: "electronics",
    title: "Kuchlanish bo'luvchi",
    description: "Berilgan kirish kuchlanishidan 5V chiqish olish uchun R1 va R2 ni tanlang",
    goal: "Chiqish kuchlanishi 5V ga imkon qadar yaqin bo'lishi kerak (4.8V - 5.2V)",
    params: [
      { key: "vin", label: "Kirish kuchlanishi", min: 9, max: 24, step: 1, default: 12, unit: "V" },
      { key: "r1", label: "R1", min: 100, max: 10000, step: 100, default: 1000, unit: "\u03a9" },
      { key: "r2", label: "R2", min: 100, max: 10000, step: 100, default: 1000, unit: "\u03a9" },
    ],
    check: (p) => {
      const vout = p.vin * p.r2 / (p.r1 + p.r2);
      if (vout >= 4.8 && vout <= 5.2) return { passed: true, message: `To'g'ri! Chiqish: ${vout.toFixed(2)}V` };
      return { passed: false, message: `Chiqish: ${vout.toFixed(2)}V — 5V ga yaqinroq qiymat tanlang` };
    },
  },
  {
    id: "power_limit",
    module: "electronics",
    title: "Quvvat chegarasi",
    description: "0.25W rezistordan foydalanib, 12V zanjirda quvvatni cheklang",
    goal: "Rezistordagi quvvat 0.25W dan oshmasligi kerak",
    params: [
      { key: "voltage", label: "Kuchlanish", min: 3, max: 24, step: 1, default: 12, unit: "V" },
      { key: "resistance", label: "Rezistor", min: 100, max: 10000, step: 100, default: 1000, unit: "\u03a9" },
    ],
    check: (p) => {
      const power = p.voltage ** 2 / p.resistance;
      const current = p.voltage / p.resistance;
      if (power > 0.25) return { passed: false, message: `Quvvat ${power.toFixed(3)}W — 0.25W dan oshdi, rezistor kuyadi!` };
      return { passed: true, message: `Xavfsiz! Tok: ${(current * 1000).toFixed(1)}mA, Quvvat: ${power.toFixed(3)}W` };
    },
  },
];

const MECHANICS_MISSIONS: Mission[] = [
  {
    id: "lever_balance",
    module: "mechanics",
    title: "Richag muvozanati",
    description: "Richagni muvozanatga keltiring (F1*d1 = F2*d2)",
    goal: "Ikki tomonning momentlari teng bo'lishi kerak (farq < 0.5)",
    params: [
      { key: "f1", label: "F1 (kuch)", min: 1, max: 50, step: 1, default: 10, unit: "N" },
      { key: "d1", label: "d1 (masofa)", min: 0.1, max: 5, step: 0.1, default: 2, unit: "m" },
      { key: "f2", label: "F2 (kuch)", min: 1, max: 50, step: 1, default: 20, unit: "N" },
      { key: "d2", label: "d2 (masofa)", min: 0.1, max: 5, step: 0.1, default: 1, unit: "m" },
    ],
    check: (p) => {
      const m1 = p.f1 * p.d1;
      const m2 = p.f2 * p.d2;
      const diff = Math.abs(m1 - m2);
      if (diff < 0.5) return { passed: true, message: `Muvozanat! Momentlar: ${m1.toFixed(1)} = ${m2.toFixed(1)} Nm` };
      return { passed: false, message: `Momentlar farqi: ${diff.toFixed(1)} Nm — muvozanat yo'q` };
    },
  },
];

const AERO_MISSIONS: Mission[] = [
  {
    id: "lift_off",
    module: "aerodynamics",
    title: "Uchish",
    description: "Samolyotni uchirish uchun yetarli ko'tarish kuchini yarating",
    goal: "Ko'tarish kuchi samolyot og'irligidan katta bo'lishi kerak",
    params: [
      { key: "velocity", label: "Tezlik", min: 5, max: 100, step: 1, default: 20, unit: "m/s" },
      { key: "wingArea", label: "Qanot yuzasi", min: 0.5, max: 10, step: 0.1, default: 2, unit: "m\u00b2" },
      { key: "cl", label: "Ko'tarish koeffitsienti", min: 0.1, max: 1.5, step: 0.1, default: 0.5, unit: "" },
    ],
    check: (p) => {
      const lift = 0.5 * 1.225 * p.velocity ** 2 * p.wingArea * p.cl;
      const weight = 500 * 9.81;
      if (lift > weight) return { passed: true, message: `Uchish mumkin! Lift: ${lift.toFixed(0)}N > ${weight.toFixed(0)}N` };
      return { passed: false, message: `Lift: ${lift.toFixed(0)}N, kerak: ${weight.toFixed(0)}N — yetarli emas` };
    },
  },
];

export const ALL_MISSIONS: Record<string, Mission[]> = {
  electronics: ELECTRONICS_MISSIONS,
  mechanics: MECHANICS_MISSIONS,
  aerodynamics: AERO_MISSIONS,
};

export function getProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("innohub_progress") || "{}");
  } catch {
    return {};
  }
}

export function setCompleted(missionId: string): void {
  if (typeof window === "undefined") return;
  const progress = getProgress();
  progress[missionId] = true;
  localStorage.setItem("innohub_progress", JSON.stringify(progress));
}

export function getScore(): number {
  const progress = getProgress();
  return Object.keys(progress).filter((k) => progress[k]).length;
}

export function getTotalMissions(): number {
  return Object.values(ALL_MISSIONS).flat().length;
}
