export function kineticEnergy(mass: number, velocity: number): number {
  return 0.5 * mass * velocity ** 2;
}

export function potentialEnergy(mass: number, height: number, g = 9.81): number {
  return mass * g * height;
}

export function netForce(mass: number, acceleration: number): number {
  return mass * acceleration;
}

export function weight(mass: number, g = 9.81): number {
  return mass * g;
}

export function springForce(k: number, displacement: number): number {
  return -k * displacement;
}

export function springPE(k: number, displacement: number): number {
  return 0.5 * k * displacement ** 2;
}

export function leverMA(effortArm: number, loadArm: number): number {
  return effortArm / loadArm;
}

export function gearRatio(driven: number, driver: number): number {
  return driven / driver;
}
