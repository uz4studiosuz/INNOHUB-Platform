export interface Material {
  id: string;
  name: string;
  density: number; // kg/m^3
  youngsModulus: number; // GPa
  yieldStrength: number; // MPa
}

export const MATERIALS: Material[] = [
  { id: "balsa", name: "Balsa Wood", density: 160, youngsModulus: 3.4, yieldStrength: 20 },
  { id: "aluminum", name: "Aluminum 6061", density: 2700, youngsModulus: 68.9, yieldStrength: 276 },
  { id: "carbon_fiber", name: "Carbon Fiber", density: 1600, youngsModulus: 135, yieldStrength: 600 }
];
