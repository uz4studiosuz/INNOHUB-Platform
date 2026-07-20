"use client";

import React from "react";
import { useRocketStore } from "../../store/rocketStore";

function NumericField({ label, value, onChange, unit = "mm" }: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="dock-field-row">
      <span className="dock-field-label">{label}</span>
      <input
        type="number"
        className="dock-field-input"
        value={value === null || Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={unit === "°" ? 1 : (unit === "mm" ? 1 : 0.1)}
      />
      <span className="dock-field-unit">{unit}</span>
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
      <select
        className="dock-field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
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

export function RocketDockingStation() {
  const store = useRocketStore();

  const renderContent = () => {
    switch (store.activePanel) {
      case "propulsion":
        return (
          <>
            <div className="dock-component-name">Propulsion</div>
            <div className="dock-category">Initial Conditions</div>
            <NumericField label="Pressure" value={store.propulsion.pressurePsi} onChange={(v) => store.updatePropulsion({ pressurePsi: v || 0 })} unit="PSI" />
            <NumericField label="Water Volume" value={store.propulsion.waterVolumeL} onChange={(v) => store.updatePropulsion({ waterVolumeL: v || 0 })} unit="L" />
            
            <div className="dock-category mt-4">Bottle Geometry</div>
            <SelectField label="Size" value={store.propulsion.bottleSize} onChange={(v) => store.updatePropulsion({ bottleSize: v as any })} options={[
              { value: "20oz_coke", label: "20 oz. Coke" },
              { value: "1L", label: "1 Liter" },
              { value: "2L_coke", label: "2 Liter Coke" },
              { value: "2L_pepsi", label: "2 Liter Pepsi" },
            ]} />
            
            <div className="dock-category mt-4">Information</div>
            <InfoRow label="Empty Mass" value={`${(store.analysis.massG - (store.propulsion.waterVolumeL*1000)).toFixed(2)} g`} />
            <InfoRow label="Surface Area" value={`-- cm²`} />
            <InfoRow label="Part Number" value={`N/A`} />
            <InfoRow label="Cost" value={`N/A $`} />
          </>
        );
      case "recovery":
        return (
          <>
            <div className="dock-component-name">Recovery</div>
            <div className="dock-category">Recovery System</div>
            <SelectField label="System" value={store.recovery.system} onChange={(v) => store.updateRecovery({ system: v as any })} options={[
              { value: "parachute", label: "PARACHUTE" },
              { value: "backslider", label: "STD/BACKSLIDER" },
            ]} />
            {store.recovery.system === "parachute" && (
              <NumericField label="Parachute Size" value={store.recovery.parachuteSizeMm} onChange={(v) => store.updateRecovery({ parachuteSizeMm: v || 0 })} />
            )}
            
            <div className="dock-category mt-4">Information</div>
            <InfoRow label="Deploy Status" value={
              <span className={store.analysis.deployStatus === "Will Deploy" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {store.analysis.deployStatus}
              </span>
            } />
            <InfoRow label="Mass" value={`${store.recovery.system === "parachute" ? (store.recovery.parachuteSizeMm / 100)*2 : 1} g`} />
          </>
        );
      case "nose":
        return (
          <>
            <div className="dock-component-name">Nose</div>
            <div className="dock-category">Geometry</div>
            <SelectField label="Material" value={store.nose.materialCode} onChange={(v) => store.updateNose({ materialCode: v })} options={[
              { value: "BT55", label: "BT55" },
              { value: "BT60", label: "BT60" },
            ]} />
            <NumericField label="Ball Size" value={store.nose.ballSizeMm} onChange={(v) => store.updateNose({ ballSizeMm: v || 0 })} />
            <NumericField label="Clay Mass" value={store.nose.clayMassG} onChange={(v) => store.updateNose({ clayMassG: v || 0 })} unit="g" />
          </>
        );
      case "conetube":
        return (
          <>
            <div className="dock-component-name">Cone Tube</div>
            <NumericField label="Length" value={store.coneTube.lengthMm} onChange={(v) => store.updateConeTube({ lengthMm: v || 0 })} />
            <NumericField label="Diameter" value={store.coneTube.diameterMm} onChange={(v) => store.updateConeTube({ diameterMm: v || 0 })} />
          </>
        );
      case "conetransition":
        return (
          <>
            <div className="dock-component-name">Cone Transition</div>
            <NumericField label="Transition Length" value={store.coneTransition.transitionLengthMm} onChange={(v) => store.updateConeTransition({ transitionLengthMm: v || 0 })} />
          </>
        );
      case "fins":
        return (
          <>
            <div className="dock-component-name">Fins</div>
            <NumericField label="Number of Fins" value={store.fins.count} onChange={(v) => store.updateFins({ count: v || 0 })} unit="" />
            <div className="dock-category mt-4">Shape Config</div>
            <NumericField label="Span" value={store.fins.spanMm} onChange={(v) => store.updateFins({ spanMm: v || 0 })} />
            <NumericField label="Root Chord" value={store.fins.rootChordMm} onChange={(v) => store.updateFins({ rootChordMm: v || 0 })} />
            <NumericField label="Tip Chord" value={store.fins.tipChordMm} onChange={(v) => store.updateFins({ tipChordMm: v || 0 })} />
            <NumericField label="Sweep" value={store.fins.sweepMm} onChange={(v) => store.updateFins({ sweepMm: v || 0 })} />
          </>
        );
      case "weight":
      case "thrust":
      case "drag":
      case "stability":
      case "designmodel":
        return (
          <>
            <div className="dock-component-name">{store.activePanel.charAt(0).toUpperCase() + store.activePanel.slice(1)} Analysis</div>
            <div className="dock-category mt-4">Results</div>
            <InfoRow label="Total Mass" value={`${store.analysis.massG.toFixed(2)} g`} />
            <InfoRow label="Burnout Velocity" value={`${store.analysis.burnoutVelocityMs.toFixed(2)} m/s`} />
            <InfoRow label="Max Height" value={`${store.analysis.maxHeightM.toFixed(2)} m`} />
            <InfoRow label="Spec Status" value={
              <span className={store.analysis.specStatus === "IN_SPEC" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {store.analysis.specStatus}
              </span>
            } />
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs border border-gray-200">
              {store.analysis.specErrors.map((err, i) => (
                <div key={i} className="text-red-600 mb-1">• {err}</div>
              ))}
            </div>
          </>
        );
      default:
        return <div>Select a component</div>;
    }
  };

  return (
    <div className="w-64 bg-[#f8f8f8] border-l border-gray-300 flex flex-col shadow-[-2px_0_5px_rgba(0,0,0,0.05)] z-10 flex-shrink-0">
      <div className="bg-[#e0e0e0] px-4 py-1.5 text-xs font-bold text-gray-500 tracking-wider text-center border-b border-gray-300 uppercase flex items-center justify-between">
        <span className="text-orange-500"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg></span>
        DOCKING STATION
        <span className="text-gray-400">›</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {renderContent()}
      </div>

      <div className="p-3 border-t border-gray-300 bg-[#ebebeb] flex gap-2 justify-center">
        <button className="px-3 py-1 bg-[#dcdcdc] text-gray-600 text-xs font-bold hover:bg-gray-300 rounded border border-gray-400">APPLY</button>
        <button className="px-3 py-1 bg-[#dcdcdc] text-gray-600 text-xs font-bold hover:bg-gray-300 rounded border border-gray-400">RESET</button>
        <button className="px-3 py-1 bg-[#dcdcdc] text-gray-600 text-xs font-bold hover:bg-gray-300 rounded border border-gray-400">DONE</button>
      </div>
    </div>
  );
}
