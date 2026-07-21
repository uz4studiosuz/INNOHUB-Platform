"use client";

import { useState } from "react";
import { ForceDiagram } from "./ForceDiagram";
import { FormulaBlock } from "./FormulaBlock";
import { TrussVisualizer } from "./TrussVisualizer";
import { SYColorKey } from "./SYColorKey";
import { ArcLoadDiagram, TriangleLoadDiagram } from "./StructuralForms";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-extrabold text-gray-900 mb-4">{children}</h1>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-700 leading-relaxed mb-3">{children}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4 shadow-sm">{children}</div>;
}

function WorksheetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-6 mb-4">
      <div className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-3">✏️ Interaktiv mashq</div>
      {children}
    </div>
  );
}

function NumberInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600 font-semibold">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-gray-300 rounded px-2 py-1 text-sm font-mono w-32"
      />
    </label>
  );
}

function WorksheetTrussStability() {
  const [joints, setJoints] = useState(4);
  const [members, setMembers] = useState(5);
  const [reactions, setReactions] = useState(3);

  const lhs = members + reactions;
  const rhs = 2 * joints;
  const verdict =
    lhs === rhs ? "STATICALLY DETERMINATE (stable)" : lhs > rhs ? "STATICALLY INDETERMINATE (stable, ortiqcha a'zolar)" : "UNSTABLE (mexanizm)";
  const verdictColor = lhs === rhs ? "text-green-600" : lhs > rhs ? "text-amber-600" : "text-red-600";

  return (
    <WorksheetShell>
      <P>Truss barqarorligini tekshirish formulasi: <strong>m + r = 2j</strong> (m — a&apos;zolar soni, r — tayanch reaksiyalari, j — tugunlar soni).</P>
      <div className="flex flex-wrap gap-4 mb-4">
        <NumberInput label="Tugunlar soni (j)" value={joints} onChange={setJoints} />
        <NumberInput label="A'zolar soni (m)" value={members} onChange={setMembers} />
        <NumberInput label="Reaksiyalar soni (r)" value={reactions} onChange={setReactions} />
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 font-mono text-sm">
        m + r = {members} + {reactions} = {lhs} &nbsp;|&nbsp; 2j = 2 × {joints} = {rhs}
      </div>
      <div className={`mt-3 font-bold ${verdictColor}`}>{verdict}</div>
      {lhs === rhs && <P>Bu truss Method of Joints yordamida yechiladi.</P>}
    </WorksheetShell>
  );
}

function WorksheetLinearForces() {
  const [force, setForce] = useState(100);
  const [angle, setAngle] = useState(30);
  const rad = (angle * Math.PI) / 180;
  const fx = force * Math.cos(rad);
  const fy = force * Math.sin(rad);

  return (
    <WorksheetShell>
      <P>Kuch vektorini gorizontal (Fx) va vertikal (Fy) komponentlarga ajrating: <strong>Fx = F·cos(θ)</strong>, <strong>Fy = F·sin(θ)</strong>.</P>
      <div className="flex flex-wrap gap-4 mb-4">
        <NumberInput label="Kuch F (N)" value={force} onChange={setForce} />
        <NumberInput label="Burchak θ (°)" value={angle} onChange={setAngle} />
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 font-mono text-sm flex flex-col gap-1">
        <span>Fx = {force} × cos({angle}°) = {fx.toFixed(2)} N</span>
        <span>Fy = {force} × sin({angle}°) = {fy.toFixed(2)} N</span>
      </div>
    </WorksheetShell>
  );
}

function WorksheetExternalForces() {
  const [span, setSpan] = useState(10);
  const [loadPos, setLoadPos] = useState(4);
  const [force, setForce] = useState(500);

  const a = Math.min(Math.max(loadPos, 0), span);
  const r1 = (force * (span - a)) / span;
  const r2 = (force * a) / span;

  return (
    <WorksheetShell>
      <P>
        Oddiy tiralgan balka: uzunlik L, chapdan masofa a da F yuki qo&apos;yilgan. Momentlar muvozanatidan:
        <strong> R1 = F(L−a)/L</strong>, <strong>R2 = F·a/L</strong>.
      </P>
      <div className="flex flex-wrap gap-4 mb-4">
        <NumberInput label="Uzunlik L (m)" value={span} onChange={setSpan} />
        <NumberInput label="Yuk pozitsiyasi a (m)" value={loadPos} onChange={setLoadPos} />
        <NumberInput label="Yuk F (N)" value={force} onChange={setForce} />
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200 font-mono text-sm flex flex-col gap-1">
        <span>R1 = {force} × ({span} − {a}) / {span} = {r1.toFixed(2)} N</span>
        <span>R2 = {force} × {a} / {span} = {r2.toFixed(2)} N</span>
        <span className="text-gray-500">Tekshiruv: R1 + R2 = {(r1 + r2).toFixed(2)} N (= F bo&apos;lishi kerak)</span>
      </div>
    </WorksheetShell>
  );
}

