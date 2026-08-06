import { useState } from 'react'
import {
  GOVERNED_KEY,
  ROLE_KEY,
  type MemberDiagnostic,
  type TestDiagnostics,
} from '../../analysis/diagnostics'
import type { BridgeDesign, TestResult } from '../../types'
import type { CollapseCause } from '../../sim/collapseSolver'
import { CollapseChain } from './CollapseChain'
import { severityOf } from '../../utils/severity'
import { Button, Chip, Dialog, DialogActions, Field, Icon, type IconName, LinearProgress } from '@/components/ui'
import { ScoreBar, ScoreGauge } from './ScoreGauge'
import { fmt, kN, mm, money, percent } from '../../utils/format'
import { MAX_ALLOWABLE_COST } from '../../analysis/scoring'
import { useT, type TFunction, type TranslationKey } from '../../i18n'

/**
 * The post-test report.
 *
 * A failed test is the most instructive moment in the app, so this is where the
 * detail lives: which member let go, what kind of failure, how the numbers
 * compared with capacity, what else was close behind, and what the supports
 * were carrying at that instant. "Show me in 3D" answers the obvious follow-up
 * question — *where* is member #23?
 */

type Tab = 'summary' | 'members' | 'reactions' | 'score'

const TABS: { id: Tab; label: TranslationKey; icon: IconName }[] = [
  { id: 'summary', label: 'dialog.tabSummary', icon: 'info' },
  { id: 'members', label: 'dialog.tabMembers', icon: 'analytics' },
  { id: 'reactions', label: 'dialog.tabReactions', icon: 'support' },
  { id: 'score', label: 'dialog.tabScore', icon: 'checkCircle' },
]

function toneForRatio(ratio: number) {
  if (ratio >= 1) return 'danger' as const
  if (ratio >= 0.85) return 'caution' as const
  if (ratio >= 0.6) return 'primary' as const
  return 'safe' as const
}

/**
 * Tailwind extracts class names statically, so these are written out in full —
 * a template like `text-${tone}` compiles to nothing.
 */
const RATIO_TEXT = {
  danger: 'text-error',
  caution: 'text-caution',
  primary: 'text-primary',
  safe: 'text-safe',
} as const

function MemberRow({
  m,
  highlight,
  t,
  onShow,
}: {
  m: MemberDiagnostic
  highlight: boolean
  t: TFunction
  onShow: (index: number) => void
}) {
  const tone = toneForRatio(m.ratio)
  const compression = m.force < 0
  return (
    <tr
      className={`border-b border-outline-variant/60 last:border-0 ${
        highlight ? 'bg-error-container/30' : ''
      }`}
    >
      <td className="py-2 pr-2">
        <button
          type="button"
          onClick={() => onShow(m.index)}
          title={t('dialog.showIn3dHint')}
          className="state-layer flex items-center gap-1.5 rounded-xs px-1 py-0.5"
        >
          {highlight && <Icon name="error" size={14} className="text-error" />}
          <span className="font-mono font-medium text-on-surface">{m.label}</span>
          <Icon name="target" size={13} className="text-on-surface-variant" />
        </button>
        <div className="type-label-s pl-1 text-on-surface-variant">{t(ROLE_KEY[m.role])}</div>
      </td>
      <td className="py-2 pr-2">
        <div className="type-body-s text-on-surface">{m.sectionName}</div>
        <div className="type-label-s text-on-surface-variant">
          {m.from.label}–{m.to.label} · {fmt(m.length, 2)} m
        </div>
      </td>
      <td className="py-2 pr-2 text-right font-mono tabular-nums">
        <div className={compression ? 'text-compression' : 'text-tension'}>
          {compression ? '−' : '+'}
          {fmt(Math.abs(kN(m.force)), 1)}
        </div>
        <div className="type-label-s text-on-surface-variant">
          / {fmt(kN(m.capacity), 0)} kN
        </div>
      </td>
      <td className="w-32 py-2 pl-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={`font-mono text-[13px] tabular-nums ${RATIO_TEXT[tone]}`}>
            {percent(m.ratio)}
          </span>
          {/* The band name is what a student can actually reason about. */}
          <span
            className={`type-label-s rounded-xs px-1.5 py-0.5 ${severityOf(m.ratio).chip}`}
          >
            {t(severityOf(m.ratio).key)}
          </span>
        </div>
        <LinearProgress value={m.ratio} tone={tone} />
        <div className="type-label-s mt-0.5 text-on-surface-variant">
          {t(GOVERNED_KEY[m.governedBy])}
        </div>
      </td>
    </tr>
  )
}

