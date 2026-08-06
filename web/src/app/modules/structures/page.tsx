"use client";

import { type ReactNode, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { IconAlertTriangle, IconBuildingBridge, IconChartLine, IconCircleCheck, IconExclamationCircle, IconPlayerPlay, IconRulerMeasure, IconShieldCheck, IconSparkles, IconVariable } from "@tabler/icons-react";

const BridgeSimulator = dynamic(() => import("@/components/tross-builder/App"), {
  ssr: false,
  loading: () => (
    <div className="type-body-m flex flex-1 items-center justify-center bg-surface-container text-on-surface-variant">
      3D Truss / Bridge Simulyatori yuklanmoqda...
    </div>
  ),
});

type StructuresTab = "truss" | "beam";

const TABS: { id: StructuresTab; label: string; Icon: typeof IconBuildingBridge }[] = [
  { id: "truss", label: "Bridge & Truss", Icon: IconBuildingBridge },
  { id: "beam", label: "Beam / Column FEA", Icon: IconRulerMeasure },
];

/**
 * The engine switch lives inside whichever app bar is on screen — the
 * simulator's own bar in truss mode, the calculator's in beam mode — so the
 * page never stacks a second bar above the module chrome.
 */
function EngineTabs({
  tab,
  onChange,
}: {
  tab: StructuresTab;
  onChange: (t: StructuresTab) => void;
}) {
  return (
    <div role="tablist" className="inline-flex h-10 overflow-hidden rounded-full border border-outline">
      {TABS.map(({ id, label, Icon }, i) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`state-layer type-label-l inline-flex items-center gap-2 px-4 transition-colors ${
              i > 0 ? "border-l border-outline" : ""
            } ${
              active
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant"
            }`}
          >
            <Icon size={18} stroke={1.8} />
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function StructuresPage() {
  const [tab, setTab] = useState<StructuresTab>("truss");
  const tabs = <EngineTabs tab={tab} onChange={setTab} />;

  return (
    <div className="md3-scope flex h-full min-h-140 w-full flex-col overflow-hidden bg-surface-container-lowest">
      {tab === "truss" ? (
        <BridgeSimulator appBarLeading={tabs} />
      ) : (
        <BeamColumnCalculator tabs={tabs} />
      )}
    </div>
  );
}

type AnalysisType = "beam" | "column" | "section";

function SliderField({
  label,
  readout,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  readout: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="type-body-s text-on-surface-variant">{label}</span>
        <span className="type-label-l font-mono tabular-nums text-primary">{readout}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </label>
  );
}

function MetricCard({
  label,
  value,
  Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  Icon: typeof IconVariable;
  tone?: "default" | "primary" | "safe" | "danger";
}) {
  const valueTone = {
    default: "text-on-surface",
    primary: "text-primary",
    safe: "text-safe",
    danger: "text-error",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
      <div className="min-w-0">
        <div className="type-label-s uppercase text-on-surface-variant">{label}</div>
        <div className={`type-title-m mt-1 font-mono tabular-nums ${valueTone}`}>{value}</div>
      </div>
      <Icon size={22} stroke={1.8} className="shrink-0 text-on-surface-variant" />
    </div>
  );
}

type BeamResult = {
  bending_moment_Nm: number;
  bending_stress_Pa: number;
  deflection_m: number;
  moment_of_inertia_m4: number;
};

type ColumnResult = {
  critical_load_N: number;
  safety_factor: number;
};

type SectionResult = {
  I_rect_m4: number;
  I_circle_m4: number;
};

function BeamColumnCalculator({ tabs }: { tabs: ReactNode }) {
  const [mode, setMode] = useState<AnalysisType>("beam");
  const [force, setForce] = useState(100);
  const [length, setLength] = useState(1);
  const [width, setWidth] = useState(0.05);
  const [height, setHeight] = useState(0.1);
  const [Emod, setEmod] = useState(200);
  
  const [beamResult, setBeamResult] = useState<BeamResult | null>(null);
  const [columnResult, setColumnResult] = useState<ColumnResult | null>(null);
  const [sectionResult, setSectionResult] = useState<SectionResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "structure",
          params: { mode, force, length, width, height, Emod }
        })
      });
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      if (mode === "beam") {
        setBeamResult(data);
      } else if (mode === "column") {
        setColumnResult(data);
      } else if (mode === "section") {
        setSectionResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [mode, force, length, width, height, Emod]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant bg-surface-container px-4">
        <span className="type-title-m shrink-0 text-on-surface">
          Beam<span className="text-primary">FEA</span>
        </span>
        {tabs}
      </header>

    <div className="flex-1 overflow-y-auto bg-surface">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <span className="type-label-m uppercase text-primary">Qurilish va mexanika laboratoriyasi</span>
        <h1 className="type-headline-s text-on-surface">Tuzilmalar tahlili</h1>
        <p className="type-body-m max-w-3xl text-on-surface-variant">
          Egiluvchan balkalar va siqiluvchan ustunlar parametrlarini sozlang. Tizim materiallar qarshiligi (Euler-Bernoulli beam theory hamda Euler buckling) qonuniyatlariga binoan egilish, zo&apos;riqish va tanglik koeffitsientlarini hisoblaydi.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6 lg:flex-nowrap">
        {/* Left Side: Parameters */}
        <div className="flex w-full flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-5 lg:w-96">
          <div className="flex flex-col gap-3 border-b border-outline-variant pb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-title-m text-on-surface">Geometriya &amp; Yuk</h2>
              <span className="type-label-s rounded-xs bg-tertiary-container px-2 py-1 text-on-tertiary-container">
                Struktura
              </span>
            </div>

            <div className="inline-flex h-10 overflow-hidden rounded-full border border-outline">
              {(["beam", "column", "section"] as const).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setBeamResult(null);
                    setColumnResult(null);
                    setSectionResult(null);
                  }}
                  className={`state-layer type-label-l flex-1 transition-colors ${
                    i > 0 ? "border-l border-outline" : ""
                  } ${
                    mode === m
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  {m === "beam" ? "Balka" : m === "column" ? "Ustun" : "Kesim"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <SliderField label="Tushayotgan kuch (F)" readout={`${force} N`} min={10} max={10000} step={10} value={force} onChange={setForce} />
            <SliderField label="Uzunlik (L)" readout={`${length.toFixed(2)} m`} min={0.1} max={5} step={0.05} value={length} onChange={setLength} />
            <SliderField label="Kesim eni (b)" readout={`${(width * 1000).toFixed(0)} mm`} min={0.01} max={0.5} step={0.005} value={width} onChange={setWidth} />
            <SliderField label="Kesim balandligi (h)" readout={`${(height * 1000).toFixed(0)} mm`} min={0.01} max={0.5} step={0.005} value={height} onChange={setHeight} />
            <SliderField label="Elastiklik moduli (E)" readout={`${Emod} GPa`} min={1} max={300} step={1} value={Emod} onChange={setEmod} />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="state-layer type-label-l mt-2 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-on-primary transition-colors disabled:pointer-events-none disabled:opacity-38"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  Tahlil qilinmoqda...
                </>
              ) : (
                <>
                  <IconPlayerPlay size={18} stroke={1.8} />
                  Konstruksiyani tahlillash
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="flex min-w-80 flex-1 flex-col gap-6">
          {error && (
            <div className="type-body-s flex items-center gap-2 rounded-md bg-error-container p-4 text-on-error-container">
              <IconExclamationCircle size={18} stroke={1.8} className="shrink-0" />
              Xatolik yuz berdi: {error}
            </div>
          )}

          {/* Column critical warning alert */}
          {mode === "column" && columnResult && columnResult.safety_factor < 1.5 && (
            <div
              className={`flex flex-col gap-1 rounded-md p-4 ${
                columnResult.safety_factor < 1.0
                  ? "bg-error-container text-on-error-container"
                  : "bg-tertiary-container text-on-tertiary-container"
              }`}
            >
              <div className="type-title-s flex items-center gap-2">
                <IconAlertTriangle size={18} stroke={1.8} className="shrink-0" />
                {columnResult.safety_factor < 1.0
                  ? "Ustun siqilish yoki bukilish holatida!"
                  : "Ustunning barqarorlik chegarasi juda kam!"}
              </div>
              <p className="type-body-s">
                Ushbu yuk ostida ustun xavfsizlik chegarasi{" "}
                <span className="font-mono font-medium">{columnResult.safety_factor.toFixed(2)}</span>.
                Ustun sinmasligi uchun xavfsizlik moduli kamida 1.5-2.0 dan baland bo&apos;lishi tavsiya etiladi. Kesim balandligi yoki enini kattalashtiring.
              </p>
            </div>
          )}

          {/* Beam Results */}
          {mode === "beam" && beamResult && (
            <div className="flex flex-col gap-4">
              <h2 className="type-title-m text-on-surface">Balka egilish tahlillari</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard label="Maks. Egilish momenti" value={`${beamResult.bending_moment_Nm.toFixed(1)} N·m`} Icon={IconVariable} tone="primary" />
                <MetricCard label="Maks. Egilish zo'riqishi" value={`${(beamResult.bending_stress_Pa / 1e6).toFixed(2)} MPa`} Icon={IconAlertTriangle} tone="danger" />
                <MetricCard label="Maksimal egilish masofasi" value={`${(beamResult.deflection_m * 1000).toFixed(3)} mm`} Icon={IconRulerMeasure} tone="primary" />
                <MetricCard label="Inersiya momenti (I)" value={`${beamResult.moment_of_inertia_m4.toExponential(3)} m⁴`} Icon={IconSparkles} tone="safe" />
              </div>
            </div>
          )}

          {/* Column Results */}
          {mode === "column" && columnResult && (
            <div className="flex flex-col gap-4">
              <h2 className="type-title-m text-on-surface">Ustun bukilish tahlillari</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard label="Tangidiy bukilish yuki (P_cr)" value={`${columnResult.critical_load_N.toFixed(0)} N`} Icon={IconChartLine} tone="primary" />
                <MetricCard
                  label="Xavfsizlik koeffitsienti"
                  value={columnResult.safety_factor.toFixed(2)}
                  Icon={IconShieldCheck}
                  tone={columnResult.safety_factor < 1.5 ? "danger" : "safe"}
                />
              </div>
            </div>
          )}

          {/* Section Results */}
          {mode === "section" && sectionResult && (
            <div className="flex flex-col gap-4">
              <h2 className="type-title-m text-on-surface">Geometrik inersiya momentlari</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard label="To'rtburchak kesim I_xx" value={`${sectionResult.I_rect_m4.toExponential(4)} m⁴`} Icon={IconVariable} tone="primary" />
                <MetricCard
                  label={`Doiraviy kesim I_xx (d = ${Math.min(width, height).toFixed(3)} m)`}
                  value={`${sectionResult.I_circle_m4.toExponential(4)} m⁴`}
                  Icon={IconVariable}
                  tone="primary"
                />
              </div>
            </div>
          )}

          {!beamResult && !columnResult && !sectionResult && (
            <div className="flex h-75 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-outline bg-surface-container-lowest px-6 text-center">
              <IconCircleCheck size={36} stroke={1.6} className="mb-2 text-on-surface-variant" />
              <span className="type-title-s text-on-surface">Tahlillash uchun &quot;Konstruksiyani tahlillash&quot; tugmasini bosing.</span>
              <span className="type-body-s text-on-surface-variant">Koeffitsientlar materiallar qarshiligi tenglamalari asosida hisoblanadi.</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
