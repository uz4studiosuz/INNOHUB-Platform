"use client";

import Link from "next/link";

export default function StructuresHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#080b11] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
          Structures 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Truss (panjara) ko&apos;prik muhandisligini o&apos;rganing: kuchlar, kuchlanish (stress) va oquvchanlik
          chegarasi (yield strength) nazariyasidan tortib, haqiqiy ko&apos;prik dizayniga qadar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/structures/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-violet-500/50 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">Truss tizimlari, kuchlar va stress/yield nazariyasini o&apos;rganing.</p>
          </Link>

          <Link href="/modules/structures" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-violet-500/50 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">Balka va ustun tahlili — egilish, tanglik, xavfsizlik koeffitsienti.</p>
          </Link>

          <Link href="/modules/structures/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-violet-500/50 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Ko&apos;prigingizni yuk sinovidan o&apos;tkazing (tez orada).</p>
          </Link>

          <Link href="/modules/structures/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-violet-500/50 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build &amp; Test</h2>
            <p className="text-slate-400 text-sm">Shablonlarni chop eting va jismoniy ko&apos;prik quring (tez orada).</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
