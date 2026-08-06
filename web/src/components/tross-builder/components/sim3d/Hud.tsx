import { useMemo } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { useBridgeStore, type CameraPreset } from '../../store/useBridgeStore'
import { stressColorHex } from '../../utils/colors'
import { fmt, mm, percent } from '../../utils/format'
import { Icon, type IconName } from '@/components/ui'
import { resetVehicleState } from '../../sim/vehicleState'
import { stopEngine } from '../../sim/audio'
import { buildDiagnostics } from '../../analysis/diagnostics'
import { vehicleSpec } from '../../analysis/useSolver'
import { TestResultDialog } from '../panels/TestResultDialog'
import { generateReport } from '../Report'
import { useI18nStore, useT, type TFunction, type TranslationKey } from '../../i18n'

const CAMERAS: { id: CameraPreset; label: TranslationKey; icon: IconName }[] = [
  { id: 'perspective', label: 'hud.perspective', icon: 'view3d' },
  { id: 'side', label: 'hud.side', icon: 'viewSplit' },
  { id: 'front', label: 'hud.front', icon: 'view2d' },
  { id: 'top', label: 'hud.top', icon: 'layers' },
  { id: 'drive', label: 'hud.drive', icon: 'camera' },
]

/** Colour key for the stress map, matching `stressRamp`. */
function StressLegend({ t }: { t: TFunction }) {
  const stops = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div className="elevation-2 pointer-events-none rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 shadow-md">
      <p className="type-label-m mb-2 uppercase text-on-surface-variant">
        {t('hud.stressRatio')}
      </p>
      <div
        className="h-2.5 w-44 rounded-full"
        style={{
          background: `linear-gradient(to right, ${stops.map((s) => stressColorHex(s)).join(', ')})`,
        }}
      />
      <div className="mt-1 flex w-44 justify-between font-mono text-[10px] tabular-nums text-on-surface-variant">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <p className="type-label-s mt-1 text-on-surface-variant/70">{t('hud.legendHint')}</p>
    </div>
  )
}

function Readout({
  value,
  label,
  tone = 'text-on-surface',
}: {
  value: string
  label: string
  tone?: string
}) {
  return (
    <div>
      <div className={`font-mono text-xl font-medium tabular-nums ${tone}`}>{value}</div>
      <div className="type-label-s uppercase text-on-surface-variant">{label}</div>
    </div>
  )
}

