"use client";

import React from "react";
import { useRocketStore } from "../../../../store/rocketStore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

export default function FilePage() {
  const store = useRocketStore();
  const entered = store.revisions.filter((r) => !r.isWorkingCopy);
  const working = store.revisions.filter((r) => r.isWorkingCopy);

  const handleSaveAndEnter = () => {
    if (store.analysis.specStatus === "OUT_OF_SPEC") {
      store.setToast("Musobaqaga kiritilmadi — dizayn talabga javob bermaydi");
      return;
    }
    store.saveRevision(false);
  };

  /**
   * "New design" used to call location.reload(), which restored the very same
   * design from localStorage - the button looked like it did nothing. Resetting
   * the store is what the student actually asked for.
   */
  const handleNewDesign = () => {
    if (window.confirm("Butun dizayn standart qiymatlarga qaytariladi. Saqlanmagan o'zgarishlar yo'qoladi. Davom etamizmi?")) {
      store.resetAll();
    }
  };

  return (
    <div className="absolute inset-0 bg-[#f4f6f8] flex overflow-hidden">
      {/* Left: actions */}
      <div className="w-72 bg-white border-r border-gray-300 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-shrink-0">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Hozirgi dizayn</div>
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono space-y-1">
            <div>balandlik <b>{store.analysis.maxHeightM.toFixed(1)} m</b></div>
            <div>zapas <b>{store.analysis.staticMarginCal.toFixed(2)} kalibr</b></div>
            <div>narx <b>${store.analysis.designCostUsd.toFixed(2)}</b></div>
            <div className={store.analysis.specStatus === "IN_SPEC" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {store.analysis.specStatus === "IN_SPEC" ? "TALABGA JAVOB BERADI" : "TALABGA JAVOB BERMAYDI"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => store.saveRevision(true)}
            className="py-2 bg-gray-200 text-gray-800 rounded font-bold text-xs border border-gray-400 hover:bg-gray-300"
          >
            ISH NUSXASINI SAQLASH
          </button>
          <button
            onClick={handleSaveAndEnter}
            className="py-2 bg-orange-500 text-white rounded font-bold text-xs border border-orange-600 hover:bg-orange-600"
          >
            SAQLASH VA MUSOBAQAGA KIRITISH
          </button>
          <button
            onClick={handleNewDesign}
            className="py-2 bg-white text-red-600 rounded font-bold text-xs border border-red-300 hover:bg-red-50"
          >
            YANGI DIZAYN (standartga qaytarish)
          </button>
        </div>

        {store.revisions.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Versiyalar ({store.revisions.length})
            </div>
            <div className="space-y-1.5">
              {[...store.revisions].reverse().map((r) => (
                <div key={r.id} className="border border-gray-200 rounded px-2.5 py-2 text-xs bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">#{r.id}</span>
                    <span className={`w-2 h-2 rounded-full ${r.status === "IN_SPEC" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-mono text-gray-600">{r.performance.toFixed(1)} m</span>
                    <span className="ml-auto text-[10px] text-gray-400">{r.label}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      onClick={() => store.loadRevision(r.id)}
                      className="flex-1 py-1 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 hover:bg-gray-100"
                    >
                      YUKLASH
                    </button>
                    <button
                      onClick={() => store.deleteRevision(r.id)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-[10px] text-red-500 hover:bg-red-50"
                      title="O'chirish"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: performance history */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar min-w-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800 text-center">Dizayn samaradorligi tarixi</h1>
          <p className="text-xs text-center text-gray-500 mt-1 mb-6">
            Musobaqaga kiritilgan versiyalar. Ish nusxalari grafikda ko&apos;rsatilmaydi
            {working.length > 0 && ` (${working.length} ta ish nusxasi saqlangan)`}.
          </p>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="h-80">
              {entered.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={entered} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="id"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      label={{ value: "versiya", position: "insideBottom", offset: -8, fontSize: 11, fill: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      label={{ value: "balandlik, m", angle: -90, position: "insideLeft", fontSize: 11, fill: "#9ca3af" }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof entered)[number];
                        return (
                          <div className="bg-white border border-gray-300 rounded shadow px-3 py-2 text-[11px]">
                            <div className="font-bold">Versiya #{d.id}</div>
                            <div className="font-mono">{d.performance.toFixed(2)} m</div>
                            <div className={d.status === "IN_SPEC" ? "text-green-600" : "text-red-600"}>
                              {d.status === "IN_SPEC" ? "talabga javob beradi" : "talabga javob bermaydi"}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={store.analysis.maxHeightM}
                      stroke="#ea580c"
                      strokeDasharray="4 3"
                      label={{ value: "hozirgi", fontSize: 10, fill: "#ea580c", position: "right" }}
                    />
                    <Line
                      type="linear"
                      dataKey="performance"
                      stroke="#6366f1"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { id: number; status: string } };
                        return (
                          <circle
                            key={payload.id}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={payload.status === "IN_SPEC" ? "#10b981" : "#ef4444"}
                          />
                        );
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                  <span className="text-3xl">📈</span>
                  Hali musobaqaga kiritilgan dizayn yo&apos;q.
                  <span className="text-xs">Chapdagi «Saqlash va musobaqaga kiritish» tugmasini bosing.</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-6 text-[11px] text-gray-500 font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> TALABGA JAVOB BERADI
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> JAVOB BERMAYDI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
