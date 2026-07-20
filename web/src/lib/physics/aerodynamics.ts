export function liftForce(
  rho: number,
  velocity: number,
  wingArea: number,
  cl: number
): number {
  return 0.5 * rho * velocity ** 2 * wingArea * cl;
}

export function dragForce(
  rho: number,
  velocity: number,
  area: number,
  cd: number
): number {
  return 0.5 * rho * velocity ** 2 * area * cd;
}

export function liftToDrag(lift: number, drag: number): number {
  return lift / drag;
}

export function dynamicPressure(rho: number, velocity: number): number {
  return 0.5 * rho * velocity ** 2;
}

export function airDensityAtAltitude(
  rho0: number,
  altitude: number,
  scaleHeight = 8400
): number {
  return rho0 * Math.exp(-altitude / scaleHeight);
}
