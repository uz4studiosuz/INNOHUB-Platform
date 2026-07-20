import { computeRocketMetrics } from "./src/lib/physics/rocketPhysics";

const botDesign = {
  propulsion: { pressurePsi: 50, waterVolumeL: 0.35, bottleSize: "20oz_coke" as const },
  recovery: { system: "parachute" as const, parachuteSizeMm: 200 },
  nose: { materialCode: "BT55", ballSizeMm: 38, clayMassG: 20.0 },
  coneTube: { lengthMm: 120.0, diameterMm: 60 },
  coneTransition: { transitionLengthMm: 120.0 },
  fins: { count: 3, shapePoints: 4, spanMm: 40, rootChordMm: 50, tipChordMm: 20, sweepMm: 20, material: "default" },
};

const analysis = computeRocketMetrics(botDesign);
console.log("Max height:", analysis.maxHeightM);
console.log("Flight path length:", analysis.flightPath.length);
console.log("First 5 points:", analysis.flightPath.slice(0, 5));
console.log("Apogee point:", analysis.flightPath.find(p => p.h === analysis.maxHeightM));
