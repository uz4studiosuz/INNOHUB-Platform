"use client";

import React from "react";
import { useGliderStore } from "../../../../store/gliderStore";

export default function BuildTestPage() {
  const store = useGliderStore();

  return (
    <div className="flex-1 p-8 bg-[#060814] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Build & Test</h1>
        
        <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 mb-8 text-center">
          <div className="text-6xl mb-4">🖨️</div>
          <h2 className="text-2xl font-bold mb-4">Print Design Templates</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Ready to bring your digital design into the real world? Print your exact 1:1 scale templates to cut your balsa wood.
          </p>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_20px_rgba(37,99,235,0.4)] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
            Download PDF Templates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-blue-400">Material List</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-2">
              <li>1x Balsa Wood Sheet (1/16" x 3" x 36")</li>
              <li>1x Balsa Wood Stick (1/4" x 1/4" x 36")</li>
              <li>Cyanoacrylate (CA) Glue</li>
              <li>Sandpaper (220 and 400 grit)</li>
              <li>Modeling Knife</li>
              <li>Modeling Clay (for nose ballast)</li>
            </ul>
          </div>
          <div className="bg-[#0a0e18] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-blue-400">Build Dimensions</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-2">
              <li>Wing Span: {store.wing.span.toFixed(1)} mm</li>
              <li>Wing Chord: {store.wing.chord.toFixed(1)} mm</li>
              <li>Fuselage Length: {store.fuselage.length.toFixed(1)} mm</li>
              <li>H-Stab Span: {store.horizontalStabilizer.span.toFixed(1)} mm</li>
              <li>V-Stab Height: {store.verticalStabilizer.height.toFixed(1)} mm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
