"use client";

import React from "react";
import { useRocketStore } from "../../../../store/rocketStore";
import { BOTTLE_INFO, SPEC, finGeometry } from "../../../../lib/physics/rocketPhysics";

const BOTTLE_LABEL: Record<string, string> = {
  "20oz_coke": "20 oz",
  "1L": "1 L",
  "2L_coke": "2 L Coke",
  "2L_pepsi": "2 L Pepsi",
};

export default function OutputsPage() {
  const store = useRocketStore();
  const a = store.analysis;
  const bottleL = BOTTLE_INFO[store.propulsion.bottleSize].volumeCm3 / 1000;
  const fg = finGeometry(store.fins);

  return (
    <div className="absolute inset-0 bg-[#f4f6f8] overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="flex items-start justify-between border-b pb-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Dizayn talablari hisoboti</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Loyihalash bo&apos;limidagi hozirgi dizayn bo&apos;yicha
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide ${
              a.specStatus === "IN_SPEC"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {a.specStatus === "IN_SPEC" ? "TALABGA JAVOB BERADI" : "TALABGA JAVOB BERMAYDI"}
            </span>
          </div>

          {/* Laid out the way the original report is: what is allowed at all,
              then the numeric inputs, then cost - which is reported but has no
              ceiling. */}
          <Section title="Ruxsat etilganlar">
            <Table head={["Ko'rsatkich", "Ruxsat", "Loyihada", ""]}>
              <Row label="Parashyutli qutqaruv" limit="Ha"
                value={store.recovery.system === "parachute" ? "Ha" : "Yo'q"}
                ok={store.recovery.system === "parachute"} />
              <Row label="Butilka o'lchami" limit="20oz, 1L, 2L"
                value={BOTTLE_LABEL[store.propulsion.bottleSize]} ok />
              <Row label="Qanot shakli" limit="Yaroqli"
                value={fg.areaMm2 >= 100 ? "Yaroqli" : "Yaroqsiz"}
                ok={fg.areaMm2 >= 100} />
              <Row label="Qanot / uchirish qurilmasi" limit="Tegmaydi"
                value={fg.hitsLauncher ? "Tegadi" : "Tegmaydi"} ok={!fg.hitsLauncher} />
              <Row label="Parashyut ochilishi" limit="Ochiladi"
                value={a.deployStatus === "Will Deploy" ? "Ochiladi" : "Ochilmaydi (izohga qarang)"}
                ok={a.deployStatus === "Will Deploy"} />
            </Table>
          </Section>

          <Section title="Raketa kirish parametrlari">
            <Table head={["Ko'rsatkich", "Maksimum", "Loyihada", ""]}>
              <Row label="Havo bosimi" limit={`${SPEC.maxPressurePsi} psi`}
                value={`${store.propulsion.pressurePsi} psi`} ok={store.propulsion.pressurePsi <= SPEC.maxPressurePsi} />
              <Row label="Nos uzunligi" limit={`${SPEC.maxNoseLengthMm.toFixed(1)} mm`}
                value={`${store.nose.lengthMm.toFixed(2)} mm`} ok={store.nose.lengthMm <= SPEC.maxNoseLengthMm} />
              <Row label="Qanotlar soni" limit={`${SPEC.maxFins}`}
                value={`${store.fins.count}`} ok={store.fins.count <= SPEC.maxFins} />
              <Row label="Parashyut o'lchami" limit={`${SPEC.maxParachuteMm} mm`}
                value={`${store.recovery.parachuteSizeMm.toFixed(1)} mm`} ok={store.recovery.parachuteSizeMm <= SPEC.maxParachuteMm} />
              <Row label="Suv hajmi" limit={`${bottleL.toFixed(2)} L`}
                value={`${store.propulsion.waterVolumeL.toFixed(2)} L`} ok={store.propulsion.waterVolumeL <= bottleL} />
            </Table>
          </Section>

          <Section title="Byudjet">
            <Table head={["Ko'rsatkich", "Chegara", "Loyihada", ""]}>
              <Row label="Dizayn narxi" limit="—" value={`$${a.designCostUsd.toFixed(2)}`} ok />
            </Table>
          </Section>

          {a.deployStatus !== "Will Deploy" && (
            <Section title="Izoh — parashyut nega ochilmaydi">
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-900 space-y-2">
                <p>Parashyut quyidagi ikki holatning biri bo&apos;lsa ochilmaydi:</p>
                <div>
                  <b>1. Yuk trubasining ichki hajmi kichik</b> — parashyut erkin joylashmaydi.
                  Truba uzunligini oshiring yoki boshqa material tanlang (diametr materialga bog&apos;liq).
                  <div className="font-mono mt-1">
                    truba {a.tubeVolumeCm3.toFixed(1)} cm³ {a.tubeVolumeCm3 > a.deployVolumeCm3 ? ">" : "≤"}{" "}
                    kerakli {a.deployVolumeCm3.toFixed(1)} cm³
                  </div>
                </div>
                <div>
                  <b>2. Nos (shar) massasi {SPEC.minNoseMassG} g dan kam</b> — Nos bo&apos;limida loy massasini oshiring.
                  <div className="font-mono mt-1">hozir {a.noseMassG.toFixed(1)} g</div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Massa balansi">
            <Table head={["Komponent", "Massa", "Joylashuvi (nos uchidan)", ""]}>
              {a.massBreakdown.map((m) => (
                <tr key={m.label} className="border-b border-gray-100">
                  <td className="p-2 text-gray-700">{m.label}</td>
                  <td className="p-2 font-mono text-gray-800">{m.massG.toFixed(1)} g</td>
                  <td className="p-2 font-mono text-gray-500">{m.xMm.toFixed(0)} mm</td>
                  <td />
                </tr>
              ))}
              <tr className="border-b-2 border-gray-300 bg-gray-50 font-bold">
                <td className="p-2">Uchish massasi</td>
                <td className="p-2 font-mono">{a.totalMassG.toFixed(1)} g</td>
                <td className="p-2 font-mono text-gray-500">OM {a.cgMm.toFixed(0)} mm</td>
                <td />
              </tr>
            </Table>
          </Section>

          <Section title="Aerodinamika va barqarorlik">
            <Table head={["Ko'rsatkich", "Qiymat", "Izoh", ""]}>
              <Info label="Qarshilik koeffitsiyenti (Cd)" value={a.dragCoefficient.toFixed(3)} note="nos, korpus, qanot va orqa qismdan" />
              <Info label="Frontal maydon" value={`${a.frontalAreaCm2.toFixed(1)} cm²`} note={`diametr ${a.bodyDiameterMm} mm`} />
              <Info label="Og'irlik markazi (quruq)" value={`${a.cgDryMm.toFixed(0)} mm`} note="massalar yig'indisi bo'yicha" />
              <Info label="Bosim markazi" value={`${a.cpMm.toFixed(0)} mm`} note="Barrowman usuli" />
              <Info label="Statik zapas" value={`${a.staticMarginCal.toFixed(2)} kalibr`}
                note={a.stability === "STABLE" ? "barqaror" : a.stability === "MARGINAL" ? "chegarada" : "beqaror"} />
              <Info label="Umumiy uzunlik" value={`${a.bodyLengthMm.toFixed(0)} mm`} note="nos uchidan bo'g'izgacha" />
            </Table>
          </Section>

          <Section title="Uchish natijalari">
            <Table head={["Ko'rsatkich", "Qiymat", "Izoh", ""]}>
              <Info label="Cho'qqi tortish kuchi" value={`${a.peakThrustN.toFixed(0)} N`} note="F = 2·ΔP·A" />
              <Info label="Umumiy impuls" value={`${a.impulseNs.toFixed(2)} N·s`} note="tortish kuchining vaqt bo'yicha integrali" />
              <Info label="Yonish vaqti" value={`${(a.burnTimeS * 1000).toFixed(0)} ms`} note="suv va havo fazalari" />
              <Info label="Burnout tezligi" value={`${a.burnoutVelocityMs.toFixed(1)} m/s`} note={`${a.burnoutAltitudeM.toFixed(1)} m balandlikda`} />
              <Info label="Maksimal balandlik" value={`${a.maxHeightM.toFixed(1)} m`} note={`${a.ascentTimeS.toFixed(2)} s da`} />
              <Info label="Qo'nish tezligi" value={`${a.descentRateMs.toFixed(1)} m/s`}
                note={a.deployStatus === "Will Deploy" ? "parashyutda" : "parashyutsiz"} />
              <Info label="To'liq uchish vaqti" value={`${a.totalFlightTimeS.toFixed(1)} s`} note="" />
            </Table>
          </Section>

          {(a.specErrors.length > 0 || a.hints.length > 0) && (
            <Section title="Xulosa">
              {a.specErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-3">
                  <div className="text-xs font-bold text-red-700 mb-1.5">Tuzatilishi shart</div>
                  <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
                    {a.specErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              {a.hints.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-4">
                  <div className="text-xs font-bold text-amber-800 mb-1.5">Yaxshilash uchun maslahatlar</div>
                  <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
                    {a.hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-sm font-bold text-gray-700 mb-3 bg-gray-100 px-3 py-2 rounded">{title}</h2>
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-300 text-gray-500">
            {head.map((h, i) => <th key={i} className="p-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ label, limit, value, ok }: { label: string; limit: string; value: string; ok: boolean }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="p-2 text-gray-700">{label}</td>
      <td className="p-2 font-mono text-gray-500">{limit}</td>
      <td className={`p-2 font-mono font-bold ${ok ? "text-gray-800" : "text-red-600"}`}>{value}</td>
      <td className="p-2 w-8 text-center">{ok ? <span className="text-green-600">✓</span> : <span className="text-red-600">✖</span>}</td>
    </tr>
  );
}

function Info({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="p-2 text-gray-700">{label}</td>
      <td className="p-2 font-mono font-bold text-gray-800">{value}</td>
      <td className="p-2 text-gray-500" colSpan={2}>{note}</td>
    </tr>
  );
}
