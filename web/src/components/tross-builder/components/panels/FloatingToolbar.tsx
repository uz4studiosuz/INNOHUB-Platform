import { useBridgeStore } from '../../store/useBridgeStore'
import type { ToolId } from '../../types'
import { Icon, type IconName } from '@/components/ui'

const TOOLS: { id: ToolId; label: string; icon: IconName; shortcut: string }[] = [
  { id: 'select', label: 'Tanlash', icon: 'select', shortcut: 'V' },
  { id: 'node', label: 'Tugun qo\'shish', icon: 'node', shortcut: 'N' },
  { id: 'member', label: 'Element biriktirish', icon: 'member', shortcut: 'M' },
  { id: 'delete', label: 'O\'chirish', icon: 'delete', shortcut: 'D' },
  { id: 'paint', label: 'Material bo\'yoq', icon: 'brush', shortcut: 'P' },
  { id: 'support', label: 'Tayanch', icon: 'support', shortcut: 'S' },
]

export function FloatingToolbar() {
  const tool = useBridgeStore((s) => s.tool)
  const setTool = useBridgeStore((s) => s.setTool)
  const undo = useBridgeStore((s) => s.undo)
  const redo = useBridgeStore((s) => s.redo)
  const canUndo = useBridgeStore((s) => s.past.length > 0)
  const canRedo = useBridgeStore((s) => s.future.length > 0)

  return (
    <div
      role="toolbar"
      aria-label="Chizma asboblari"
      className="elevation-3 absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-outline-variant/70 bg-surface-container-lowest p-1.5"
    >
      {TOOLS.map((t) => {
        const active = tool === t.id
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`state-layer type-label-l flex h-10 items-center gap-2 rounded-full px-3 transition-colors ${
              active
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant'
            }`}
          >
            <Icon name={t.icon} size={18} />
            <span className="hidden lg:inline">{t.label}</span>
            <kbd
              className={`type-label-s hidden rounded-xs px-1 font-mono lg:inline ${
                active ? 'bg-on-secondary-container/12' : 'bg-surface-container-highest'
              }`}
            >
              {t.shortcut}
            </kbd>
          </button>
        )
      })}

      <div className="mx-1.5 h-6 w-px bg-outline-variant" />

      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        title="Ortga qaytarish (Ctrl+Z)"
        aria-label="Ortga qaytarish"
        className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors disabled:pointer-events-none disabled:opacity-38"
      >
        <Icon name="undo" size={18} />
      </button>

      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        title="Oldinga qaytarish (Ctrl+Y)"
        aria-label="Oldinga qaytarish"
        className="state-layer flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors disabled:pointer-events-none disabled:opacity-38"
      >
        <Icon name="redo" size={18} />
      </button>
    </div>
  )
}
