import { ModuleHome } from "@/components/module-shell/ModuleHome";

export default function GliderHomePage() {
  return <ModuleHome
    title="Glider Lab"
    intro="Real vaqt aerodinamika modeli yordamida balsa yog'ochidan planyor yarating, optimallashtiring va sinovdan o'tkazing."
    basePath="/modules/glider"
    descriptions={[
      "Parvoz asoslari va planyor terminlarini o'rganing.",
      "Parametrik modelni 3D ish maydonida yarating.",
      "Dizayningizni virtual maydonda boshqa natijalar bilan solishtiring.",
      "Aniq shablonlarni tayyorlab, jismoniy modelni yig'ing.",
    ]}
  />;
}
