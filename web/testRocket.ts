// Quick sanity print of the rocket flight model, outside the browser:
//   node node_modules/jiti/lib/jiti-cli.mjs testRocket.ts
import { computeRocketMetrics, DEFAULT_DESIGN } from "./src/lib/physics/rocketPhysics";

const a = computeRocketMetrics(DEFAULT_DESIGN);

console.log("Apogee:          ", a.maxHeightM.toFixed(2), "m");
console.log("Burnout velocity:", a.burnoutVelocityMs.toFixed(2), "m/s");
console.log("Burn time:       ", (a.burnTimeS * 1000).toFixed(1), "ms");
console.log("Peak thrust:     ", a.peakThrustN.toFixed(1), "N");
console.log("Total impulse:   ", a.impulseNs.toFixed(3), "Ns");
console.log("Cd:              ", a.dragCoefficient.toFixed(3));
console.log("CG dry / wet:    ", a.cgDryMm.toFixed(1), "/", a.cgMm.toFixed(1), "mm");
console.log("CP:              ", a.cpMm.toFixed(1), "mm");
console.log("Static margin:   ", a.staticMarginCal.toFixed(2), "cal ->", a.stability);
console.log("Descent rate:    ", a.descentRateMs.toFixed(2), "m/s", `(${a.deployStatus})`);
console.log("Flight time:     ", a.totalFlightTimeS.toFixed(2), "s over", a.flightPath.length, "samples");
console.log("Status:          ", a.specStatus, a.specErrors.length ? a.specErrors : "");
if (a.hints.length) console.log("Hints:\n -", a.hints.join("\n - "));
