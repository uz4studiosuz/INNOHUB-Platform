import { useState } from 'react'
import { useBridgeStore } from '../store/useBridgeStore'
import { Button, Dialog, DialogActions, Icon, type IconName } from '@/components/ui'
import { useT, type TranslationKey } from '../i18n'

const STEPS: {
  icon: IconName
  title: TranslationKey
  body: TranslationKey
  tip: TranslationKey
}[] = [
  { icon: 'science', title: 'tutorial.t1', body: 'tutorial.b1', tip: 'tutorial.p1' },
  { icon: 'member', title: 'tutorial.t2', body: 'tutorial.b2', tip: 'tutorial.p2' },
  { icon: 'warning', title: 'tutorial.t3', body: 'tutorial.b3', tip: 'tutorial.p3' },
  { icon: 'layers', title: 'tutorial.t4', body: 'tutorial.b4', tip: 'tutorial.p4' },
  { icon: 'truck', title: 'tutorial.t5', body: 'tutorial.b5', tip: 'tutorial.p5' },
]

export function Tutorial() {
  const t = useT()
  const show = useBridgeStore((s) => s.showTutorial)
  const setShow = useBridgeStore((s) => s.setShowTutorial)
  const [index, setIndex] = useState(0)

  const close = () => {
    setShow(false)
    setIndex(0)
  }

  if (!show) return null
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  return (
    <Dialog open onClose={close} labelledBy="tutorial-title" width="min(32rem, 94vw)">
      <div className="px-6 pb-2 pt-6">
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= index ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            />
          ))}
        </div>

        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
          <Icon name={step.icon} size={26} />
        </span>

        <h2 id="tutorial-title" className="type-headline-s text-on-surface">
          {t(step.title)}
        </h2>
        <p className="type-body-m mt-2 text-on-surface-variant">{t(step.body)}</p>

        <p className="type-body-s mt-4 flex items-start gap-2 rounded-sm bg-surface-container-highest p-3 text-on-surface-variant">
          <Icon name="info" size={16} className="mt-px shrink-0 text-primary" />
          {t(step.tip)}
        </p>
      </div>

      <DialogActions>
        <Button variant="text" onClick={close}>
          {t('tutorial.skip')}
        </Button>
        <span className="flex-1" />
        <Button
          variant="text"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          {t('tutorial.back')}
        </Button>
        <Button variant="filled" onClick={() => (last ? close() : setIndex((i) => i + 1))}>
          {last ? t('tutorial.start') : t('tutorial.next')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
