import { ModuleHome } from "@/components/module-shell/ModuleHome";

export default function ElectronicsHomePage() {
  return <ModuleHome
    title="Electronics Lab"
    intro="Om qonunidan haqiqiy breadboard sxemasigacha bo'lgan jarayonni nazariya, qurish va jonli simulyatsiya orqali o'rganing."
    basePath="/modules/electronics"
    descriptions={[
      "Om qonuni, kuchlanish bo'luvchi va KCL tahlilini o'rganing.",
      "Komponentlarni joylashtiring, ulang va sxemani simulyatsiya qiling.",
      "Sxema natijalarini samaradorlik bo'yicha solishtiring.",
      "Breadboard yig'ish va multimetr o'lchovlariga tayyorlaning.",
    ]}
  />;
}