export function ResearchContent({ sectionId }: { sectionId: string }) {
  switch (sectionId) {
    case "design-process":
      return (
        <div>
          <SectionHeading>The Engineering Design Process</SectionHeading>
          <Card>
            <P>
              Muhandislik dizayni — takrorlanuvchi (iterativ) jarayon. INNOHUB Structures 2.0 loyihasi davomida siz
              quyidagi sikl bo&apos;yicha ishlaysiz:
            </P>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {["Ask (So'ra)", "Imagine (Tasavvur qil)", "Plan (Rejalashtir)", "Create (Yarat)", "Test (Sinov)", "Improve (Yaxshila)"].map((step, i) => (
                <div key={step} className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
                  <div className="text-violet-600 font-bold text-xs mb-1">{i + 1}</div>
                  <div className="text-sm font-semibold text-violet-900">{step}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      );

    case "design-challenge":
      return (
        <div>
          <SectionHeading>Design Challenge</SectionHeading>
          <Card>
            <P>
              <strong>Vazifa:</strong> belgilangan sinf/guruh cheklovlari ichida (material, o&apos;lcham, og&apos;irlik) eng katta
              yukni ko&apos;tara oladigan truss ko&apos;prik loyihalang.
            </P>
            <P>
              Bu — optimizatsiya masalasi: maksimal load-bearing capacity ni minimal material sarfi bilan ta&apos;minlash.
              Har bir qo&apos;shimcha a&apos;zo mustahkamlikni oshiradi, lekin og&apos;irlik va narxni ham oshiradi.
            </P>
          </Card>
        </div>
      );

    case "background":
      return (
        <div>
          <SectionHeading>Background</SectionHeading>
          <Card>
            <P>
              Ko&apos;priklar — inson qurgan eng qadimiy va muhim strukturalardan biri. Truss (panjarali) ko&apos;priklar
              XIX asrdan buyon temir yo&apos;l va avtomobil ko&apos;priklarida keng qo&apos;llanilgan, chunki ular kam material
              bilan katta masofalarni yopa oladi.
            </P>
            <P>
              Ushbu modulda siz haqiqiy muhandislar ishlatadigan tahlil usullari — Method of Joints, kuchlanish (stress)
              va oquvchanlik chegarasi (yield strength) tushunchalari orqali truss dizaynini o&apos;rganasiz.
            </P>
          </Card>
        </div>
      );

    case "truss-systems":
      return (
        <div>
          <SectionHeading>Truss Systems</SectionHeading>
          <Card>
            <P>
              Truss dizaynidagi eng muhim jihat — materiallar unga ta&apos;sir qiluvchi kuchlarni ko&apos;tara olishini
              ta&apos;minlash. Har bir truss a&apos;zosiga qancha kuch ta&apos;sir qilishini bilish shart; agar ichki kuch
              juda katta bo&apos;lsa, a&apos;zo sinadi yoki buziladi.
            </P>
            <h2 className="font-bold text-gray-800 mt-4 mb-1">Types of Forces</h2>
            <P>
              A&apos;zoning mustahkamligini bilish uchun ichki kuchlarning qanday aniqlanishini va bu trussning umumiy
              dizayniga qanday ta&apos;sir qilishini tushunish kerak. Truss a&apos;zolari to&apos;rt xil kuchga duch kelishi
              mumkin: tension, compression, shear va torsion.
            </P>
            <ForceDiagram />
          </Card>
          <Card>
            <h2 className="font-bold text-gray-800 mb-2">Structural Forms</h2>
            <P>
              Yuqoridagi jadvaldan ko&apos;rinib turibdiki, yog&apos;och shear kuchida nisbatan zaif. Balsa uchun maksimal
              shear yuki 300 psi, compression&apos;da 2,160 psi, tension&apos;da esa 3,133 psi ni tashkil qiladi. Strukturaviy
              shakllar materialning kuchli tomonidan foydalanish uchun ishlatiladi. Masalan, arch (kamar) yukni
              a&apos;zolar bo&apos;ylab taqsimlaydi — arch&apos;dagi har bir a&apos;zo compression ostida bo&apos;ladi.
              Compression&apos;da kuchli materiallar shu turdagi strukturalar uchun afzallik hisoblanadi — bunga eng yaxshi
              misol o&apos;rta asrlarning keystone arch&apos;i.
            </P>
            <div className="flex flex-wrap justify-center gap-8 my-4">
              <ArcLoadDiagram />
            </div>
            <P>
              Eng foydali strukturaviy shakllardan biri — uchburchak (triangle). Uchburchakka yuk qo&apos;yilganda,
              yuqori a&apos;zolar compression, pastki a&apos;zo esa tension ostida bo&apos;ladi.
            </P>
            <div className="flex flex-wrap justify-center gap-8 my-4">
              <TriangleLoadDiagram />
            </div>
            <P>
              Keyingi bo&apos;limlarda siz trusslardagi kuchlarni hisoblaysiz. Truss aynan uchburchak strukturaviy
              shaklidan foydalanadi. Trusslar minoralar, ko&apos;priklar, pollar, tomlar, bumlar, kranlarda — ro&apos;yxat
              davom etadi.
            </P>
          </Card>
          <Card>
            <h2 className="font-bold text-gray-800 mb-2">Truss Stability</h2>
            <P>
              Trussimizni tahlil qilish uchun ishlatiladigan usul — <strong>Method of Joints</strong> deb ataladi.
              Method of Joints har bir tugunni alohida ko&apos;rib, har bir a&apos;zodagi ichki kuchni aniqlashni anglatadi.
              Biroq, Method of Joints&apos;dan foydalanishdan oldin, truss <strong>statically determinate</strong> ekanini
              aniqlashimiz kerak. Agar truss statically determinate (barqaror) bo&apos;lsa, bu trussda tugunlar va
              a&apos;zolarning to&apos;g&apos;ri kombinatsiyasi borligini bildiradi. Agar trussda a&apos;zolar juda ko&apos;p bo&apos;lsa,
              u <strong>statically indeterminate</strong> hisoblanadi — bu barqaror, lekin Method of Joints ishlatib
              bo&apos;lmaydi degani. Agar trussda tugunlar juda ko&apos;p bo&apos;lsa, u <strong>unstable</strong> hisoblanadi,
              ya&apos;ni loyiha talablariga mos ravishda yukni ko&apos;tara olmaydi. Method of Joints faqat truss statically
              determinate bo&apos;lgandagina ishlaydi.
            </P>
          </Card>
        </div>
      );

    case "worksheet-truss-stability":
      return (
        <div>
          <SectionHeading>Worksheet: Truss Stability</SectionHeading>
          <Card>
            <P>
              Method of Joints ishlatishdan oldin truss <strong>statically determinate</strong> ekanini tekshirish kerak.
              Agar a&apos;zolar juda ko&apos;p bo&apos;lsa — statically indeterminate (Method of Joints ishlamaydi). Agar
              tugunlar juda ko&apos;p bo&apos;lsa (nisbatan a&apos;zolarga) — unstable.
            </P>
          </Card>
          <WorksheetTrussStability />
        </div>
      );

    case "forces-on-truss":
      return (
        <div>
          <SectionHeading>Forces on a Truss</SectionHeading>
          <Card>
            <P>
              Har bir truss a&apos;zosi faqat ikki turdagi aksial kuchni boshdan kechiradi: <strong className="text-blue-600">tension</strong> (cho&apos;zilish)
              yoki <strong className="text-red-600">compression</strong> (siqilish). Tashqi yuklar va tayanch reaksiyalari
              a&apos;zolar ichida shear va torsion kuchlarni ham keltirib chiqarishi mumkin, lekin ideal pin-jointed truss
              modelida a&apos;zolar faqat aksial (tension/compression) kuch ko&apos;tarradi deb faraz qilinadi.
            </P>
            <ForceDiagram />
          </Card>
        </div>
      );

    case "worksheet-linear-forces":
      return (
        <div>
          <SectionHeading>Worksheet: Linear Forces</SectionHeading>
          <Card>
            <P>Har qanday burchak ostidagi kuchni gorizontal va vertikal komponentlarga ajratish mumkin — bu Method of Joints&apos;ning asosi.</P>
          </Card>
          <WorksheetLinearForces />
        </div>
      );

    case "external-forces":
      return (
        <div>
          <SectionHeading>External Forces</SectionHeading>
          <Card>
            <P>
              Tashqi kuchlar — trussga tashqaridan ta&apos;sir qiluvchi yuklar (masalan, ustidan o&apos;tayotgan avtomobil
              og&apos;irligi) va tayanchlardan (pin, roller) kelib chiqadigan reaksiya kuchlari.
            </P>
            <P>
              Reaksiyalarni topish uchun butun truss <em>qattiq jism</em> sifatida qaraladi va Nyutonning muvozanat
              tenglamalari (ΣFx=0, ΣFy=0, ΣM=0) qo&apos;llaniladi.
            </P>
          </Card>
        </div>
      );

    case "worksheet-external-forces":
      return (
        <div>
          <SectionHeading>Worksheet: External Forces</SectionHeading>
          <Card>
            <P>Oddiy tiralgan balka misolida tayanch reaksiyalarini hisoblang (momentlar muvozanati usuli).</P>
          </Card>
          <WorksheetExternalForces />
        </div>
      );

    case "internal-forces":
      return (
        <div>
          <SectionHeading>Internal Forces</SectionHeading>
          <Card>
            <P>
              Tashqi kuchlar va reaksiyalar ma&apos;lum bo&apos;lgach, har bir a&apos;zo ichidagi kuch <strong>Method of Joints</strong> orqali
              topiladi: har bir tugunda ΣFx=0 va ΣFy=0 tenglamalari yechiladi, tugundan tugunga o&apos;tiladi.
            </P>
            <P>
              Ichki kuch — a&apos;zoning qancha yukni ko&apos;tarayotganini bildiradi. Keyingi bo&apos;limda bu kuchni a&apos;zo
              materialining chidamliligi (yield strength) bilan solishtiramiz.
            </P>
          </Card>
        </div>
      );

    case "stress-yield":
      return (
        <div>
          <SectionHeading>Stress and Yield Strength</SectionHeading>
          <Card>
            <P>Ichki kuch ma&apos;lum bo&apos;lgach, a&apos;zo kesimidagi kuchlanish (stress) hisoblanadi:</P>
            <FormulaBlock formula="Stress = Force / Area" />
            <P>Misol:</P>
            <FormulaBlock
              title="Misol hisob"
              formula={"A = 0.00001 m²\nForce = 73.72 N\nStress = 73.72 / 0.00001 = 7,372,000 Pa"}
            />
            <P>
              Balsa yog&apos;ochining compression&apos;dagi yield strength&apos;i ~14,893 kPa (14,893,000 Pa). Stress &lt; Yield
              bo&apos;lgani uchun bu a&apos;zo sinmaydi.
            </P>
            <FormulaBlock
              title="Xavfsizlik nisbati"
              formula="S/Y = Stress / Yield Strength"
              note="Agar S/Y > 1.0 bo'lsa — a'zo sinadi."
            />
          </Card>
          <Card>
            <P>
              Quyidagi rasm murakkabroq va realroq trussni tasvirlaydi. Bu truss haqida strelkalarning yo&apos;nalishi
              va rangiga qarab ko&apos;p narsani bilib olishimiz mumkin.
            </P>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
              <TrussVisualizer />
              <div className="lg:pt-2">
                <SYColorKey />
              </div>
            </div>
            <P>
              Compression ostidagi a&apos;zolar rangi orange dan red ga qarab o&apos;zgaradi. Tension ostidagi a&apos;zolar
              rangi esa yellow dan blue ga qarab o&apos;zgaradi. Bright red (kalitning yuqori qismi) yoki dark blue
              (kalitning pastki qismi) rangdagi a&apos;zo — sinish ehtimoli eng yuqori nuqtani bildiradi. Yuqoridagi
              trussda <strong>m9</strong> a&apos;zosi (S/Y = 1.35) compression ostida sinish nuqtasidan o&apos;tib ketgan —
              bu a&apos;zoni mustahkamlash yoki qayta loyihalash kerak.
            </P>
          </Card>
          <Card>
            <h2 className="font-bold text-gray-800 mb-2">Iteratsiyada qo&apos;llash (Design loop)</h2>
            <P>
              Bright red yoki dark blue rangdagi a&apos;zolarni aniqlab, trussni qayta loyihalang: qo&apos;shimcha
              uchburchaklar qo&apos;shing yoki kuchlarni qayta taqsimlang. Jismoniy sinovdan oldin yukning xavfsiz
              ko&apos;tarilishini ta&apos;minlang.
            </P>
            <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold">
              {["Design", "Build", "Test", "Analyze", "Refine", "Repeat"].map((step) => (
                <span key={step} className="bg-gray-100 border border-gray-300 rounded-full px-3 py-1 text-gray-700">
                  {step}
                </span>
              ))}
            </div>
          </Card>
        </div>
      );

    default:
      return (
        <div>
          <SectionHeading>Bo&apos;lim topilmadi</SectionHeading>
          <P>Chap tomondagi ro&apos;yxatdan bo&apos;limni tanlang.</P>
        </div>
      );
  }
}
