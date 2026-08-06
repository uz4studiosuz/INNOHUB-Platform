import { useBridgeStore } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { fmt, mm } from '../../utils/format'
import { Icon, type IconName } from '@/components/ui'
import { useT, type TranslationKey } from '../../i18n'

const TOOL_HINTS: Record<string, TranslationKey> = {
  select: 'status.hintSelect',
  node: 'status.hintNode',
  member: 'status.hintMember',
  delete: 'status.hintDelete',
  paint: 'status.hintPaint',
  support: 'status.hintSupport',
}

/** Bottom strip: stability verdict, live solver status, and a contextual hint. */
export function StatusBar() {
  const t = useT()
  const tool = useBridgeStore((s) => s.tool)
  const design = useBridgeStore((s) => s.design)
  const live = useAnalysisStore((s) => s.live)
  const pending = useAnalysisStore((s) => s.pending)

  const stable = live?.ok ?? false
  const determinacy = live?.summary.determinacy ?? 0

  const verdict: { text: string; cls: string; icon: IconName } = !live
    ? {
        text: t('determinacy.analysing'),
        cls: 'bg-surface-container-highest text-on-surface-variant',
        icon: 'info',
      }
    : !stable
      ? { text: live.message, cls: 'bg-error text-on-error', icon: 'error' }
      : determinacy === 0
        ? {
            text: t('determinacy.determinate'),
            cls: 'bg-tertiary-container text-on-tertiary-container',
            icon: 'checkCircle',
          }
        : {
            text: t('determinacy.indeterminate', { n: determinacy }),
            cls: 'bg-primary-container text-on-primary-container',
            icon: 'info',
          }

  return (
    <footer className="type-body-s flex h-9 shrink-0 items-center gap-3 border-t border-outline-variant bg-surface-container px-3 text-on-surface-variant">
      <span
        className={`type-label-m inline-flex max-w-[46ch] items-center gap-1.5 truncate rounded-sm px-2 py-1 ${verdict.cls}`}
      >
        <Icon name={verdict.icon} size={14} />
        <span className="truncate">{verdict.text}</span>
      </span>

      <span className="font-mono tabular-nums">
        {t('status.counts', { j: design.nodes.length, m: design.members.length })}
      </span>

      {live?.ok && (
        <>
          <span className="hidden font-mono tabular-nums sm:inline">
            δmax {fmt(mm(live.maxDisplacement), 1)} mm
          </span>
          <span className="hidden font-mono tabular-nums sm:inline">
            σ/σallow {fmt(live.maxRatio * 100, 0)}%
          </span>
        </>
      )}

      <span className="ml-auto flex items-center gap-2">
        <span className="hidden truncate text-on-surface-variant/70 lg:inline">
          {t(TOOL_HINTS[tool])}
        </span>
        <span
          className={`h-2 w-2 rounded-full ${pending ? 'bg-caution' : 'bg-safe'}`}
          title={
            pending
              ? t('status.solving')
              : t('status.solvedIn', { ms: fmt(live?.solveMs ?? 0, 1) })
          }
        />
        <span className="font-mono tabular-nums">{fmt(live?.solveMs ?? 0, 1)} ms</span>
      </span>
    </footer>
  )
}
