import { ModuleHome } from "@/components/module-shell/ModuleHome";

export default function StructuresHomePage() {
  return <ModuleHome
    title="Structures Lab"
    intro="Truss ko'priklarini kuchlar, stress va material chegaralari asosida tahlil qiling, so'ng o'z konstruktsiyangizni yarating."
    basePath="/modules/structures"
    descriptions={[
      "Truss tizimlari, kuchlar va material xossalarini o'rganing.",
      "Balka, ustun va ko'prik geometriyasini hisoblang.",
      "Konstruktsiyani yuk sinovi va reytingda tekshiring.",
      "Shablonlardan foydalanib jismoniy ko'prik quring.",
    ]}
  />;
}
