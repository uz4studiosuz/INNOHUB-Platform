export interface ModuleConfig {
  title: string;
  basePath: string;
  accent: string; // CSS background (gradient) for the navbar logo badge
}

export const MODULES: Record<string, ModuleConfig> = {
  drone: {
    title: "Drone",
    basePath: "/modules/drone",
    accent: "linear-gradient(135deg, #f59e0b, #92400e)",
  },
  rover: {
    title: "Rover",
    basePath: "/modules/rover",
    accent: "linear-gradient(135deg, #ea580c, #7c2d12)",
  },
  prosthetics: {
    title: "Prosthetics",
    basePath: "/modules/prosthetics",
    accent: "linear-gradient(135deg, #0d9488, #134e4a)",
  },
  "physics-lab": {
    title: "Physics Lab",
    basePath: "/modules/physics-lab",
    accent: "linear-gradient(135deg, #65a30d, #365314)",
  },
  electronics: {
    title: "Electronics",
    basePath: "/modules/electronics",
    accent: "linear-gradient(135deg, #059669, #064e3b)",
  },
  microelectronics: {
    title: "Microelectronics",
    basePath: "/modules/microelectronics",
    accent: "linear-gradient(135deg, #0891b2, #164e63)",
  },
};
