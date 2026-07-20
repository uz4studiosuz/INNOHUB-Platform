export interface PropulsionParams {
  pressurePsi: number;
  waterVolumeL: number;
  bottleSize: "20oz_coke" | "1L" | "2L_coke" | "2L_pepsi";
}

export interface RecoveryParams {
  system: "parachute" | "backslider";
  parachuteSizeMm: number;
}

export interface NoseParams {
  materialCode: string;
  ballSizeMm: number;
  clayMassG: number;
}

export interface ConeTubeParams {
  lengthMm: number;
  diameterMm: number | null; // null if implied by transition
}

export interface ConeTransitionParams {
  transitionLengthMm: number;
}

export interface FinsParams {
  count: number;
  shapePoints: number; // 4 or 5
  spanMm: number; // For simplicity in base calculation
  rootChordMm: number;
  tipChordMm: number;
  sweepMm: number;
  material: string;
}

export interface RocketDesign {
  propulsion: PropulsionParams;
  recovery: RecoveryParams;
  nose: NoseParams;
  coneTube: ConeTubeParams;
  coneTransition: ConeTransitionParams;
  fins: FinsParams;
}

export interface RocketAnalysis {
  massG: number;
  dragN: number;
  burnoutVelocityMs: number;
  staticMarginMm: number;
  maxHeightM: number;
  ascentTimeS: number;
  descentTimeS: number;
  totalFlightTimeS: number;
  designCostUsd: number;
  specStatus: "IN_SPEC" | "OUT_OF_SPEC";
  deployStatus: "Will Deploy" | "Will NOT Deploy";
  specErrors: string[];
  flightPath: { t: number; h: number; v: number }[];
}

const BOTTLE_PROPS = {
  "20oz_coke": { emptyMass: 25.0, surfaceArea: 357.63, volumeCm3: 591, radiusMm: 35 },
  "1L": { emptyMass: 35.0, surfaceArea: 520.0, volumeCm3: 1000, radiusMm: 42 },
  "2L_coke": { emptyMass: 48.0, surfaceArea: 832.96, volumeCm3: 2000, radiusMm: 55 },
  "2L_pepsi": { emptyMass: 48.5, surfaceArea: 835.0, volumeCm3: 2000, radiusMm: 55 }
};

