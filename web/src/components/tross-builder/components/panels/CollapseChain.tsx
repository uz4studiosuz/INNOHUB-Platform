import type { BridgeDesign } from '../../types'
import type { CollapseCause } from '../../sim/collapseSolver'
import { ROLE_KEY, roleOfMember } from '../../analysis/diagnostics'
import { Icon, type IconName } from '@/components/ui'
import { useT, type TranslationKey } from '../../i18n'

/**
 * The whole sequence of members lost during a collapse.
 *
 * The old report named only the member that failed first, which made a
 * spectacular multi-member collapse look like a single snapped bar. Seeing the
 * order — and *why* each one went — is what turns the animation into a lesson
 * about load redistribution.
 */

const CAUSE: Record<CollapseCause, { key: TranslationKey; icon: IconName; cls: string }> = {
  trigger: { key: 'collapse.trigger', icon: 'bolt', cls: 'bg-error text-on-error' },
  overload: {
    key: 'collapse.overload',
    icon: 'analytics',
    cls: 'bg-warn/25 text-warn',
  },
  impact: { key: 'collapse.impact', icon: 'weight', cls: 'bg-caution/25 text-caution' },
}

export function CollapseChain({
  log,
  design,
  deckY,
}: {
  log: { memberIndex: number; time: number; cause: CollapseCause }[]
  design: BridgeDesign
  deckY: number
}) {
  const t = useT()
  if (log.length === 0) return null

  const total = design.members.length
  const survived = Math.max(0, total - log.length)

  return (
    <section className="rounded-md border border-outline-variant p-4">
      <h3 className="type-title-s mb-1 flex items-center gap-2 text-on-surface">
        <Icon name="layers" size={16} className="text-error" />
        {t('collapse.title')}
      </h3>
      <p className="type-body-s mb-3 text-on-surface-variant">{t('collapse.intro')}</p>

      <ol className="space-y-1.5">
        {log.map((entry, i) => {
          const member = design.members[entry.memberIndex]
          if (!member) return null
          const role = roleOfMember(design, entry.memberIndex, deckY)
          const cause = CAUSE[entry.cause]
          return (
            <li
              key={`${entry.memberIndex}-${i}`}
              className="flex items-center gap-2.5 rounded-sm bg-surface-container px-2.5 py-2"
            >
              <span className="type-label-s w-5 shrink-0 text-right font-mono text-on-surface-variant">
                {i + 1}
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cause.cls}`}
              >
                <Icon name={cause.icon} size={13} />
              </span>
              <span className="font-mono text-[13px] font-medium text-on-surface">
                #{entry.memberIndex + 1}
              </span>
              <span className="type-body-s min-w-0 flex-1 truncate text-on-surface-variant">
                {t(ROLE_KEY[role])} · {t(cause.key)}
              </span>
              <span className="type-label-s shrink-0 font-mono tabular-nums text-on-surface-variant">
                {t('collapse.seconds', { s: entry.time.toFixed(1) })}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="type-label-s mt-3 flex flex-wrap gap-x-4 text-on-surface-variant">
        <span>{t('collapse.totalLost', { n: log.length, total })}</span>
        <span>{t('collapse.survived', { n: survived })}</span>
      </p>
    </section>
  )
}
