export interface ModuleConfig {
  title: string;
  basePath: string;
  accent: string;
}

/**
 * The five sections the platform ships. Each one is a full simulation a student
 * works a design through, not a demo screen.
 */
export const MODULES: Record<string, ModuleConfig> = {
  glider: {
    title: "Planyor",
    basePath: "/modules/glider",
    accent: "#126b55",
  },
  rockets: {
    title: "Raketalar",
    basePath: "/modules/rockets",
    accent: "#126b55",
  },
  electronics: {
    title: "Elektronika",
    basePath: "/modules/electronics",
    accent: "#126b55",
  },
  structures: {
    title: "Tuzilmalar",
    basePath: "/modules/structures",
    accent: "#126b55",
  },
  hardware: {
    title: "3D Konstruktor",
    basePath: "/modules/hardware",
    accent: "#126b55",
  },
};
