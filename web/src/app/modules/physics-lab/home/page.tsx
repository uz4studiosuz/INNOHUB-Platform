"use client";

import Link from "next/link";

export default function PhysicsLabHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-green-500">
          Physics Lab 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Mexanika, elektr, to&apos;lqinlar va termodinamika bo&apos;yicha 17 ta interaktiv tajribani
          o&apos;tkazing — nazariyadan tortib real hisob-kitobga qadar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/physics-lab/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-lime-500/50 transition-all hover:shadow-[0_0_30px_rgba(101,163,13,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">To&apos;rtta fizika sohasi bo&apos;yicha asosiy tushunchalar va formulalar.</p>
          </Link>

          <Link href="/modules/physics-lab" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-lime-500/50 transition-all hover:shadow-[0_0_30px_rgba(101,163,13,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">17 ta tajribadan birini tanlang va parametrlarni hisoblang.</p>
          </Link>

          <Link href="/modules/physics-lab/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-lime-500/50 transition-all hover:shadow-[0_0_30px_rgba(101,163,13,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Fizika bilim testlari bo&apos;yicha reyting (tez orada).</p>
          </Link>

          <Link href="/modules/physics-lab/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-lime-500/50 transition-all hover:shadow-[0_0_30px_rgba(101,163,13,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build &amp; Test</h2>
            <p className="text-slate-400 text-sm">Uy sharoitida bajarish mumkin bo&apos;lgan tajribalar qo&apos;llanmasi (tez orada).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