export function Hud() {
  const t = useT()
  const locale = useI18nStore((s) => s.locale)
  const camera = useBridgeStore((s) => s.camera)
  const setCamera = useBridgeStore((s) => s.setCamera)
  const setView = useBridgeStore((s) => s.setView)
  const design = useBridgeStore((s) => s.design)
  const load = useBridgeStore((s) => s.load)

  const phase = useAnalysisStore((s) => s.phase)
  const test = useAnalysisStore((s) => s.test)
  const result = useAnalysisStore((s) => s.result)
  const cursor = useAnalysisStore((s) => s.cursor)
  const live = useAnalysisStore((s) => s.live)
  const resetTest = useAnalysisStore((s) => s.resetTest)
  const resultDialogOpen = useAnalysisStore((s) => s.resultDialogOpen)
  const setResultDialogOpen = useAnalysisStore((s) => s.setResultDialogOpen)
  const collapseLog = useAnalysisStore((s) => s.collapseLog)
  const inspectMember = useAnalysisStore((s) => s.inspectMember)
  const inspectIndex = useAnalysisStore((s) => s.inspectMemberIndex)
  const setCamera2 = useBridgeStore((s) => s.setCamera)

  const stepIndex = Math.min((test?.steps.length ?? 1) - 1, Math.round(cursor))
  const step = test?.steps[stepIndex]
  const active = phase !== 'idle' && !!test

  const worstRatio = active ? (step?.maxRatio ?? 0) : (live?.maxRatio ?? 0)
  const deflection = active ? (step?.maxDisplacement ?? 0) : (live?.maxDisplacement ?? 0)

  // Diagnostics are only rebuilt when a test actually finishes.
  const diagnostics = useMemo(() => {
    if (!test) return null
    return buildDiagnostics(
      test,
      design,
      vehicleSpec(load.vehicle, load.customLoad).name,
      load.windEnabled ? load.windSpeed : 0,
      t,
    )
    // `t` is recreated on every render, so it is intentionally not a dependency;
    // the locale change that matters is already captured by re-running on test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, design, load.vehicle, load.customLoad, load.windEnabled, load.windSpeed, locale])

  const dismiss = () => {
    resetTest()
    resetVehicleState()
    stopEngine()
  }

  const ratioTone =
    worstRatio >= 1 ? 'text-error' : worstRatio >= 0.85 ? 'text-caution' : 'text-on-surface'

  return (
    <>
      {/* --- camera presets ------------------------------------------------ */}
      <div className="elevation-2 pointer-events-auto absolute left-3 top-3 flex gap-0.5 rounded-full border border-outline-variant bg-surface-container-high p-1 shadow-md">
        {CAMERAS.map((c) => (
          <button
            key={c.id}
            type="button"
            title={t(c.label)}
            aria-label={t(c.label)}
            aria-pressed={camera === c.id}
            onClick={() => setCamera(c.id)}
            className={`state-layer type-label-m flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors ${
              camera === c.id
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            }`}
          >
            <Icon name={c.icon} size={16} />
            <span className="hidden xl:inline">{t(c.label)}</span>
          </button>
        ))}
        {/* Only offered once there is actually a broken member to look at. */}
        {inspectIndex >= 0 && (
          <button
            type="button"
            title={t('hud.inspectHint')}
            aria-pressed={camera === 'inspect'}
            onClick={() => setCamera('inspect')}
            className={`state-layer type-label-m flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors ${
              camera === 'inspect' ? 'bg-error text-on-error' : 'text-error'
            }`}
          >
            <Icon name="target" size={16} />
            <span className="hidden xl:inline">{t('hud.inspect')}</span>
          </button>
        )}
      </div>

      {/* --- live telemetry ------------------------------------------------ */}
      <div className="elevation-2 pointer-events-none absolute right-3 top-3 space-y-2.5 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-right shadow-md">
        <Readout value={percent(worstRatio)} label={t('hud.peakUtilisation')} tone={ratioTone} />
        <Readout
          value={`${fmt(mm(deflection), 1)} mm`}
          label={t('hud.deflection')}
          tone="text-primary"
        />
        {active && step && (
          <Readout
            value={`${fmt(step.vehicleX, 1)} m`}
            label={t('hud.chainage')}
            tone="text-tertiary"
          />
        )}
      </div>

      {/* --- legend -------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3">
        <StressLegend t={t} />
      </div>

      {/* --- phase banner -------------------------------------------------- */}
      {phase === 'running' && (
        <div className="type-label-l elevation-2 pointer-events-none absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-on-primary-container">
          <Icon name="science" size={16} />
          {t('test.running')}
        </div>
      )}
      {phase === 'collapsing' && (
        <div className="type-label-l elevation-3 pointer-events-none absolute left-1/2 top-16 flex -translate-x-1/2 animate-pulse items-center gap-2 rounded-full bg-error px-4 py-2 text-on-error">
          <Icon name="error" size={16} />
          {t('test.failure')}
        </div>
      )}

      {/* --- reopen the report while inspecting --------------------------- */}
      {!resultDialogOpen && result && phase !== 'running' && (
        <button
          type="button"
          onClick={() => setResultDialogOpen(true)}
          className="state-layer type-label-l elevation-2 pointer-events-auto absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2.5 text-on-surface"
        >
          <Icon name="description" size={18} />
          {t('dialog.tabSummary')}
        </button>
      )}

      {/* --- full engineering report -------------------------------------- */}
      <div className="pointer-events-auto">
        <TestResultDialog
          open={resultDialogOpen}
          diagnostics={diagnostics}
          result={result}
          totalCost={live?.summary.totalCost ?? 0}
          design={design}
          deckY={live?.summary.deckY ?? 0}
          collapseLog={collapseLog}
          onBackToDesign={() => {
            dismiss()
            setView('2d')
          }}
          onClose={() => setResultDialogOpen(false)}
          onGenerateReport={() => void generateReport()}
          onShowIn3D={(index) => {
            inspectMember(index)
            setCamera2('inspect')
          }}
        />
      </div>
    </>
  )
}
