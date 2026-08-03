"use client";

import React from "react";
import { useGliderStore } from "../../../../store/gliderStore";
import { IconDownload, IconPrinter } from "@tabler/icons-react";

export default function BuildTestPage() {
  const store = useGliderStore();

  return (
    <div className="flex-1 p-8 bg-[var(--canvas)] text-[var(--ink)] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Build & Test</h1>
        
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-8 mb-8 text-center">
          <IconPrinter size={42} stroke={1.6} className="mx-auto mb-4 text-[var(--accent)]" />
          <h2 className="text-2xl font-bold mb-4">Print Design Templates</h2>
          <p className="text-[var(--ink-muted)] mb-6 max-w-lg mx-auto">
            Ready to bring your digital design into the real world? Print your exact 1:1 scale templates to cut your balsa wood.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-lg transition-colors active:scale-[0.98]">
            <IconDownload size={17} stroke={1.8} /> Download PDF Templates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-[var(--accent)]">Material List</h3>
            <ul className="list-disc list-inside text-[var(--ink-muted)] space-y-2">
              <li>1x Balsa Wood Sheet (1/16&quot; x 3&quot; x 36&quot;)</li>
              <li>1x Balsa Wood Stick (1/4&quot; x 1/4&quot; x 36&quot;)</li>
              <li>Cyanoacrylate (CA) Glue</li>
              <li>Sandpaper (220 and 400 grit)</li>
              <li>Modeling Knife</li>
              <li>Modeling Clay (for nose ballast)</li>
            </ul>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-[var(--accent)]">Build Dimensions</h3>
            <ul className="list-disc list-inside text-[var(--ink-muted)] space-y-2">
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
