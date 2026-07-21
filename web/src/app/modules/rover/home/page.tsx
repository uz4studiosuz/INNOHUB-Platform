"use client";

import Link from "next/link";

export default function RoverHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
          Rover 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Mars roveri muhandisligini o&apos;rganing: tortish kuchi, reduktor (gear) nisbati, qarshilik
          kuchlari va nishab bo&apos;ylab harakat nazariyasidan tortib, haqiqiy rover dizayniga qadar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/rover/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">Tortish kuchi, qarshilik va nishab bo&apos;ylab harakat nazariyasini o&apos;rganing.</p>
          </Link>

          <Link href="/modules/rover" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">Motor, reduktor va g&apos;ildirak parametrlarini sozlab, rover harakatini simulyatsiya qiling.</p>
          </Link>

          <Link href="/modules/rover/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Rovlarni masofa va nishab yengish qobiliyati bo&apos;yicha solishtiring (tez orada).</p>
          </Link>

          <Link href="/modules/rover/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build &amp; Test</h2>
            <p className="text-slate-400 text-sm">Shassi yig&apos;ish va haqiqiy sinov maydonchasida sinash bo&apos;yicha qo&apos;llanma (tez orada).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
