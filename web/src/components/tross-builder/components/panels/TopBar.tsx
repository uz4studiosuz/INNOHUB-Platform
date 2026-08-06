import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useBridgeStore } from '../../store/useBridgeStore'
import { isAudioEnabled, setAudioEnabled } from '../../sim/audio'
import type { ViewMode } from '../../types'
import { Icon, IconButton, type IconName, SegmentedButtons } from '@/components/ui'
import { useT } from '../../i18n'

function OverlayMenu() {
  const t = useT()
  const overlay = useBridgeStore((s) => s.overlay)
  const setOverlay = useBridgeStore((s) => s.setOverlay)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={t('overlay.title')}
        aria-label={t('overlay.title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`state-layer type-label-l flex h-10 items-center gap-1.5 rounded-full px-3 transition-colors ${
          open ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
        }`}
      >
        <Icon name="layers" size={18} />
        <span className="hidden sm:inline">{t('overlay.title')}</span>
      </button>

      {open && (
        <div className="elevation-3 absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-md bg-surface-container-high p-3 space-y-3 shadow-xl">
          <div className="type-label-m uppercase text-on-surface-variant">
            {t('overlay.title')}
          </div>

          <label className="type-body-m flex cursor-pointer items-center gap-2 text-on-surface">
            <input
              type="checkbox"
              checked={overlay.showForces}
              onChange={(e) => setOverlay({ showForces: e.target.checked })}
              className="accent-primary"
            />
            {t('overlay.forces')}
          </label>

          <label className="type-body-m flex cursor-pointer items-center gap-2 text-on-surface">
            <input
              type="checkbox"
              checked={overlay.showLabels}
              onChange={(e) => setOverlay({ showLabels: e.target.checked })}
              className="accent-primary"
            />
            {t('overlay.labels')}
          </label>

          <label className="type-body-m flex cursor-pointer items-center gap-2 text-on-surface">
            <input
              type="checkbox"
              checked={overlay.showDeflection}
              onChange={(e) => setOverlay({ showDeflection: e.target.checked })}
              className="accent-primary"
            />
            {t('overlay.deflection')}
          </label>

          {overlay.showDeflection && (
            <div className="space-y-1 pt-1">
              <div className="type-body-s flex justify-between text-on-surface-variant">
                <span>{t('overlay.exaggeration')}</span>
                <span className="font-mono">{overlay.deflectionScale}×</span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={overlay.deflectionScale}
                onChange={(e) => setOverlay({ deflectionScale: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TopBar({
  onToggleLeft,
  onToggleRight,
  leftOpen,
  rightOpen,
  leading,
}: {
  onToggleLeft: () => void
  onToggleRight: () => void
  leftOpen: boolean
  rightOpen: boolean
  /** Host-supplied controls, so the page never has to stack a second app bar. */
  leading?: ReactNode
}) {
  const t = useT()
  const view = useBridgeStore((s) => s.view)
  const setView = useBridgeStore((s) => s.setView)
  const setShowTutorial = useBridgeStore((s) => s.setShowTutorial)
  const [sound, setSound] = useState(isAudioEnabled())

  const views: { value: ViewMode; label: string; icon: IconName }[] = [
    { value: '2d', label: t('view.design2d'), icon: 'view2d' },
    { value: '3d', label: t('view.sim3d'), icon: 'view3d' },
    { value: 'split', label: t('view.split'), icon: 'viewSplit' },
  ]

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-outline-variant bg-surface-container px-3">
      <IconButton
        icon="panelLeft"
        title={t('app.toolPanel')}
        selected={leftOpen}
        onClick={onToggleLeft}
      />

      <span className="type-title-m shrink-0 text-on-surface">
        Bridge<span className="text-primary">Craft</span>
      </span>

      {leading}

      <nav className="mx-auto">
        <SegmentedButtons value={view} options={views} onChange={setView} />
      </nav>

      <OverlayMenu />
      <IconButton
        icon={sound ? 'volumeOn' : 'volumeOff'}
        title={t('app.sound')}
        selected={sound}
        onClick={() => {
          const next = !sound
          setSound(next)
          setAudioEnabled(next)
        }}
      />
      <IconButton
        icon="help"
        title={t('app.walkthrough')}
        onClick={() => setShowTutorial(true)}
      />
      <IconButton
        icon="panelRight"
        title={t('app.statsPanel')}
        selected={rightOpen}
        onClick={onToggleRight}
      />
    </header>
  )
}
