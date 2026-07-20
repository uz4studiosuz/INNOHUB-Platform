"use client";

import React from "react";
import Link from "next/link";

export default function GliderHomePage() {
  return (
    <div className="flex-1 p-8 bg-[#060814] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center mt-20">
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
          Glider Lab 2.0
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl">
          Design, optimize, and test your own balsa wood glider using real-time aerodynamics simulation and physics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <Link href="/modules/glider/research" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔬</div>
            <h2 className="text-2xl font-bold mb-2">1. Research</h2>
            <p className="text-slate-400 text-sm">Learn the fundamentals of flight and glider terminology.</p>
          </Link>

          <Link href="/modules/glider" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">2. Engineering</h2>
            <p className="text-slate-400 text-sm">Build your parametric model in the 3D viewport.</p>
          </Link>

          <Link href="/modules/glider/competition" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h2 className="text-2xl font-bold mb-2">3. Competition</h2>
            <p className="text-slate-400 text-sm">Test your design against others in the virtual arena.</p>
          </Link>

          <Link href="/modules/glider/build-test" className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] p-8 rounded-xl hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🛠️</div>
            <h2 className="text-2xl font-bold mb-2">4. Build & Test</h2>
            <p className="text-slate-400 text-sm">Print templates and construct your physical glider.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
