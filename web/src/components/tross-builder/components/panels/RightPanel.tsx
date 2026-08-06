import { useCallback, useState } from 'react'
import { useBridgeStore } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { CROSS_SECTIONS, MATERIALS, getSection } from '../../data/materials'
import { resetVehicleState } from '../../sim/vehicleState'
import { startEngine, stopEngine } from '../../sim/audio'
import type { MaterialId, SupportType, VehicleType } from '../../types'
import {
  Accordion,
  Button,
  Card,
  IconButton,
  KeyStat,
  LinearProgress,
  Select,
  Slider,
  Stat,
  Switch,
  Icon,
} from '@/components/ui'
import { fmt, fmtkNWithMass, mass, mm, money, percent } from '../../utils/format'
import { generateReport } from '../Report'
import { useT, type TranslationKey } from '../../i18n'

interface Props {
  collapsed: boolean
  runTest: (opts: {
    design: ReturnType<typeof useBridgeStore.getState>['design']
    vehicle: VehicleType
    customLoad: number
    windSpeed: number
  }) => void
}

const MATERIAL_LABELS: Record<MaterialId, TranslationKey> = {
  steel: 'material.steel',
  wood: 'material.wood',
  composite: 'material.composite',
}

export function RightPanel({ collapsed, runTest }: Props) {
  const t = useT()
  const design = useBridgeStore((s) => s.design)
  const view = useBridgeStore((s) => s.view)
  const load = useBridgeStore((s) => s.load)
  const setLoad = useBridgeStore((s) => s.setLoad)
  const setView = useBridgeStore((s) => s.setView)
  const overlay = useBridgeStore((s) => s.overlay)
  const setOverlay = useBridgeStore((s) => s.setOverlay)

  const selectedMemberId = useBridgeStore((s) => s.selectedMemberId)
  const selectedNodeId = useBridgeStore((s) => s.selectedNodeId)
  const deleteMember = useBridgeStore((s) => s.deleteMember)
  const deleteNode = useBridgeStore((s) => s.deleteNode)
  const paintMember = useBridgeStore((s) => s.paintMember)
  const setSupport = useBridgeStore((s) => s.setSupport)
  const select = useBridgeStore((s) => s.select)

  const live = useAnalysisStore((s) => s.live)
  const phase = useAnalysisStore((s) => s.phase)
  const result = useAnalysisStore((s) => s.result)
  const test = useAnalysisStore((s) => s.test)
  const cursor = useAnalysisStore((s) => s.cursor)
  const startTest = useAnalysisStore((s) => s.startTest)
  const setPhase = useAnalysisStore((s) => s.setPhase)
  const resetTest = useAnalysisStore((s) => s.resetTest)
  const setResultDialogOpen = useAnalysisStore((s) => s.setResultDialogOpen)
  const inspectMember = useAnalysisStore((s) => s.inspectMember)
  const setCamera = useBridgeStore((s) => s.setCamera)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const summary = live?.summary
  const stable = live?.ok ?? false

  const selectedMember = design.members.find((m) => m.id === selectedMemberId)
  const selectedMemberIndex = design.members.findIndex((m) => m.id === selectedMemberId)
  const selectedNode = design.nodes.find((n) => n.id === selectedNodeId)
  const selectedNodeIndex = design.nodes.findIndex((n) => n.id === selectedNodeId)

  const onStart = useCallback(() => {
    resetVehicleState()
    startTest()
    setView('3d')
    startEngine()
    runTest({
      design,
      vehicle: load.vehicle,
      customLoad: load.customLoad,
      windSpeed: load.windEnabled ? load.windSpeed / 3.6 : 0, // km/h -> m/s
    })
  }, [design, load, runTest, setView, startTest])

  const onReset = useCallback(() => {
    resetTest()
    resetVehicleState()
    stopEngine()
  }, [resetTest])

  if (collapsed) return null

  // In 2D mode, when an element is selected, show ONLY the Figma element inspector
  const isElementSelected = view === '2d' && (selectedMember !== undefined || selectedNode !== undefined)
  if (isElementSelected) {
    return (
      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-outline-variant bg-surface-container-low p-3 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <h3 className="type-title-m font-semibold text-on-surface flex items-center gap-2">
            <Icon name="tune" size={18} className="text-primary" />
            Element xususiyatlari
          </h3>
          <IconButton
            icon="close"
            title="Yopish (Deselect)"
            size={18}
            onClick={() => select({ memberId: null, nodeId: null })}
          />
        </div>
        {selectedMember && (
          <div className="space-y-3">
            <div className="type-title-s text-primary font-bold">
              Sterjen #{selectedMemberIndex + 1}
            </div>
            <Select
              label="Profilni o'zgartirish"
              value={selectedMember.sectionId}
              options={CROSS_SECTIONS.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              onChange={(id) => paintMember(selectedMember.id, getSection(id).materialId, id)}
            />
            <dl className="space-y-2 font-mono text-xs tabular-nums text-on-surface-variant bg-surface-container rounded-md p-3">
              <div className="flex justify-between">
                <dt>Material</dt>
                <dd className="text-on-surface font-semibold">{MATERIALS[selectedMember.materialId]?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Uzunlik</dt>
                <dd className="text-on-surface">
                  {fmt(live?.summary.lengths[selectedMemberIndex] ?? 0, 2)} m
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Eyler bo'yicha (Pcr)</dt>
                <dd className="text-on-surface">
                  {fmtkNWithMass(live?.summary.pcr[selectedMemberIndex] ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Zaruriy kuch</dt>
                <dd className="text-on-surface">
                  {fmtkNWithMass(live?.forces[selectedMemberIndex] ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Yuklanish nisbati</dt>
                <dd className="text-on-surface font-bold text-primary">
                  {percent(live?.ratios[selectedMemberIndex] ?? 0)}
                </dd>
              </div>
            </dl>
            <Button
              full
              variant="tonal"
              icon="delete"
              className="!py-2 !text-xs !bg-error-container !text-on-error-container"
              onClick={() => deleteMember(selectedMember.id)}
            >
              Sterjenni o'chirish
            </Button>
          </div>
        )}
        {selectedNode && (
          <div className="space-y-3">
            <div className="type-title-s text-primary font-bold">
              Tugun J#{selectedNodeIndex + 1}
            </div>
            <dl className="space-y-2 font-mono text-xs tabular-nums text-on-surface-variant bg-surface-container rounded-md p-3">
              <div className="flex justify-between">
                <dt>Koordinata X</dt>
                <dd className="text-on-surface">{selectedNode.x.toFixed(2)} m</dd>
              </div>
              <div className="flex justify-between">
                <dt>Koordinata Y</dt>
                <dd className="text-on-surface">{selectedNode.y.toFixed(2)} m</dd>
              </div>
            </dl>
            <Select
              label="Tayanch turi"
              value={selectedNode.support}
              options={[
                { value: 'none' as SupportType, label: "O'rta tugun (Erkin)" },
                { value: 'pin' as SupportType, label: 'Qo\'zg\'olmas tayanch (Pin)' },
                { value: 'roller' as SupportType, label: 'G\'ildirakli tayanch (Roller)' },
              ]}
              onChange={(sup) => setSupport(selectedNode.id, sup as SupportType)}
            />
            <Button
              full
              variant="tonal"
              icon="delete"
              className="!py-2 !text-xs !bg-error-container !text-on-error-container"
              onClick={() => deleteNode(selectedNode.id)}
            >
              Tugunni o'chirish
            </Button>
          </div>
        )}
      </aside>
    )
  }

  const running = phase === 'running'
  const busy = phase === 'solving'
  const finished = phase === 'complete'
  const stepCount = test?.steps.length ?? 0
  const progress = stepCount > 1 ? cursor / (stepCount - 1) : 0

  const deadRatio = live?.maxRatio ?? 0
  const utilTone = deadRatio > 0.9 ? 'danger' : deadRatio > 0.6 ? 'caution' : 'safe'

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-outline-variant bg-surface-container-low">
      {/* --- at a glance: the four numbers that actually matter ----------- */}
      <div className="grid grid-cols-2 gap-1.5 border-b border-outline-variant p-3">
        <KeyStat
          icon="cost"
          value={money(summary?.totalCost ?? 0)}
          label={t('stats.cost')}
        />
        <KeyStat
          icon="weight"
          value={mass(summary?.totalMass ?? 0)}
          label={t('stats.weight')}
        />
        <KeyStat
          icon="deflection"
          value={`${fmt(mm(live?.maxDisplacement ?? 0), 1)} mm`}
          label={t('stats.deflection')}
          tone={(live?.maxDisplacement ?? 0) > design.span / 400 ? 'caution' : 'safe'}
          hint={t('stats.deflectionHint')}
        />
        <KeyStat
          icon="analytics"
          value={percent(deadRatio)}
          label={t('stats.utilisation')}
          tone={utilTone}
          hint={t('stats.utilisationHint')}
        />
      </div>

      {/* --- load test: the primary action ------------------------------- */}
      <div className="border-b border-outline-variant px-3 py-3">
        <h3 className="type-label-m mb-2 flex items-center gap-2 uppercase text-on-surface-variant">
          <Icon name="truck" size={16} />
          {t('test.title')}
        </h3>

        <Select
          label={t('test.loadType')}
          value={load.vehicle}
          options={[
            { value: 'truck' as VehicleType, label: t('test.truck') },
            { value: 'train' as VehicleType, label: t('test.train') },
            { value: 'custom' as VehicleType, label: t('test.custom') },
          ]}
          onChange={(v) => setLoad({ vehicle: v })}
        />
        {load.vehicle === 'custom' && (
          <Slider
            label={t('test.customLoad')}
            min={5}
            max={400}
            step={5}
            value={load.customLoad / 1000}
            onChange={(v) => setLoad({ customLoad: v * 1000 })}
            format={(v) => `${v} kN`}
          />
        )}

        <Switch
          label={t('test.wind')}
          checked={load.windEnabled}
          onChange={(v) => setLoad({ windEnabled: v })}
          hint={t('test.windHint')}
        />
        {load.windEnabled && (
          <Slider
            label={t('test.windSpeed')}
            min={0}
            max={150}
            step={5}
            value={load.windSpeed}
            onChange={(v) => setLoad({ windSpeed: v })}
            format={(v) => `${v} km/h`}
          />
        )}

        <p className="type-label-s mb-3 mt-2 flex items-center gap-1.5 text-on-surface-variant">
          <Icon name="info" size={14} />
          {load.windEnabled ? t('test.combo2') : t('test.combo1')}
        </p>

        <div className="flex gap-1.5">
          {view === '2d' ? (
            <Button
              variant="filled"
              icon="play"
              className="flex-1 !bg-primary"
              disabled={!stable || busy}
              onClick={() => {
                setView('3d')
                onStart()
              }}
              title="3D Simulyatsiyaga o'tish va sinovni boshlash"
            >
              3D ga o'tish va sinash
            </Button>
          ) : finished || phase === 'collapsing' ? (
            <Button
              variant="filled"
              icon="restart"
              className="flex-1 !bg-amber-600 hover:!bg-amber-500 !text-white"
              onClick={onReset}
              title="Ko'prikni tiklash va qaytadan sinash"
            >
              Ko'prikni tiklash
            </Button>
          ) : (
            <Button
              variant="filled"
              icon="play"
              className="flex-1"
              disabled={!stable || busy}
              onClick={onStart}
              title={stable ? t('test.startHint') : t('test.fixFirst')}
            >
              {busy ? t('test.solving') : t('test.start')}
            </Button>
          )}
          <IconButton
            icon={running ? 'pause' : 'play'}
            title={running ? t('test.pause') : t('test.resume')}
            disabled={!test || finished || phase === 'collapsing'}
            onClick={() => setPhase(running ? 'paused' : 'running')}
          />
          <IconButton
            icon="restart"
            title={t('test.reset')}
            disabled={phase === 'idle'}
            onClick={onReset}
          />
        </div>

        {test && (
          <div className="mt-3">
            <LinearProgress value={progress} />
            <p className="type-label-s mt-1.5 text-on-surface-variant">
              {t('test.progress', {
                step: Math.round(cursor) + 1,
                total: stepCount,
                x: fmt(test.steps[Math.min(stepCount - 1, Math.round(cursor))]?.vehicleX ?? 0, 1),
              })}
            </p>
          </div>
        )}

        {!stable && (
          <Card className="mt-3 !bg-error-container !p-2.5">
            <p className="type-body-s flex items-start gap-2 text-on-error-container">
              <Icon name="error" size={16} className="mt-px shrink-0" />
              {live?.message ?? t('determinacy.unstable')}
            </p>
          </Card>
        )}
      </div>

      {/* --- results: only after a test ---------------------------------- */}
      {result && (finished || phase === 'collapsing') && (
        <div className="border-b border-outline-variant px-3 py-3 space-y-3">
          <div
            className={`type-title-s flex items-center justify-center gap-2 rounded-sm py-2 ${
              result.passed
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <Icon name={result.passed ? 'checkCircle' : 'error'} size={18} />
            {result.passed ? t('results.pass') : t('results.fail')}
          </div>

          <Stat label={t('results.score')} value={`${result.score} / 100`} tone="primary" />
          <Stat
            label={t('results.maxRatio')}
            value={percent(result.maxRatio)}
            tone={result.maxRatio >= 1 ? 'danger' : result.maxRatio > 0.8 ? 'caution' : 'safe'}
          />
          <Stat
            label={t('results.peakDeflection')}
            value={`${fmt(mm(result.peakDeflection), 1)} mm`}
          />

          <Button
            full
            variant="tonal"
            icon="description"
            onClick={() => setResultDialogOpen(true)}
          >
            {t('dialog.tabSummary')}
          </Button>

          {/* --- Full Member Status List Post-Test ------------------------ */}
          <div className="pt-2 border-t border-outline-variant/60">
            <h4 className="type-label-m font-semibold uppercase text-on-surface-variant mb-2">
              Barcha sterjenlar holati ({design.members.length} ta)
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {design.members.map((m, i) => {
                const stepIdx = test ? Math.min(test.steps.length - 1, Math.round(cursor)) : 0
                const f = test?.steps[stepIdx]?.forces[i] ?? live?.forces[i] ?? 0
                const r = test?.steps[stepIdx]?.ratios[i] ?? live?.ratios[i] ?? 0
                const isBroken = test?.failureMemberIndex === i
                const sec = getSection(m.sectionId).name

                const badge = isBroken
                  ? { text: 'Buzildi', cls: 'bg-error text-on-error' }
                  : r >= 0.85
                    ? { text: 'Yuqori', cls: 'bg-caution text-on-caution' }
                    : { text: 'Normal', cls: 'bg-safe text-on-safe' }

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      inspectMember(i)
                      setCamera('inspect')
                    }}
                    className="state-layer flex w-full items-center justify-between rounded bg-surface-container p-2 text-left text-xs transition-colors hover:bg-surface-container-high"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-on-surface flex items-center gap-1">
                        <span>#{i + 1}</span>
                        <span className="text-[10px] text-on-surface-variant truncate font-normal">
                          · {sec}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-on-surface-variant">
                        {fmtkNWithMass(f)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${badge.cls}`}>
                        {badge.text}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface font-semibold">
                        {(r * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- detail, collapsed by default -------------------------------- */}
      <Accordion
        title={t('stats.title')}
        icon="analytics"
        open={detailsOpen}
        onToggle={() => setDetailsOpen((v) => !v)}
      >
        <Stat
          label={t('stats.efficiency')}
          value={stable && deadRatio > 0 ? `${((1 / deadRatio) * 100).toFixed(0)}%` : '—'}
          hint={t('stats.efficiencyHint')}
        />
        <Stat
          label={t('stats.counts')}
          value={`${design.nodes.length} / ${design.members.length}`}
        />
        <Stat
          label={t('stats.determinacy')}
          value={
            !stable
              ? t('determinacy.unstable')
              : (summary?.determinacy ?? 0) === 0
                ? t('determinacy.determinate')
                : t('determinacy.indeterminate', { n: summary?.determinacy ?? 0 })
          }
          tone={!stable ? 'danger' : (summary?.determinacy ?? 0) === 0 ? 'safe' : 'default'}
          hint={t('stats.determinacyHint')}
        />
      </Accordion>

      <Accordion
        title={t('stats.advanced')}
        icon="tune"
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((v) => !v)}
      >
        <Slider
          label={t('overlay.exaggeration3d')}
          min={1}
          max={60}
          step={1}
          value={overlay.scale3d}
          onChange={(v) => setOverlay({ scale3d: v })}
          format={(v) => `${v}×`}
        />
        <Slider
          label={t('test.speed')}
          min={0.5}
          max={2}
          step={0.5}
          value={load.speed}
          onChange={(v) => setLoad({ speed: v })}
          format={(v) => `${v}×`}
        />
        <Switch
          label={t('overlay.stressMap')}
          checked={overlay.showStressMap}
          onChange={(v) => setOverlay({ showStressMap: v })}
          hint={t('overlay.stressMapHint')}
        />
      </Accordion>

      {/* --- report export ------------------------------------------------ */}
      <div className="mt-auto border-t border-outline-variant p-3">
        <Button
          full
          variant="filled"
          icon="download"
          onClick={() => void generateReport()}
          title={t('report.generateHint')}
        >
          {t('report.generate')}
        </Button>
      </div>
    </aside>
  )
}
