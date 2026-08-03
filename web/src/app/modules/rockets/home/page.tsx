import { ModuleHome } from "../../../../components/module-shell/ModuleHome";

export default function RocketHomePage() {
  return (
    <ModuleHome
      title="Raketa laboratoriyasi"
      intro="Suv raketasini tadqiq qiling, muhandislik modelini yarating va parvoz natijalarini iteratsiyalar bo‘yicha solishtiring."
      basePath="/modules/rockets"
      descriptions={[
        "Aerodinamika, bosim va parvozning asosiy qonunlarini o‘rganing.",
        "Raketa geometriyasi, suv miqdori va stabilizatorlarni sozlang.",
        "Dizayningizni boshqa yechimlar bilan parvoz maydonida taqqoslang.",
        "Tanlangan konfiguratsiyani ishga tushirib, telemetriyani tekshiring.",
      ]}
    />
  );
}
