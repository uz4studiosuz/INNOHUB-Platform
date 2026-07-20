export function calculateVelocity(initialVelocity: number, acceleration: number, time: number): number {
  return initialVelocity + acceleration * time;
}

export function calculateDistance(initialVelocity: number, acceleration: number, time: number): number {
  return initialVelocity * time + 0.5 * acceleration * time * time;
}
