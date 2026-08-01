"use client";

import React, { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot, Legend,
} from "recharts";
import { useRocketStore } from "../../../../store/rocketStore";
import { FlightSample, finGeometry } from "../../../../lib/physics/rocketPhysics";
import { PrintTemplates } from "../../../../components/rocket-lab/PrintTemplates";

/**
 * The flight model already integrates a full trajectory on every edit; until
 * now nothing ever drew it. These are the three curves that explain a water
 * rocket: thrust collapsing in the first few tens of milliseconds, velocity
 * peaking at burnout, and altitude arcing over at apogee.
 */
type Metric = "h" | "v" | "thrust";

const AXIS: Record<Metric, { label: string; unit: string; colour: string; help: string }> = {
  h: { label: "Balandlik", unit: "m", colour: "#2563eb", help: "Apogeyga qadar ko'tarilib, keyin tushadi" },
  v: { label: "Tezlik", unit: "m/s", colour: "#16a34a", help: "Burnoutda maksimal; manfiy qiymat — tushish" },
  thrust: { label: "Tortish kuchi", unit: "N", colour: "#ea580c", help: "Suv tugagach kuch deyarli darhol nolga tushadi" },
};

export default function BuildTestPage() {
  const { analysis, propulsion, nose, fins } = useRocketStore();
  const [metric, setMetric] = useState<Metric>("h");
  /** The burn is 30 ms out of a 15 s flight, so it needs its own time window. */
  const [zoomBurn, setZoomBurn] = useState(false);
  const [tab, setTab] = useState<"flight" | "build">("flight");

  const data = useMemo(() => {
    const path = analysis.flightPath;
    if (!zoomBurn) return path;
    const cutoff = analysis.burnTimeS * 3 + 0.01;
    return path.filter((p) => p.t <= cutoff);
  }, [analysis.flightPath, analysis.burnTimeS, zoomBurn]);

  const active = AXIS[metric];

  const apogee = useMemo(
    () => analysis.flightPath.reduce((b, p) => (p.h > b.h ? p : b), analysis.flightPath[0]),
    [analysis.flightPath]
  );

  return (
    <div className="absolute inset-0 bg-[#f4f6f8] overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sinov va uchirish</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {tab === "flight"
                ? "Loyihalash bo'limidagi dizayn bo'yicha to'liq uchish traektoriyasi — har bir o'zgarish darhol qayta hisoblanadi."
                : "Virtual dizaynga aynan mos keladigan, 1:1 o'lchamda chop etiladigan shablonlar."}
            </p>
          </div>
          <div className="flex gap-1 bg-white border border-gray-300 rounded-lg p-1">
            {([["flight", "Uchish tahlili"], ["build", "Yasash shablonlari"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${
                  tab === k ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "build" && <PrintTemplates />}

        {tab === "flight" && (
        <div className="space-y-5">
        {/* Headline numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Apogey" value={analysis.maxHeightM.toFixed(1)} unit="m" big />
          <Stat label="Burnout tezligi" value={analysis.burnoutVelocityMs.toFixed(1)} unit="m/s" />
          <Stat label="Cho'qqi kuch" value={analysis.peakThrustN.toFixed(0)} unit="N" />
          <Stat label="Yonish" value={(analysis.burnTimeS * 1000).toFixed(0)} unit="ms" />
          <Stat label="Uchish vaqti" value={analysis.totalFlightTimeS.toFixed(1)} unit="s" />
          <Stat
            label="Qo'nish"
            value={analysis.descentRateMs.toFixed(1)}
            unit="m/s"
            tone={analysis.descentRateMs <= 6 ? "good" : analysis.descentRateMs <= 10 ? "warn" : "bad"}
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {(["h", "v", "thrust"] as Metric[]).map((k) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                  metric === k
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {k === "h" ? "Balandlik" : k === "v" ? "Tezlik" : "Tortish kuchi"}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={zoomBurn} onChange={(e) => setZoomBurn(e.target.checked)} />
              Yonish oynasini kattalashtirish
            </label>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">{active.help}</p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => (zoomBurn ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(1)}s`)}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  label={{ value: "vaqt", position: "insideBottom", offset: -8, fontSize: 11, fill: "#9ca3af" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  label={{ value: active.unit, angle: -90, position: "insideLeft", fontSize: 11, fill: "#9ca3af" }}
                />
                <Tooltip
                  content={({ active: on, payload }) => {
                    if (!on || !payload?.length) return null;
                    const p = payload[0].payload as FlightSample;
                    return (
                      <div className="bg-white border border-gray-300 rounded shadow px-3 py-2 text-[11px] font-mono">
                        <div>t = {p.t < 1 ? `${(p.t * 1000).toFixed(0)} ms` : `${p.t.toFixed(2)} s`}</div>
                        <div>balandlik = {p.h.toFixed(2)} m</div>
                        <div>tezlik = {p.v.toFixed(2)} m/s</div>
                        <div>kuch = {p.thrust.toFixed(1)} N</div>
                        <div>massa = {p.massG.toFixed(1)} g</div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={0} />
                {metric === "v" && <ReferenceLine y={0} stroke="#9ca3af" />}
                {!zoomBurn && (
                  <ReferenceLine
                    x={analysis.ascentTimeS}
                    stroke="#dc2626"
                    strokeDasharray="4 3"
                    label={{ value: "apogey", fontSize: 10, fill: "#dc2626", position: "top" }}
                  />
                )}
                <ReferenceLine
                  x={analysis.burnTimeS}
                  stroke="#ea580c"
                  strokeDasharray="4 3"
                  label={{ value: "burnout", fontSize: 10, fill: "#ea580c", position: "top" }}
                />
                {metric === "h" && !zoomBurn && (
                  <ReferenceDot x={apogee.t} y={apogee.h} r={4} fill="#dc2626" stroke="none" />
                )}
                <Line
                  type="monotone"
                  dataKey={metric}
                  name={`${active.label} (${active.unit})`}
                  stroke={active.colour}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phases + what to try next */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Uchish fazalari</h2>
            <PhaseRow n={1} title="Suv fazasi" detail={`0 → ${(analysis.burnTimeS * 1000).toFixed(0)} ms`}
              note={`Siqilgan havo suvni chiqaradi. Cho'qqi kuch ${analysis.peakThrustN.toFixed(0)} N, impuls ${analysis.impulseNs.toFixed(2)} N·s.`} />
            <PhaseRow n={2} title="Inersiya bilan ko'tarilish" detail={`→ ${analysis.ascentTimeS.toFixed(2)} s`}
              note={`Burnoutdan ${analysis.burnoutAltitudeM.toFixed(1)} m balandlikda ${analysis.burnoutVelocityMs.toFixed(1)} m/s tezlik bilan chiqadi va ${analysis.maxHeightM.toFixed(1)} m ga yetadi.`} />
            <PhaseRow n={3} title={analysis.deployStatus === "Will Deploy" ? "Parashyutda tushish" : "Erkin tushish"}
              detail={`${analysis.descentTimeS.toFixed(1)} s`}
              note={analysis.deployStatus === "Will Deploy"
                ? `Parashyut ochiladi, qo'nish tezligi ${analysis.descentRateMs.toFixed(1)} m/s.`
                : `Parashyut ochilmaydi — ${analysis.descentRateMs.toFixed(1)} m/s bilan yerga uriladi.`} />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Hozirgi dizayn</h2>
            <div className="text-xs text-gray-600 space-y-1.5 font-mono">
              <div>bosim = {propulsion.pressurePsi} PSI</div>
              <div>suv = {propulsion.waterVolumeL.toFixed(2)} L</div>
              <div>loy = {nose.clayMassG} g, nos = {nose.lengthMm} mm</div>
              <div>qanot = {fins.count} × span {finGeometry(fins).spanMm.toFixed(0)} mm</div>
              <div>Cd = {analysis.dragCoefficient.toFixed(3)}</div>
              <div>zapas = {analysis.staticMarginCal.toFixed(2)} kalibr</div>
            </div>

            {(analysis.specErrors.length > 0 || analysis.hints.length > 0) && (
              <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5">
                {analysis.specErrors.map((e, i) => (
                  <div key={`e${i}`} className="text-[11px] text-red-700 font-semibold">✖ {e}</div>
                ))}
                {analysis.hints.map((h, i) => (
                  <div key={`h${i}`} className="text-[11px] text-amber-700">💡 {h}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, big, tone }: {
  label: string; value: string; unit: string; big?: boolean;
  tone?: "good" | "warn" | "bad";
}) {
  const colour = tone === "good" ? "text-green-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`font-mono ${big ? "text-2xl" : "text-lg"} font-bold ${colour}`}>
        {value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function PhaseRow({ n, title, detail, note }: { n: number; title: string; detail: string; note: string }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-gray-800">
          {title} <span className="font-mono font-normal text-gray-400">{detail}</span>
        </div>
        <div className="text-[11px] text-gray-500 leading-snug mt-0.5">{note}</div>
      </div>
    </div>
  );
}
