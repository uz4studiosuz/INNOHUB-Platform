"use client";

import Link from "next/link";

export default function ProstheticsHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
          Prosthetics 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Bionik protez muhandisligini o&apos;rganing: bo&apos;g&apos;im momenti, richag mexanik yutug&apos;i,
          material zo&apos;riqishi va aktuator batareya muddati nazariyasidan tortib, haqiqiy protez dizayniga qadar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/prosthetics/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-teal-500/50 transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">Bo&apos;g&apos;im momenti, richag nazariyasi va material xavfsizligini o&apos;rganing.</p>
          </Link>

          <Link href="/modules/prosthetics" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-teal-500/50 transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">Bo&apos;g&apos;im, material va aktuator parametrlarini sozlab, xavfsizlik koeffitsientini hisoblang.</p>
          </Link>

          <Link href="/modules/prosthetics/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-teal-500/50 transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Protezlarni tutish kuchi va batareya muddati bo&apos;yicha solishtiring (tez orada).</p>
          </Link>

          <Link href="/modules/prosthetics/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-teal-500/50 transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build &amp; Test</h2>
            <p className="text-slate-400 text-sm">Protez prototipini yig&apos;ish va yuk sinovidan o&apos;tkazish bo&apos;yicha qo&apos;llanma (tez orada).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
