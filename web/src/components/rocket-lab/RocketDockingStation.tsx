"use client";

import React from "react";
import { useRocketStore } from "../../store/rocketStore";
import {
  BOTTLE_INFO, SPEC, TUBE_STOCK, FIN_STOCK, FIN_COLORS, finGeometry,
} from "../../lib/physics/rocketPhysics";
import { IconBulb, IconTool } from "@tabler/icons-react";

function SliderField({ label, value, onChange, unit, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  unit: string; min: number; max: number; step: number;
}) {
  return (
    <div className="dock-slider">
      <div className="dock-slider-head">
        <span className="dock-field-label">{label}</span>
        <span className="dock-slider-value">{Number(value.toFixed(3))} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="dock-field-row">
      <span className="dock-field-label">{label}</span>
      <select className="dock-field-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="dock-info-row">
      <span className="dock-info-label">{label}</span>
      <span className="dock-info-value">{value}</span>
    </div>
  );
}

const OK = { color: "#15803d", fontWeight: 700 } as const;
const BAD = { color: "#b91c1c", fontWeight: 700 } as const;
const WARN = { color: "#b45309", fontWeight: 700 } as const;

/** A small horizontal picture of where CG and CP sit along the airframe. */
function StabilityBar({ lengthMm, cgMm, cpMm }: { lengthMm: number; cgMm: number; cpMm: number }) {
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / lengthMm) * 100))}%`;
  return (
    <div className="dock-stab">
      <div className="dock-stab-body" />
      <div className="dock-stab-mark" style={{ left: pct(cgMm), background: "#2563eb" }} title={`CG ${cgMm.toFixed(0)} mm`} />
      <div className="dock-stab-mark" style={{ left: pct(cpMm), background: "#dc2626" }} title={`CP ${cpMm.toFixed(0)} mm`} />
      <div className="dock-stab-legend">
        <span><i style={{ background: "#2563eb" }} /> CG {cgMm.toFixed(0)}</span>
        <span><i style={{ background: "#dc2626" }} /> CP {cpMm.toFixed(0)}</span>
        <span className="dock-stab-nose">nos →</span>
      </div>
    </div>
  );
}

export function RocketDockingStation() {
  const store = useRocketStore();
  const a = store.analysis;

  if (!store.dockOpen) {
    return (
      <button className="dock-collapsed" onClick={() => store.setDockOpen(true)} title="Sozlash panelini ochish">
        ‹ SOZLASH
      </button>
    );
  }

  const bottleL = BOTTLE_INFO[store.propulsion.bottleSize].volumeCm3 / 1000;
  // Fin figures for the Information block, from the same stock table the
  // physics bills the mass and cost against.
  const fg = finGeometry(store.fins);
  const finStock = FIN_STOCK[store.fins.material] ?? FIN_STOCK["70pt Card Stock"];
  const finMass = (fg.areaMm2 / 100) * finStock.gPerCm2 * store.fins.count;
  const finCost = store.fins.count * ((fg.areaMm2 / 100) * finStock.costPerCm2 + 0.15);

  const renderContent = () => {
    switch (store.activePanel) {
      case "propulsion":
        return (
          <>
            <div className="dock-component-name">Dvigatel (suv + havo)</div>
            <div className="dock-category">Boshlang&apos;ich shartlar</div>
            <SliderField label="Bosim" value={store.propulsion.pressurePsi} unit="PSI"
              min={0} max={SPEC.maxPressurePsi} step={1}
              onChange={(v) => store.updatePropulsion({ pressurePsi: v })} />
            <SliderField label="Suv hajmi" value={store.propulsion.waterVolumeL} unit="L" min={0} max={bottleL} step={0.01}
              onChange={(v) => store.updatePropulsion({ waterVolumeL: v })} />
            <InfoRow label="To'ldirilgan" value={`${((store.propulsion.waterVolumeL / bottleL) * 100).toFixed(0)}%`} />

            <div className="dock-category">Butilka</div>
            <SelectField label="O'lchami" value={store.propulsion.bottleSize}
              onChange={(v) => store.updatePropulsion({ bottleSize: v as typeof store.propulsion.bottleSize })}
              options={[
                { value: "20oz_coke", label: "20 oz (591 ml)" },
                { value: "1L", label: "1 litr" },
                { value: "2L_coke", label: "2 litr Coke" },
                { value: "2L_pepsi", label: "2 litr Pepsi" },
              ]} />
            <InfoRow label="Diametr" value={`${a.bodyDiameterMm} mm`} />
            <InfoRow label="Hajmi" value={`${bottleL.toFixed(3)} L`} />

            <div className="dock-category">Natija</div>
            <InfoRow label="Cho'qqi tortish kuchi" value={`${a.peakThrustN.toFixed(0)} N`} />
            <InfoRow label="Umumiy impuls" value={`${a.impulseNs.toFixed(2)} N·s`} />
            <InfoRow label="Yonish vaqti" value={`${(a.burnTimeS * 1000).toFixed(0)} ms`} />
            <InfoRow label="Burnout tezligi" value={`${a.burnoutVelocityMs.toFixed(1)} m/s`} />
          </>
        );

      case "recovery":
        return (
          <>
            <div className="dock-component-name">Qutqaruv tizimi</div>
            <SelectField label="Turi" value={store.recovery.system}
              onChange={(v) => store.updateRecovery({ system: v as typeof store.recovery.system })}
              options={[
                { value: "parachute", label: "Parashyut" },
                { value: "backslider", label: "Backslider" },
              ]} />
            {store.recovery.system === "parachute" && (
              <SliderField label="Parashyut diametri" value={store.recovery.parachuteSizeMm} unit="mm"
                min={0} max={SPEC.maxParachuteMm} step={1}
                onChange={(v) => store.updateRecovery({ parachuteSizeMm: v })} />
            )}

            {/* The two volumes the deploy rule compares, shown side by side the
                way the original Recovery work area does. */}
            <div className="dock-category">Joylashuv tekshiruvi</div>
            <InfoRow label="Truba hajmi" value={
              <span style={a.tubeVolumeCm3 > a.deployVolumeCm3 ? OK : BAD}>{a.tubeVolumeCm3.toFixed(1)} cm³</span>
            } />
            <InfoRow label="Kerakli hajm" value={`${a.deployVolumeCm3.toFixed(1)} cm³`} />
            <InfoRow label="Nos massasi" value={
              <span style={a.noseMassG >= SPEC.minNoseMassG ? OK : BAD}>
                {a.noseMassG.toFixed(1)} g / {SPEC.minNoseMassG} g
              </span>
            } />

            <div className="dock-category">Natija</div>
            <InfoRow label="Ochilish holati" value={
              <span style={a.deployStatus === "Will Deploy" ? OK : BAD}>
                {a.deployStatus === "Will Deploy" ? "Ochiladi" : "Ochilmaydi"}
              </span>
            } />
            <InfoRow label="Qo'nish tezligi" value={
              <span style={a.descentRateMs <= 6 ? OK : a.descentRateMs <= 10 ? WARN : BAD}>
                {a.descentRateMs.toFixed(1)} m/s
              </span>
            } />
            <InfoRow label="Tushish vaqti" value={`${a.descentTimeS.toFixed(1)} s`} />
          </>
        );

      case "nose":
        return (
          <>
            <div className="dock-component-name">Nos konusi</div>
            <div className="dock-category">Geometriya</div>
            <SliderField label="Uzunligi" value={store.nose.lengthMm} unit="mm"
              min={20} max={SPEC.maxNoseLengthMm} step={1}
              onChange={(v) => store.updateNose({ lengthMm: v })} />
            {/* Only two ball sizes are stocked, so this is a choice, not a field. */}
            <div className="dock-field-row">
              <span className="dock-field-label">Shar o&apos;lchami</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[38, 40].map((mm) => (
                  <button key={mm} onClick={() => store.updateNose({ ballSizeMm: mm })}
                    className={store.nose.ballSizeMm === mm ? "dock-chip dock-chip-on" : "dock-chip"}>
                    {mm}MM
                  </button>
                ))}
              </div>
            </div>

            <div className="dock-category">Balast</div>
            <SliderField label="Loy massasi" value={store.nose.clayMassG} unit="g" min={0} max={80} step={1}
              onChange={(v) => store.updateNose({ clayMassG: v })} />
            <InfoRow label="Nos massasi (shar + loy)" value={
              <span style={a.noseMassG >= SPEC.minNoseMassG ? OK : BAD}>
                {a.noseMassG.toFixed(1)} g / {SPEC.minNoseMassG} g
              </span>
            } />

            <div className="dock-category">Natija</div>
            <InfoRow label="Cho'zinqlik (L/D)" value={(store.nose.lengthMm / Math.max(1, TUBE_STOCK[store.coneTube.material]?.diameterMm ?? 42)).toFixed(2)} />
            <InfoRow label="Statik zapas" value={
              <span style={a.stability === "STABLE" ? OK : a.stability === "MARGINAL" ? WARN : BAD}>
                {a.staticMarginCal.toFixed(2)} kalibr
              </span>
            } />
          </>
        );

      case "conetube":
        return (
          <>
            <div className="dock-component-name">Yuk trubasi</div>
            <SliderField label="Uzunligi" value={store.coneTube.lengthMm} unit="mm" min={0} max={300} step={5}
              onChange={(v) => store.updateConeTube({ lengthMm: v })} />
            {/* Diameter is not typed in - it comes with the stock you pick. */}
            <SelectField label="Material" value={store.coneTube.material}
              onChange={(v) => store.updateConeTube({ material: v })}
              options={Object.entries(TUBE_STOCK).map(([code, t]) => ({
                value: code, label: `${code} (Ø${t.diameterMm} mm)`,
              }))} />
            <InfoRow label="Diametri" value={`${TUBE_STOCK[store.coneTube.material]?.diameterMm ?? "—"} mm`} />
            <InfoRow label="Qism raqami" value={TUBE_STOCK[store.coneTube.material]?.partNo ?? "—"} />

            <div className="dock-category">Parashyut joyi</div>
            <InfoRow label="Truba hajmi" value={
              <span style={a.tubeVolumeCm3 > a.deployVolumeCm3 ? OK : BAD}>{a.tubeVolumeCm3.toFixed(1)} cm³</span>
            } />
            <InfoRow label="Kerakli hajm" value={`${a.deployVolumeCm3.toFixed(1)} cm³`} />
            <InfoRow label="Sig'adimi" value={
              <span style={a.tubeVolumeCm3 > a.deployVolumeCm3 ? OK : BAD}>
                {a.tubeVolumeCm3 > a.deployVolumeCm3 ? "Ha" : "Yo'q — uzaytiring"}
              </span>
            } />
          </>
        );

      case "conetransition":
        return (
          <>
            <div className="dock-component-name">O&apos;tish konusi</div>
            <SliderField label="Uzunligi" value={store.coneTransition.transitionLengthMm} unit="mm" min={0} max={250} step={5}
              onChange={(v) => store.updateConeTransition({ transitionLengthMm: v })} />
            <div className="dock-category">Natija</div>
            <InfoRow label="Truba → butilka" value={`${store.coneTube.diameterMm ?? 60} → ${a.bodyDiameterMm} mm`} />
            <InfoRow label="Umumiy uzunlik" value={`${a.bodyLengthMm.toFixed(0)} mm`} />
            <InfoRow label="Bosim markazi (CP)" value={`${a.cpMm.toFixed(0)} mm`} />
          </>
        );

      case "fins":
        return (
          <>
            <div className="dock-component-name">Qanotlar</div>
            {/* 6 is selectable and puts you out of spec, exactly as in the
                original - the limit is a rule, not a locked control. */}
            <div className="dock-field-row">
              <span className="dock-field-label">Soni</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => store.updateFins({ count: n })}
                    className={store.fins.count === n ? "dock-chip dock-chip-on" : "dock-chip"}
                    style={n > SPEC.maxFins && store.fins.count === n ? { background: "#b91c1c", borderColor: "#b91c1c" } : undefined}
                    title={n > SPEC.maxFins ? `${SPEC.maxFins} tadan ortiq — talabdan chiqadi` : undefined}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {/* Template first, then the outline itself: nuqtalarni sudrab
                shaklni chizasiz, qiymatlarni alohida kiritmasdan. */}
            <div className="dock-field-row">
              <span className="dock-field-label">Shablon</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[4, 5].map((n) => (
                  <button key={n} onClick={() => store.setFinTemplate(n)}
                    className={store.fins.shapePoints === n ? "dock-chip dock-chip-on" : "dock-chip"}>
                    {n} NUQTA
                  </button>
                ))}
              </div>
            </div>
            <div className="dock-field-row">
              <span className="dock-field-label">Qirralar</span>
              <div style={{ display: "flex", gap: 4 }}>
                {([["lines", "TO'G'RI"], ["curves", "EGRI"]] as const).map(([m, label]) => (
                  <button key={m} onClick={() => store.setFinEdgeMode(m)}
                    className={store.fins.edgeMode === m ? "dock-chip dock-chip-on" : "dock-chip"}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* The outline itself is edited on the model, over in the viewport. */}
            <div className="dock-note">
              Qanot shakli <b>raketa ustidagi chizmada</b> tahrirlanadi — nuqtalarni sudrang.
              Qizil to&apos;rtburchak uchirish qurilmasi joyi, unga tegmasin.
            </div>
            <div className="dock-info-row">
              <span className="dock-info-label">span / ildiz / uch / siljish</span>
              <span className="dock-info-value">
                {fg.spanMm.toFixed(0)} / {fg.rootChordMm.toFixed(0)} / {fg.tipChordMm.toFixed(0)} / {fg.sweepMm.toFixed(0)} mm
              </span>
            </div>

            <div className="dock-category">Material</div>
            <SelectField label="Material" value={store.fins.material}
              onChange={(v) => store.updateFins({ material: v, thicknessMm: FIN_STOCK[v]?.thicknessMm ?? store.fins.thicknessMm })}
              options={Object.keys(FIN_STOCK).map((k) => ({ value: k, label: k }))} />
            <SelectField label="Rang" value={store.fins.color}
              onChange={(v) => store.updateFins({ color: v })}
              options={FIN_COLORS.map((c) => ({ value: c, label: c }))} />
            <InfoRow label="Qalinligi" value={`${store.fins.thicknessMm} mm`} />

            <div className="dock-category">Ma&apos;lumot</div>
            <InfoRow label="Massa (jami)" value={`${finMass.toFixed(2)} g`} />
            <InfoRow label="Yuzasi (bir qanot)" value={`${(fg.areaMm2 / 100).toFixed(2)} cm²`} />
            <InfoRow label="Qism raqami" value={FIN_STOCK[store.fins.material]?.partNo ?? "—"} />
            <InfoRow label="Narxi" value={`${finCost.toFixed(2)} $`} />

            <div className="dock-category">Natija</div>
            <InfoRow label="Statik zapas" value={
              <span style={a.stability === "STABLE" ? OK : a.stability === "MARGINAL" ? WARN : BAD}>
                {a.staticMarginCal.toFixed(2)} kalibr
              </span>
            } />
            <InfoRow label="Qarshilik (Cd)" value={a.dragCoefficient.toFixed(3)} />
            <InfoRow label="Uchirish zonasi" value={
              <span style={fg.hitsLauncher ? BAD : OK}>{fg.hitsLauncher ? "Tegadi" : "Toza"}</span>
            } />
          </>
        );

      // ---- analysis panels: each one now shows its own subject ----
      case "weight":
        return (
          <>
            <div className="dock-component-name">Massa tahlili</div>
            <div className="dock-category">Taqsimot (nos uchidan)</div>
            {a.massBreakdown.map((m) => (
              <InfoRow key={m.label} label={m.label} value={`${m.massG.toFixed(1)} g @ ${m.xMm.toFixed(0)} mm`} />
            ))}
            <div className="dock-category">Jami</div>
            <InfoRow label="Bo'sh massa" value={`${a.emptyMassG.toFixed(1)} g`} />
            <InfoRow label="Suv" value={`${a.waterMassG.toFixed(1)} g`} />
            <InfoRow label="Uchish massasi" value={<b>{a.totalMassG.toFixed(1)} g</b>} />
            <InfoRow label="OM (quruq)" value={`${a.cgDryMm.toFixed(0)} mm`} />
            <InfoRow label="OM (suv bilan)" value={`${a.cgMm.toFixed(0)} mm`} />
          </>
        );

      case "thrust":
        return (
          <>
            <div className="dock-component-name">Tortish kuchi tahlili</div>
            <div className="dock-category">Suv fazasi</div>
            <InfoRow label="Cho'qqi kuch" value={`${a.peakThrustN.toFixed(0)} N`} />
            <InfoRow label="Umumiy impuls" value={`${a.impulseNs.toFixed(2)} N·s`} />
            <InfoRow label="Yonish vaqti" value={`${(a.burnTimeS * 1000).toFixed(0)} ms`} />
            <InfoRow label="O'rtacha kuch" value={`${(a.impulseNs / Math.max(1e-6, a.burnTimeS)).toFixed(0)} N`} />
            <div className="dock-category">Boshlanish</div>
            <InfoRow label="Boshlang'ich og'irlik" value={`${((a.totalMassG / 1000) * 9.807).toFixed(2)} N`} />
            <InfoRow label="Kuch / og'irlik" value={
              <span style={a.peakThrustN / ((a.totalMassG / 1000) * 9.807) > 5 ? OK : WARN}>
                {(a.peakThrustN / ((a.totalMassG / 1000) * 9.807)).toFixed(1)} : 1
              </span>
            } />
            <div className="dock-category">Burnout</div>
            <InfoRow label="Tezlik" value={`${a.burnoutVelocityMs.toFixed(1)} m/s`} />
            <InfoRow label="Balandlik" value={`${a.burnoutAltitudeM.toFixed(1)} m`} />
          </>
        );

      case "drag":
        return (
          <>
            <div className="dock-component-name">Qarshilik tahlili</div>
            <div className="dock-category">Koeffitsiyent</div>
            <InfoRow label="Cd (jami)" value={<b>{a.dragCoefficient.toFixed(3)}</b>} />
            <InfoRow label="Frontal maydon" value={`${a.frontalAreaCm2.toFixed(1)} cm²`} />
            <div className="dock-category">Kuch</div>
            <InfoRow label="Burnoutda qarshilik" value={`${a.dragN.toFixed(2)} N`} />
            <InfoRow label="Og'irlikka nisbatan" value={`${(a.dragN / ((a.emptyMassG / 1000) * 9.807)).toFixed(2)} ×`} />
            <div className="dock-category">Yo&apos;qotish</div>
            <InfoRow label="Balandlik" value={`${a.maxHeightM.toFixed(1)} m`} />
            <InfoRow label="Qarshiliksiz bo'lardi" value={
              `${(a.burnoutAltitudeM + Math.pow(a.burnoutVelocityMs, 2) / (2 * 9.807)).toFixed(1)} m`
            } />
          </>
        );

      case "stability":
        return (
          <>
            <div className="dock-component-name">Barqarorlik tahlili</div>
            <StabilityBar lengthMm={a.bodyLengthMm} cgMm={a.cgDryMm} cpMm={a.cpMm} />
            <div className="dock-category">Barrowman</div>
            <InfoRow label="Og'irlik markazi (OM)" value={`${a.cgDryMm.toFixed(0)} mm`} />
            <InfoRow label="Bosim markazi (BM)" value={`${a.cpMm.toFixed(0)} mm`} />
            <InfoRow label="Kalibr (diametr)" value={`${a.bodyDiameterMm} mm`} />
            <InfoRow label="Statik zapas" value={
              <span style={a.stability === "STABLE" ? OK : a.stability === "MARGINAL" ? WARN : BAD}>
                {a.staticMarginCal.toFixed(2)} kalibr
              </span>
            } />
            <InfoRow label="Baho" value={
              <span style={a.stability === "STABLE" ? OK : a.stability === "MARGINAL" ? WARN : BAD}>
                {a.stability === "STABLE" ? "Barqaror" : a.stability === "MARGINAL" ? "Chegarada" : "Beqaror"}
              </span>
            } />
            <div className="dock-category">Ko&apos;tarilish paytida</div>
            <InfoRow label="OM (suv bilan)" value={`${a.cgMm.toFixed(0)} mm`} />
            <InfoRow label="Zapas (suv bilan)" value={`${a.staticMarginWetCal.toFixed(2)} kalibr`} />
            <div className="dock-note">
              Statik zapas — BM va OM orasidagi masofa, korpus diametrida o&apos;lchanadi.
              1.0 kalibrdan yuqori bo&apos;lsa raketa o&apos;zini to&apos;g&apos;rilaydi.
            </div>
          </>
        );

      case "designmodel":
        return (
          <>
            <div className="dock-component-name">Dizayn xulosasi</div>
            <div className="dock-category">Asosiy ko&apos;rsatkichlar</div>
            <InfoRow label="Balandlik" value={<b>{a.maxHeightM.toFixed(1)} m</b>} />
            <InfoRow label="Uchish vaqti" value={`${a.totalFlightTimeS.toFixed(1)} s`} />
            <InfoRow label="Uchish massasi" value={`${a.totalMassG.toFixed(0)} g`} />
            <InfoRow label="Uzunligi" value={`${a.bodyLengthMm.toFixed(0)} mm`} />
            <InfoRow label="Statik zapas" value={
              <span style={a.stability === "STABLE" ? OK : a.stability === "MARGINAL" ? WARN : BAD}>
                {a.staticMarginCal.toFixed(2)} kalibr
              </span>
            } />
            <InfoRow label="Narxi" value={
              <span style={a.designCostUsd <= 6 ? OK : BAD}>${a.designCostUsd.toFixed(2)} / $6.00</span>
            } />
            <InfoRow label="Holati" value={
              <span style={a.specStatus === "IN_SPEC" ? OK : BAD}>
                {a.specStatus === "IN_SPEC" ? "Talabga javob beradi" : "Talabga javob bermaydi"}
              </span>
            } />
          </>
        );

      default:
        return <div className="dock-note">Chapdan komponent tanlang</div>;
    }
  };

  const canReset = store.activePanel in
    { propulsion: 1, recovery: 1, nose: 1, conetube: 1, conetransition: 1, fins: 1 };

  return (
    <div className="dock-panel">
      <div className="dock-header">
        <span className="dock-header-icon"><IconTool size={16} stroke={1.8} /></span>
        SOZLASH PANELI
        <button className="dock-header-close" onClick={() => store.setDockOpen(false)} title="Yopish">›</button>
      </div>

      <div className="dock-body custom-scrollbar">
        {renderContent()}

        {(a.specErrors.length > 0 || a.hints.length > 0) && (
          <div className="dock-messages">
            {a.specErrors.map((e, i) => <div key={`e${i}`} className="dock-error">✖ {e}</div>)}
            {a.hints.map((h, i) => <div key={`h${i}`} className="dock-hint flex items-start gap-1.5"><IconBulb size={14} stroke={1.8} className="mt-0.5 shrink-0" /> {h}</div>)}
          </div>
        )}
      </div>

      <div className="dock-actions">
        <button className="dock-btn" onClick={() => store.saveRevision(true)} title="Hozirgi dizaynni saqlash">
          Saqlash
        </button>
        <button className="dock-btn" disabled={!canReset} onClick={() => store.resetPanel(store.activePanel)}
          title="Shu komponentni standart qiymatlarga qaytarish">
          Qaytarish
        </button>
        <button className="dock-btn" onClick={() => store.setDockOpen(false)} title="Panelni yopish">
          Yopish
        </button>
      </div>
    </div>
  );
}
