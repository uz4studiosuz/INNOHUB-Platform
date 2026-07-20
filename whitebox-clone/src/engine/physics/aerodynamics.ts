export function calculateDrag(density: number, velocity: number, area: number, dragCoefficient: number): number {
  return 0.5 * density * velocity * velocity * area * dragCoefficient;
}

export function calculateLift(density: number, velocity: number, wingArea: number, liftCoefficient: number): number {
  return 0.5 * density * velocity * velocity * wingArea * liftCoefficient;
}
