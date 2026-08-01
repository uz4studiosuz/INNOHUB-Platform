export interface ModuleConfig {
  title: string;
  basePath: string;
  accent: string; // CSS background (gradient) for the navbar logo badge
}

/**
 * The five sections the platform ships. Each one is a full simulation a student
 * works a design through, not a demo screen.
 */
export const MODULES: Record<string, ModuleConfig> = {
  glider: {
    title: "Planyor",
    basePath: "/modules/glider",
    accent: "linear-gradient(135deg, #0284c7, #0c4a6e)",
  },
  rockets: {
    title: "Raketalar",
    basePath: "/modules/rockets",
    accent: "linear-gradient(135deg, #dc2626, #7f1d1d)",
  },
  electronics: {
    title: "Elektronika",
    basePath: "/modules/electronics",
    accent: "linear-gradient(135deg, #059669, #064e3b)",
  },
  structures: {
    title: "Tuzilmalar",
    basePath: "/modules/structures",
    accent: "linear-gradient(135deg, #7c3aed, #4c1d95)",
  },
  hardware: {
    title: "3D Konstruktor",
    basePath: "/modules/hardware",
    accent: "linear-gradient(135deg, #f59e0b, #92400e)",
  },
};
