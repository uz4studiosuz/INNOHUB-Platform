export function calculateVoltage(current: number, resistance: number): number {
  return current * resistance;
}

export function calculateCurrent(voltage: number, resistance: number): number {
  if (resistance === 0) throw new Error("Resistance cannot be zero");
  return voltage / resistance;
}

export function calculateResistance(voltage: number, current: number): number {
  if (current === 0) throw new Error("Current cannot be zero");
  return voltage / current;
}

export function calculatePower(voltage: number, current: number): number {
  return voltage * current;
}

export function circuitPower(voltage: number, totalResistance: number): number {
  return voltage ** 2 / totalResistance;
}

export function seriesResistance(...resistances: number[]): number {
  return resistances.reduce((a, b) => a + b, 0);
}

export function parallelResistance(...resistances: number[]): number {
  return 1 / resistances.reduce((sum, r) => sum + 1 / r, 0);
}

export function voltageDivider(vin: number, r1: number, r2: number): number {
  return vin * r2 / (r1 + r2);
}

export function capacitorReactance(frequencyHz: number, capacitanceF: number): number {
  return 1 / (2 * Math.PI * frequencyHz * capacitanceF);
}

export function inductorReactance(frequencyHz: number, inductanceH: number): number {
  return 2 * Math.PI * frequencyHz * inductanceH;
}
