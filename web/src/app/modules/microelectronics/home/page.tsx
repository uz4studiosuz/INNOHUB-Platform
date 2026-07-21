"use client";

import Link from "next/link";

export default function MicroelectronicsHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Microelectronics 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Mikrokontroller va IC arxitekturasini o&apos;rganing: klock tezligi, xotira, GPIO pinlar
          va quvvat talablari — real loyihalarda komponent tanlash uchun.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/microelectronics/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-cyan-500/50 transition-all hover:shadow-[0_0_30px_rgba(8,145,178,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">Mikrokontroller arxitekturasi, klock, xotira va GPIO asoslarini o&apos;rganing.</p>
          </Link>

          <Link href="/modules/microelectronics" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-cyan-500/50 transition-all hover:shadow-[0_0_30px_rgba(8,145,178,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">6 ta chip/board&apos;ni solishtirib, o&apos;z loyihangiz uchun mosini tanlang.</p>
          </Link>

          <Link href="/modules/microelectronics/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-cyan-500/50 transition-all hover:shadow-[0_0_30px_rgba(8,145,178,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Komponent tanlash bilim testi bo&apos;yicha reyting (tez orada).</p>
          </Link>

          <Link href="/modules/microelectronics/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-cyan-500/50 transition-all hover:shadow-[0_0_30px_rgba(8,145,178,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build &amp; Test</h2>
            <p className="text-slate-400 text-sm">Tanlangan mikrokontrollerni haqiqiy loyihada dasturlash qo&apos;llanmasi (tez orada).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
