/**
 * The vehicles that can be driven across a finished bridge.
 *
 * The mass here is real: it is turned into a load (m·g) and compared against
 * the failure load the solver found, which is what decides whether the design
 * actually carries this vehicle. Changing the vehicle therefore changes the
 * verdict, not just the picture.
 */
export interface VehiclePreset {
  id: string;
  label: string;
  /** Gross mass in kilograms - the loaded weight, not the kerb weight. */
  massKg: number;
  /** Body length in metres, used to scale the 3D model. */
  lengthM: number;
  /** Axle pairs. A 3-axle lorry rides on six wheels. */
  axles: number;
  bodyColor: string;
  cabColor: string;
  hint: string;
}

export const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "car",
    label: "Yengil avtomobil",
    massKg: 1400,
    lengthM: 4.4,
    axles: 2,
    bodyColor: "#3b82f6",
    cabColor: "#2563eb",
    hint: "Oddiy shaxsiy avtomobil — eng yengil sinov",
  },
  {
    id: "van",
    label: "Mikroavtobus",
    massKg: 3200,
    lengthM: 5.6,
    axles: 2,
    bodyColor: "#e2e8f0",
    cabColor: "#cbd5e1",
    hint: "Yuk tashuvchi mikroavtobus yoki marshrutka",
  },
  {
    id: "monster",
    label: "Monster truck",
    massKg: 4800,
    lengthM: 5.2,
    axles: 2,
    bodyColor: "#ea6a1e",
    cabColor: "#f2761f",
    hint: "Baland osmali rally mashinasi",
  },
  {
    id: "lorry",
    label: "Yuk mashinasi",
    massKg: 12000,
    lengthM: 8.2,
    axles: 3,
    bodyColor: "#16a34a",
    cabColor: "#15803d",
    hint: "To'la yuklangan uch o'qli yuk mashinasi",
  },
];

export const GRAVITY = 9.81;

export function vehicleById(id: string): VehiclePreset {
  return VEHICLE_PRESETS.find((v) => v.id === id) ?? VEHICLE_PRESETS[0];
}

/** Vehicle weight as a force in newtons - the unit the solver reports in. */
export function vehicleLoadN(massKg: number): number {
  return massKg * GRAVITY;
}
