"use client";

const TICKS = ["S/Y > 1.00", "0.67", "0.33", "0.00", "0.00", "0.33", "0.67", "S/Y > 1.00"];

export function SYColorKey() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-bold text-red-600 flex items-center gap-1">▲ Compression</div>

      <div className="flex items-stretch gap-2">
        <div
          className="w-8 rounded-md"
          style={{
            height: 260,
            background:
              "linear-gradient(180deg, #FF0000 0%, #FF4500 14%, #FFA500 28%, #FFFF66 50%, #FFFF00 50%, #99CCFF 72%, #3366FF 86%, #0000CC 100%)",
          }}
        />
        <div className="flex flex-col justify-between text-[10px] font-mono text-gray-500 py-0.5">
          {TICKS.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <div className="text-xs font-bold text-blue-600 flex items-center gap-1">▼ Tension</div>

      <p className="text-[11px] text-gray-500 mt-1 text-center leading-relaxed max-w-[220px]">
        Bright red yoki dark blue rangga yetgan a&apos;zo — sinish (imminent failure) nuqtasida.
      </p>
    </div>
  );
}
