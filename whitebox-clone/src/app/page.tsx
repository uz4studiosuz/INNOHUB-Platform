import Link from "next/link";
import { Play, Wind } from "lucide-react";

export default function Home() {
  const labs = [
    {
      id: "glider",
      title: "Glider (Samolyot) Yig'ish & Tahlil",
      description: "Qanot parametrlari (span, chord, dihedral) va aerodinamik samaraning ko'tarish kuchi (L/D) tahlili interaktiv 3D laboratoriyasi.",
      difficulty: "Boshlang'ich / O'rta",
      category: "Aerodinamika",
      link: "/glider-workspace",
      icon: "✈️"
    }
  ];

  return (
    <div className="min-h-screen bg-[#080b11] text-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="max-w-xl w-full flex flex-col gap-8 z-10">
        
        {/* Header section */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 text-xl">
            IH
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">
            STEM Interaktiv Laboratoriya
          </h1>
          <p className="text-sm text-gray-400 max-w-sm">
            Fizika qonuniyatlariga asoslangan 3D simulyatsiyalar yordamida STEM modellarini yig&apos;ing.
          </p>
        </div>

        {/* Labs List */}
        <div className="flex flex-col gap-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-blue-500" />
            <span>Mavjud laboratoriya:</span>
          </span>

          {labs.map((lab) => (
            <div 
              key={lab.id}
              className="group flex flex-col justify-between p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0d1220]/50 hover:bg-[#11182c]/80 transition-all duration-300 shadow-xl hover:translate-y-[-2px] hover:border-blue-500/20"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    {lab.category}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 font-mono">
                    {lab.difficulty}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mt-2 flex items-center gap-2">
                  <span className="text-xl">{lab.icon}</span>
                  <span>{lab.title}</span>
                </h3>
                
                <p className="text-xs text-gray-400 leading-relaxed mt-1.5">
                  {lab.description}
                </p>
              </div>

              <Link 
                href={lab.link}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-xs font-bold py-3 hover:bg-blue-500 transition-all cursor-pointer shadow-lg shadow-blue-500/10 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Laboratoriyaga kirish</span>
              </Link>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600 font-semibold mt-4">
          Whitebox Learning STEM Clone © 2026. Barcha huquqlar himoyalangan.
        </div>

      </div>
    </div>
  );
}