export function TestResultDialog({
  open,
  diagnostics,
  result,
  totalCost,
  design,
  deckY,
  collapseLog,
  onBackToDesign,
  onClose,
  onGenerateReport,
  onShowIn3D,
}: {
  open: boolean
  diagnostics: TestDiagnostics | null
  result: TestResult | null
  totalCost: number
  design: BridgeDesign
  deckY: number
  collapseLog: { memberIndex: number; time: number; cause: CollapseCause }[]
  onBackToDesign: () => void
  onClose: () => void
  onGenerateReport: () => void
  onShowIn3D: (memberIndex: number) => void
}) {
  const t = useT()
  const [tab, setTab] = useState<Tab>('summary')

  if (!open || !diagnostics || !result) return null
  const { passed, failed, loadCase, deflection } = diagnostics

  return (
    <Dialog open onClose={onClose} labelledBy="test-result-title" width="min(46rem, 96vw)">
      {/* --- header ------------------------------------------------------- */}
      <header
        className={`flex shrink-0 items-start gap-4 px-6 pb-4 pt-6 ${
          passed ? 'bg-tertiary-container' : 'bg-error-container'
        }`}
      >
        <span
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            passed ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'
          }`}
        >
          <Icon name={passed ? 'checkCircle' : 'error'} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`type-label-m uppercase ${
              passed ? 'text-on-tertiary-container/80' : 'text-on-error-container/80'
            }`}
          >
            {passed ? t('results.passed') : t('results.failed')}
          </div>
          <h2
            id="test-result-title"
            className={`type-headline-s mt-0.5 ${
              passed ? 'text-on-tertiary-container' : 'text-on-error-container'
            }`}
          >
            {diagnostics.headline}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`font-mono text-3xl font-semibold tabular-nums ${
              passed ? 'text-on-tertiary-container' : 'text-on-error-container'
            }`}
          >
            {result.score}
          </div>
          <div
            className={`type-label-s uppercase ${
              passed ? 'text-on-tertiary-container/70' : 'text-on-error-container/70'
            }`}
          >
            {t('results.scoreOf')}
          </div>
        </div>
      </header>

      {/* --- tabs ---------------------------------------------------------- */}
      <nav className="flex shrink-0 overflow-x-auto border-b border-outline-variant bg-surface-container-high px-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`state-layer type-label-l relative flex shrink-0 items-center gap-1.5 px-4 py-3 transition-colors ${
              tab === item.id ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Icon name={item.icon} size={16} />
            {t(item.label)}
            {tab === item.id && (
              <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      {/* --- body ---------------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {tab === 'summary' && (
          <div className="space-y-5">
            <p className="type-body-m text-on-surface-variant">{diagnostics.explanation}</p>

            {failed && (
              <section className="rounded-md border border-error/40 bg-error-container/20 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Icon name="bolt" size={16} className="text-error" />
                  <h3 className="type-title-s text-on-surface">{t('dialog.failedMember')}</h3>
                  <Chip label={t(GOVERNED_KEY[failed.governedBy])} tone="danger" />
                  <span className="flex-1" />
                  {/*
                    "#23" alone tells a student nothing. This rewinds to the
                    instant before the break, marks the member in the 3D scene
                    and flies the camera to it.
                  */}
                  <Button
                    variant="danger"
                    icon="target"
                    onClick={() => onShowIn3D(failed.index)}
                    title={t('dialog.showIn3dHint')}
                  >
                    {t('dialog.showIn3d')}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <Field
                    label={t('dialog.member')}
                    value={`${failed.label} · ${t(ROLE_KEY[failed.role])}`}
                    mono={false}
                  />
                  <Field label={t('dialog.sectionCol')} value={failed.sectionName} mono={false} />
                  <Field label={t('dialog.material')} value={failed.materialName} mono={false} />
                  <Field
                    label={t('dialog.betweenJoints')}
                    value={`${failed.from.label} → ${failed.to.label}`}
                  />
                  <Field label={t('dialog.length')} value={`${fmt(failed.length, 2)} m`} />
                  <Field
                    label={t('dialog.axial')}
                    value={`${failed.force < 0 ? '−' : '+'}${fmt(Math.abs(kN(failed.force)), 1)} kN`}
                    tone={failed.force < 0 ? 'danger' : 'primary'}
                  />
                  <Field label={t('dialog.capacity')} value={`${fmt(kN(failed.capacity), 1)} kN`} />
                  <Field label={t('dialog.utilisation')} value={percent(failed.ratio)} tone="danger" />
                  <Field
                    label={t('dialog.stress')}
                    value={`${fmt(Math.abs(failed.stress) / 1e6, 0)} MPa`}
                  />
                  <Field label={t('dialog.pcr')} value={`${fmt(kN(failed.pcr), 1)} kN`} />
                  <Field label={t('dialog.slenderness')} value={fmt(failed.slenderness, 0)} />
                  <Field
                    label={t('dialog.location')}
                    value={`x ${fmt(failed.from.x, 1)}–${fmt(failed.to.x, 1)} m`}
                  />
                </div>
              </section>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-surface-container p-4">
                <h3 className="type-title-s mb-3 flex items-center gap-2 text-on-surface">
                  <Icon name="truck" size={16} className="text-on-surface-variant" />
                  {t('dialog.loadCase')}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label={t('dialog.combination')} value={loadCase.combination} mono={false} />
                  <Field label={t('dialog.vehicle')} value={loadCase.vehicleName} mono={false} />
                  <Field
                    label={t('dialog.liveLoad')}
                    value={`${fmt(kN(loadCase.liveLoadN), 0)} kN`}
                  />
                  <Field
                    label={t('dialog.windCol')}
                    value={
                      loadCase.windSpeedKmh > 0
                        ? `${loadCase.windSpeedKmh} km/h`
                        : t('dialog.none')
                    }
                  />
                  <Field
                    label={t('dialog.vehiclePosition')}
                    value={`${fmt(loadCase.vehicleX, 2)} m`}
                    tone={loadCase.onBridge ? 'primary' : 'default'}
                  />
                  <Field
                    label={t('dialog.loadStep')}
                    value={`${loadCase.step} / ${loadCase.totalSteps}`}
                  />
                </div>
              </div>

              <div className="rounded-md bg-surface-container p-4">
                <h3 className="type-title-s mb-3 flex items-center gap-2 text-on-surface">
                  <Icon name="deflection" size={16} className="text-on-surface-variant" />
                  {t('dialog.deflectionTitle')}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field
                    label={t('dialog.peak')}
                    value={`${fmt(mm(deflection.peak), 1)} mm`}
                    tone={deflection.peak > deflection.limit ? 'danger' : 'safe'}
                  />
                  <Field label={t('dialog.limit')} value={`${fmt(mm(deflection.limit), 0)} mm`} />
                  <Field label={t('results.atJoint')} value={deflection.nodeLabel} />
                  <Field label={t('dialog.position')} value={`x ${fmt(deflection.x, 1)} m`} />
                  <Field
                    label={t('dialog.spanRatio')}
                    value={
                      Number.isFinite(deflection.spanRatio)
                        ? `1 / ${Math.round(deflection.spanRatio)}`
                        : '—'
                    }
                  />
                  <Field
                    label={t('dialog.serviceability')}
                    value={
                      deflection.peak > deflection.limit
                        ? t('dialog.exceeded')
                        : t('dialog.withinLimit')
                    }
                    tone={deflection.peak > deflection.limit ? 'danger' : 'safe'}
                    mono={false}
                  />
                </div>
              </div>
            </section>

            <CollapseChain log={collapseLog} design={design} deckY={deckY} />

            <section className="rounded-md border border-outline-variant p-4">
              <h3 className="type-title-s mb-2 flex items-center gap-2 text-on-surface">
                <Icon name="science" size={16} className="text-tertiary" />
                {t('dialog.advice')}
              </h3>
              <ul className="space-y-1.5">
                {diagnostics.advice.map((a, i) => (
                  <li key={i} className="type-body-m flex gap-2 text-on-surface-variant">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-tertiary" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'members' && (
          <div>
            <p className="type-body-s mb-3 text-on-surface-variant">{t('dialog.membersIntro')}</p>
            <div className="max-h-[55vh] overflow-y-auto pr-1 border rounded-md border-outline-variant/60">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-surface-container-high z-10">
                  <tr className="type-label-s border-b border-outline text-left uppercase text-on-surface-variant">
                    <th className="py-2.5 px-3 font-medium">{t('dialog.member')}</th>
                    <th className="py-2.5 pr-2 font-medium">{t('dialog.sectionCol')}</th>
                    <th className="py-2.5 pr-2 text-right font-medium">{t('dialog.force')}</th>
                    <th className="py-2.5 pl-1 pr-3 font-medium">{t('dialog.utilisation')}</th>
                  </tr>
                </thead>
                <tbody className="type-body-s divide-y divide-outline-variant/40">
                  {diagnostics.ranked.map((m) => (
                    <MemberRow
                      key={m.index}
                      m={m}
                      highlight={failed?.index === m.index}
                      t={t}
                      onShow={onShowIn3D}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reactions' && (
          <div>
            <p className="type-body-s mb-3 text-on-surface-variant">{t('dialog.reactionsIntro')}</p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="type-label-s border-b border-outline text-left uppercase text-on-surface-variant">
                  <th className="pb-2 font-medium">{t('dialog.joint')}</th>
                  <th className="pb-2 font-medium">{t('dialog.type')}</th>
                  <th className="pb-2 text-right font-medium">x (m)</th>
                  <th className="pb-2 text-right font-medium">{t('dialog.horizontal')}</th>
                  <th className="pb-2 text-right font-medium">{t('dialog.vertical')}</th>
                  <th className="pb-2 text-right font-medium">{t('dialog.resultant')}</th>
                </tr>
              </thead>
              <tbody className="type-body-s font-mono tabular-nums">
                {diagnostics.reactions.map((r) => (
                  <tr
                    key={r.nodeLabel}
                    className="border-b border-outline-variant/60 last:border-0"
                  >
                    <td className="py-2 font-medium text-on-surface">{r.nodeLabel}</td>
                    <td className="py-2 capitalize text-on-surface-variant">{r.support}</td>
                    <td className="py-2 text-right text-on-surface-variant">{fmt(r.x, 2)}</td>
                    <td className="py-2 text-right text-on-surface">{fmt(kN(r.fx), 2)} kN</td>
                    <td className="py-2 text-right text-on-surface">{fmt(kN(r.fy), 2)} kN</td>
                    <td className="py-2 text-right font-medium text-primary">
                      {fmt(kN(r.magnitude), 2)} kN
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'score' && (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <ScoreGauge score={result.score} label={t('results.score')} />
            </div>
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <ScoreBar
                  label={t('results.efficiency')}
                  value={result.scoreBreakdown.efficiency}
                  max={40}
                  color="var(--color-primary)"
                />
                <ScoreBar
                  label={t('results.costFactor')}
                  value={result.scoreBreakdown.cost}
                  max={30}
                  color="var(--color-tertiary)"
                />
                <ScoreBar
                  label={`${t('results.pass')} / ${t('results.fail')}`}
                  value={result.scoreBreakdown.passFail}
                  max={30}
                  color={passed ? 'var(--color-safe)' : 'var(--color-danger)'}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-surface-container p-4">
                <Field
                  label={t('results.capacity')}
                  value={`${fmt(kN(result.capacityLoad), 1)} kN`}
                />
                <Field
                  label={t('results.selfWeight')}
                  value={`${fmt(kN(result.selfWeightN), 1)} kN`}
                />
                <Field label={t('results.efficiency')} value={fmt(result.efficiency, 2)} />
                <Field label={t('results.costFactor')} value={percent(result.costFactor)} />
                <Field label={t('dialog.totalCost')} value={money(totalCost)} />
                <Field label={t('dialog.budget')} value={money(MAX_ALLOWABLE_COST)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogActions>
        <Button variant="text" icon="description" onClick={onGenerateReport}>
          {t('results.export')}
        </Button>
        <Button variant="text" onClick={onClose}>
          {t('dialog.stayIn3d')}
        </Button>
        <Button variant="filled" icon="restart" onClick={onBackToDesign} className="!bg-amber-600 hover:!bg-amber-500 !text-white">
          Ko'prikni tiklash
        </Button>
      </DialogActions>
    </Dialog>
  )
}
