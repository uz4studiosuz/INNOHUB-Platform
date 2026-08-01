"use client";

import React from "react";
import Link from "next/link";
import { useRocketStore } from "../../../../store/rocketStore";
import { SPEC } from "../../../../lib/physics/rocketPhysics";

/**
 * The briefing the design pages assume you have read: how the thrust is made,
 * what static margin is, and which numbers the competition actually judges.
 * Every formula here is the one the simulation runs, so the reading and the
 * results agree.
 */
export default function ResearchPage() {
  const { analysis, propulsion, fins, nose, recovery } = useRocketStore();

  return (
    <div className="absolute inset-0 bg-[#f4f6f8] overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tadqiqot</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Suv raketasi qanday uchadi va simulyatsiya nimani hisoblaydi
          </p>
        </div>

        <Card title="1. Tortish kuchi qayerdan keladi">
          <p>
            Butilkaga suv quyib, ustidan havo pompalaymiz. Havo siqiladi — bu siqilgan gazda saqlangan energiya.
            Klapan ochilganda havo suvni bo&apos;g&apos;izdan tashqariga haydaydi va suvning orqaga otilishi
            raketani oldinga suradi.
          </p>
          <Formula
            title="Chiqish tezligi (Bernulli)"
            body="vₑ = √(2·ΔP / ρₛᵤᵥ)"
            note="ΔP — butilka ichidagi va tashqi bosim farqi, ρₛᵤᵥ = 1000 kg/m³"
          />
          <Formula
            title="Tortish kuchi"
            body="F = ṁ·vₑ = 2·ΔP·A"
            note="A — bo'g'iz kesimi (21.6 mm). Shuning uchun kuch bosimga to'g'ri proporsional."
          />
          <p>
            Havo <b>adiabatik</b> kengayadi: suv chiqib borgan sari havo joyi ortadi va bosim tez pasayadi
            (P·V<sup>1.4</sup> = const). Natijada tortish kuchi <b>bir necha o&apos;n millisekundda</b> nolga tushadi —
            grafiklarda buni ko&apos;rish mumkin.
          </p>
          <Callout>
            Sizning dizayningizda: cho&apos;qqi kuch <b>{analysis.peakThrustN.toFixed(0)} N</b>,
            yonish vaqti <b>{(analysis.burnTimeS * 1000).toFixed(0)} ms</b>,
            impuls <b>{analysis.impulseNs.toFixed(2)} N·s</b>.
          </Callout>
        </Card>

        <Card title="2. Nega suvni to'liq quyish mumkin emas">
          <p>
            Suv — bu <b>reaktiv massa</b>, havo — <b>energiya manbai</b>. Ikkisi ham kerak:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Suv kam</b> — massa yetarli emas, impuls kichik bo&apos;ladi</li>
            <li><b>Suv ko&apos;p</b> — havoga siqilish uchun joy qolmaydi, energiya kam</li>
            <li><b>Optimum</b> — butilka hajmining taxminan <b>25–35%</b></li>
          </ul>
          <p>
            Bundan tashqari suv raketani og&apos;irlashtiradi: 0.2 L suv 200 g, bu bo&apos;sh raketadan ikki baravar
            ko&apos;p. Shuning uchun balandlik egri chizig&apos;i bitta cho&apos;qqiga ega.
          </p>
        </Card>

        <Card title="3. Barqarorlik — eng muhim tushuncha">
          <p>
            Raketada ikkita muhim nuqta bor:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b className="text-blue-600">OM — og&apos;irlik markazi</b>: raketa shu nuqta atrofida aylanadi
            </li>
            <li>
              <b className="text-red-600">BM — bosim markazi</b>: aerodinamik kuchlar shu nuqtaga ta&apos;sir qiladi
            </li>
          </ul>
          <p>
            Agar <b>BM og&apos;irlik markazidan orqada</b> bo&apos;lsa, har qanday burilishda havo raketani orqasidan
            turtib to&apos;g&apos;rilaydi — raketa <b>barqaror</b>. Agar BM oldinda bo&apos;lsa, burilish kuchayib
            boradi va raketa aylanib ketadi.
          </p>
          <Formula
            title="Statik zapas"
            body="Zapas = (BM − OM) / D"
            note="D — korpus diametri. Natija «kalibr»da o'lchanadi; 1.0 dan yuqori bo'lsa ishonchli."
          />
          <p>
            BM ni <b>Barrowman usuli</b> bilan hisoblaymiz — nos konusi, o&apos;tish konusi va qanotlarning
            har biri o&apos;z hissasini qo&apos;shadi. Shuning uchun qanot o&apos;lchamini o&apos;zgartirsangiz
            barqarorlik ham o&apos;zgaradi.
          </p>
          <Callout>
            Sizning dizayningizda: OM <b>{analysis.cgDryMm.toFixed(0)} mm</b>,
            BM <b>{analysis.cpMm.toFixed(0)} mm</b>,
            zapas <b>{analysis.staticMarginCal.toFixed(2)} kalibr</b> →{" "}
            <b className={
              analysis.stability === "STABLE" ? "text-green-600"
                : analysis.stability === "MARGINAL" ? "text-amber-600" : "text-red-600"
            }>
              {analysis.stability === "STABLE" ? "barqaror" : analysis.stability === "MARGINAL" ? "chegarada" : "beqaror"}
            </b>
          </Callout>
          <p className="text-xs text-gray-500">
            Diqqat: ko&apos;tarilish paytida suv orqada turadi va OM orqaga siljiydi
            (hozir <b>{analysis.cgMm.toFixed(0)} mm</b>, zapas <b>{analysis.staticMarginWetCal.toFixed(2)}</b> kalibr).
            Shu bir lahzada raketani uchirish trubasi to&apos;g&apos;ri tutib turadi, shuning uchun barqarorlik
            suv tugagandan keyingi holat bo&apos;yicha baholanadi.
          </p>
        </Card>

        <Card title="4. Qarshilik">
          <Formula title="Qarshilik kuchi" body="D = ½·ρ·v²·Cd·A" note="ρ — havo zichligi, balandlik bilan kamayadi" />
          <p>Cd koeffitsiyenti quyidagilardan yig&apos;iladi:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Nos konusi</b> — qanchalik cho&apos;ziq bo&apos;lsa, shuncha kam qarshilik</li>
            <li><b>Korpus yuzasi</b> — ishqalanish, uzunlikka proporsional</li>
            <li><b>Qanotlar</b> — yuzasi va, ayniqsa, <b>qalinligi</b> hisobiga</li>
            <li><b>Orqa qism</b> — bo&apos;g&apos;iz ortidagi bo&apos;shliq</li>
          </ul>
          <Callout>
            Sizning dizayningizda Cd = <b>{analysis.dragCoefficient.toFixed(3)}</b>.
            Qarshilik bo&apos;lmaganda raketa{" "}
            <b>{(analysis.burnoutAltitudeM + Math.pow(analysis.burnoutVelocityMs, 2) / (2 * 9.807)).toFixed(1)} m</b> ga
            chiqardi, haqiqatda esa <b>{analysis.maxHeightM.toFixed(1)} m</b>.
          </Callout>
        </Card>

        <Card title="5. Musobaqa qoidalari">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-300 text-gray-600">
                <th className="p-2 text-left">Ko&apos;rsatkich</th>
                <th className="p-2 text-left">Chegara</th>
                <th className="p-2 text-left">Sizda</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <Rule label="Havo bosimi" limit={`≤ ${SPEC.maxPressurePsi} psi`} value={`${propulsion.pressurePsi} psi`} ok={propulsion.pressurePsi <= SPEC.maxPressurePsi} />
              <Rule label="Nos uzunligi" limit={`≤ ${SPEC.maxNoseLengthMm} mm`} value={`${nose.lengthMm} mm`} ok={nose.lengthMm <= SPEC.maxNoseLengthMm} />
              <Rule label="Qanotlar soni" limit={`≤ ${SPEC.maxFins}`} value={`${fins.count}`} ok={fins.count <= SPEC.maxFins} />
              <Rule label="Parashyut o'lchami" limit={`≤ ${SPEC.maxParachuteMm} mm`} value={`${recovery.parachuteSizeMm} mm`} ok={recovery.parachuteSizeMm <= SPEC.maxParachuteMm} />
              <Rule label="Nos massasi (parashyut uchun)" limit={`≥ ${SPEC.minNoseMassG} g`} value={`${analysis.noseMassG.toFixed(1)} g`} ok={analysis.noseMassG >= SPEC.minNoseMassG} />
              <Rule label="Dizayn narxi" limit="chegarasiz" value={`$${analysis.designCostUsd.toFixed(2)}`} ok />
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3">
            Talabga javob bermagan dizayn musobaqada diskvalifikatsiya qilinadi. Keyin g&apos;olib
            eng katta balandlik bo&apos;yicha aniqlanadi, lekin parashyuti ochilmagan raketa birinchi
            o&apos;rinni olmaydi.
          </p>
        </Card>

        <div className="flex gap-3 pb-4">
          <Link href="/modules/rockets" className="px-5 py-2.5 bg-orange-500 text-white rounded font-bold text-sm hover:bg-orange-600">
            Loyihalashga o&apos;tish →
          </Link>
          <Link href="/modules/rockets/build-test" className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded font-bold text-sm hover:bg-gray-50">
            Grafiklarni ko&apos;rish
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-800 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function Formula({ title, body, note }: { title: string; body: string; note: string }) {
  return (
    <div className="bg-gray-50 border-l-4 border-gray-800 rounded-r px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</div>
      <div className="font-mono text-base text-gray-900 my-1">{body}</div>
      <div className="text-[11px] text-gray-500">{note}</div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2.5 text-xs text-blue-900">
      {children}
    </div>
  );
}

function Rule({ label, limit, value, ok }: { label: string; limit: string; value: string; ok: boolean }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="p-2 font-sans text-gray-700">{label}</td>
      <td className="p-2 text-gray-500">{limit}</td>
      <td className={`p-2 font-bold ${ok ? "text-green-600" : "text-red-600"}`}>{value}</td>
    </tr>
  );
}