export function computeRocketMetrics(design: RocketDesign): RocketAnalysis {
  const bottle = BOTTLE_PROPS[design.propulsion.bottleSize];
  
  // Mass Calculation (simplified)
  const waterMass = design.propulsion.waterVolumeL * 1000;
  const noseMass = 5.0 + design.nose.clayMassG;
  const coneTubeMass = design.coneTube.lengthMm * 0.1;
  const transitionMass = design.coneTransition.transitionLengthMm * 0.15;
  const finsMass = design.fins.count * 1.5;
  const recoveryMass = design.recovery.system === "parachute" ? (design.recovery.parachuteSizeMm / 100) * 2 : 1.0;
  
  const emptyMassG = bottle.emptyMass + noseMass + coneTubeMass + transitionMass + finsMass + recoveryMass;
  const totalMassG = emptyMassG + waterMass;

  // Deploy Status Check
  const deployVolume = design.recovery.system === "parachute" ? design.recovery.parachuteSizeMm * 0.2 : 0;
  // Approximation of tube volume
  const tubeVolume = Math.PI * Math.pow(bottle.radiusMm/10, 2) * (design.coneTube.lengthMm/10); 
  
  let deployStatus: "Will Deploy" | "Will NOT Deploy" = "Will Deploy";
  if (tubeVolume < deployVolume || design.nose.clayMassG < 20) {
    deployStatus = "Will NOT Deploy";
  }
  if (design.recovery.system !== "parachute") {
    deployStatus = "Will NOT Deploy"; // backslider implies no parachute deploy
  }

  // Cost calculation
  const designCostUsd = 2.0 + (design.fins.count * 0.25) + (design.nose.clayMassG * 0.05) + (design.recovery.parachuteSizeMm > 0 ? 1.0 : 0);

  // Physics Simulation (Euler Integration)
  const pAtm = 101325; // Pa
  const pInitial = design.propulsion.pressurePsi * 6894.76 + pAtm; // Absolute pressure
  const rhoWater = 1000; // kg/m3
  const rhoAir = 1.225; // kg/m3
  const nozzleArea = Math.PI * Math.pow(0.011, 2); // 22mm diameter nozzle (11mm radius)
  const frontalArea = Math.PI * Math.pow(bottle.radiusMm / 1000, 2);
  const Cd = 0.45;
  const k = 1.4; // Adiabatic index

  const dt = 0.01;
  let t = 0;
  let v = 0;
  let h = 0;

  let currentMass = totalMassG / 1000;
  let vWaterRemaining = design.propulsion.waterVolumeL / 1000; // m3
  const vTotalBottle = bottle.volumeCm3 / 1000000; // m3
  let vAirInitial = vTotalBottle - vWaterRemaining;
  if (vAirInitial <= 0) vAirInitial = 0.0001; // Avoid division by zero
  const p0 = pInitial;

  const flightPath: { t: number; h: number; v: number }[] = [];
  flightPath.push({ t, h, v });

  // 1. Boost Phase
  while (vWaterRemaining > 0 && h >= 0) {
    const vAirCurrent = vTotalBottle - vWaterRemaining;
    const pCurrent = p0 * Math.pow(vAirInitial / vAirCurrent, k);
    
    let thrust = 0;
    if (pCurrent > pAtm) {
      const vExit = Math.sqrt((2 * (pCurrent - pAtm)) / rhoWater);
      const massFlowRate = rhoWater * nozzleArea * vExit;
      thrust = massFlowRate * vExit + (pCurrent - pAtm) * nozzleArea;
      
      const dm = massFlowRate * dt;
      currentMass -= dm;
      vWaterRemaining -= dm / rhoWater;
    } else {
      vWaterRemaining = 0; // Pressure equalized, no more water is pushed out
    }

    const drag = 0.5 * rhoAir * Math.abs(v) * v * Cd * frontalArea; // drag opposes velocity
    const weight = currentMass * 9.81;
    const a = (thrust - weight - drag) / currentMass;

    v += a * dt;
    h += v * dt;
    t += dt;

    if (h < 0) h = 0;
    flightPath.push({ t: Number(t.toFixed(2)), h, v });
  }

  const burnoutVelocityMs = v;
  const dragN = 0.5 * rhoAir * burnoutVelocityMs * burnoutVelocityMs * Cd * frontalArea; // For output

  // 2. Coast Phase (until apogee)
  while (v > 0) {
    const drag = 0.5 * rhoAir * v * v * Cd * frontalArea;
    const weight = currentMass * 9.81;
    const a = -(weight + drag) / currentMass;

    v += a * dt;
    h += v * dt;
    t += dt;

    flightPath.push({ t: Number(t.toFixed(2)), h, v });
  }

  const maxHeightM = h;
  const ascentTimeS = t;

  // 3. Descent Phase
  let CdDescent = Cd;
  let ADescent = frontalArea;

  if (deployStatus === "Will Deploy") {
    CdDescent = 1.5;
    ADescent = Math.PI * Math.pow(design.recovery.parachuteSizeMm / 2000, 2); // r in meters
  }

  while (h > 0) {
    const drag = 0.5 * rhoAir * v * v * CdDescent * ADescent; // drag pushes up
    const weight = currentMass * 9.81;
    const a = (drag - weight) / currentMass; // positive drag, negative weight

    v += a * dt;
    h += v * dt;
    t += dt;

    if (h < 0) h = 0;
    flightPath.push({ t: Number(t.toFixed(2)), h, v });
    
    if (t > 150) break; // Safety break
  }

  const descentTimeS = t - ascentTimeS;
  const totalFlightTimeS = t;

  // Static Margin (dummy calc for now)
  const staticMarginMm = 50 + (design.fins.count * 10) - (design.nose.clayMassG * 0.5);

  // Specifications Validation
  const specErrors: string[] = [];
  if (design.propulsion.pressurePsi > 60) specErrors.push("Air Pressure out of range (max 60)");
  if (design.fins.count > 4) specErrors.push("Number of Fins out of range (max 4)");
  if (design.recovery.parachuteSizeMm > 241.3) specErrors.push("Parachute Size out of range");
  if (designCostUsd > 6) specErrors.push("Budget exceeded (max $6)");
  if (deployStatus === "Will NOT Deploy" && design.recovery.system === "parachute") specErrors.push("Parachute will not deploy");

  const specStatus = specErrors.length === 0 ? "IN_SPEC" : "OUT_OF_SPEC";

  return {
    massG: emptyMassG,
    dragN: dragN,
    burnoutVelocityMs,
    staticMarginMm,
    maxHeightM,
    ascentTimeS,
    descentTimeS,
    totalFlightTimeS,
    designCostUsd,
    specStatus,
    deployStatus,
    specErrors,
    flightPath
  };
}
