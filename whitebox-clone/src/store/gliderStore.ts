import { create } from "zustand";

interface WingParams {
  span: number;           // mm, range: 100 - 400
  chord: number;          // mm, range: 20 - 100
  dihedralAngle: number;  // degrees, range: -15 - 15
}

interface PhysicsState {
  liftEfficiency: number; // L/D ratio or metric (0 to 30)
  effectiveAngle: number; // degrees
  weight: number;         // grams
}

interface GliderState {
  wing: WingParams;
  physics: PhysicsState;
  isOutOfSpec: boolean;
  setWingParams: (params: Partial<WingParams>) => void;
}

// Utility to calculate physical characteristics based on wing geometry
function calculateGliderPhysics(span: number, chord: number, dihedral: number) {
  // 1. Aspect Ratio (AR = span / chord)
  const AR = chord > 0 ? span / chord : 0;

  // 2. Lift Coefficient (CL) at a constant nominal angle of attack (say 5 degrees)
  const alpha = 5; 
  const CL = 0.1 * alpha;

  // 3. Induced Drag Coefficient (CDi = CL^2 / (pi * e * AR))
  const oswald = 0.8;
  const CDi = AR > 0 ? (CL * CL) / (Math.PI * oswald * AR) : 0.5;

  // 4. Zero-lift (parasitic) drag (CD0 increases slightly with dihedral angle instability)
  const CD0 = 0.02 + 0.005 * Math.pow(Math.abs(dihedral) / 10, 2);

  // 5. Total Drag (CD = CD0 + CDi)
  const CD = CD0 + CDi;

  // 6. Lift-to-Drag Ratio (L/D) representing Lift Efficiency (capped between 0 and 30)
  const LD = CD > 0 ? CL / CD : 0;
  const liftEfficiency = Math.min(30, Math.max(0, LD));

  // 7. Weight calculation (assuming balsa wood density + standard fuselage)
  const woodDensity = 0.00015; // g/mm^3
  const wingThickness = 4; // mm
  const wingVolume = span * chord * wingThickness;
  const wingWeight = wingVolume * woodDensity;
  const fuselageWeight = 80; // grams
  const totalWeight = parseFloat((fuselageWeight + wingWeight).toFixed(1));

  // 8. Effective launch glide angle (in degrees, approx atan(1 / LD))
  const effectiveAngle = LD > 0 ? parseFloat((Math.atan(1 / LD) * (180 / Math.PI)).toFixed(1)) : 90;

  return {
    liftEfficiency: parseFloat(liftEfficiency.toFixed(2)),
    effectiveAngle,
    weight: totalWeight
  };
}

export const useGliderStore = create<GliderState>((set) => {
  // Initial parameters
  const initialWing = { span: 200, chord: 50, dihedralAngle: 0 };
  const initialPhysics = calculateGliderPhysics(200, 50, 0);

  return {
    wing: initialWing,
    physics: initialPhysics,
    isOutOfSpec: false,

    setWingParams: (params) => {
      set((state) => {
        const updatedWing = { ...state.wing, ...params };
        
        // Calculate new physics
        const updatedPhysics = calculateGliderPhysics(
          updatedWing.span,
          updatedWing.chord,
          updatedWing.dihedralAngle
        );

        // Validation limits: out of spec if outside standard ranges
        const isOutOfSpec = 
          updatedWing.span < 120 || 
          updatedWing.span > 380 ||
          updatedWing.chord < 30 || 
          updatedWing.chord > 90 ||
          updatedWing.dihedralAngle < -12 || 
          updatedWing.dihedralAngle > 12;

        return {
          wing: updatedWing,
          physics: updatedPhysics,
          isOutOfSpec
        };
      });
    }
  };
});
