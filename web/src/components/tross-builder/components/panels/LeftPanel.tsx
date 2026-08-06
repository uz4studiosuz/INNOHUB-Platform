import { useState } from 'react'
import { useBridgeStore } from '../../store/useBridgeStore'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { CROSS_SECTIONS, MATERIAL_LIST, getSection, sectionsFor } from '../../data/materials'
import { PRESETS, type PresetId } from '../../data/presets'
import type { MaterialId } from '../../types'
import { Accordion, Button, Card, Select } from '@/components/ui'
import { MPa, fmt } from '../../utils/format'
import { useT, type TranslationKey } from '../../i18n'

type PanelId = 'material' | 'preset' | 'overlay' | 'grid'

// The tool palette lives in `FloatingToolbar` over the canvas, not here.

const PRESET_LABELS: Record<PresetId, { name: TranslationKey; desc: TranslationKey }> = {
  blank: { name: 'preset.blank', desc: 'preset.blankDesc' },
  warren: { name: 'preset.warren', desc: 'preset.warrenDesc' },
  pratt: { name: 'preset.pratt', desc: 'preset.prattDesc' },
  howe: { name: 'preset.howe', desc: 'preset.howeDesc' },
  ktruss: { name: 'preset.ktruss', desc: 'preset.ktrussDesc' },
  baltimore: { name: 'preset.baltimore', desc: 'preset.baltimoreDesc' },
}

const MATERIAL_LABELS: Record<MaterialId, TranslationKey> = {
  steel: 'material.steel',
  wood: 'material.wood',
  composite: 'material.composite',
}

export function LeftPanel({ collapsed }: { collapsed: boolean }) {
  const t = useT()
  const activeMaterial = useBridgeStore((s) => s.activeMaterial)
  const activeSection = useBridgeStore((s) => s.activeSection)
  const setActiveMaterial = useBridgeStore((s) => s.setActiveMaterial)
  const setActiveSection = useBridgeStore((s) => s.setActiveSection)
  const applyGlobalMaterial = useBridgeStore((s) => s.applyGlobalMaterial)
  const loadPreset = useBridgeStore((s) => s.loadPreset)
  const selectedMemberId = useBridgeStore((s) => s.selectedMemberId)
  const design = useBridgeStore((s) => s.design)
  const paintMember = useBridgeStore((s) => s.paintMember)
  const setGridStep = useBridgeStore((s) => s.setGridStep)

  const live = useAnalysisStore((s) => s.live)

  // Only the section needed to start is open; the rest are one tap away.
  const [open, setOpen] = useState<Record<PanelId, boolean>>({
    material: true,
    preset: false,
    overlay: false,
    grid: false,
  })
  const toggle = (id: PanelId) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  if (collapsed) return null

  const section = getSection(activeSection)
  const material = MATERIAL_LIST.find((m) => m.id === activeMaterial)!
  const selected = design.members.find((m) => m.id === selectedMemberId)
  const selectedIndex = design.members.findIndex((m) => m.id === selectedMemberId)

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low">
      {/* --- selected member: only appears when relevant ------------------ */}
      {selected && (
        <div className="border-b border-outline-variant bg-surface-container px-3 py-3">
          <h3 className="type-title-s mb-2 text-on-surface">
            {t('memberPanel.title', { n: `#${selectedIndex + 1}` })}
          </h3>
          <dl className="space-y-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
            <div className="flex justify-between gap-2">
              <dt>{t('memberPanel.section')}</dt>
              <dd className="truncate text-on-surface">{getSection(selected.sectionId).name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('memberPanel.length')}</dt>
              <dd className="text-on-surface">
                {fmt(live?.summary.lengths[selectedIndex] ?? 0, 2)} m
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('memberPanel.axial')}</dt>
              <dd className="text-on-surface">
                {fmt((live?.forces[selectedIndex] ?? 0) / 1000, 1)} kN
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('memberPanel.utilisation')}</dt>
              <dd className="text-on-surface">
                {fmt((live?.ratios[selectedIndex] ?? 0) * 100, 0)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('memberPanel.pcr')}</dt>
              <dd className="text-on-surface">
                {fmt((live?.summary.pcr[selectedIndex] ?? 0) / 1000, 1)} kN
              </dd>
            </div>
          </dl>
          <Select
            label={t('memberPanel.changeSection')}
            value={selected.sectionId}
            options={CROSS_SECTIONS.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(id) => paintMember(selected.id, getSection(id).materialId, id)}
          />
        </div>
      )}

      {/* --- material ------------------------------------------------------ */}
      <Accordion
        title={t('material.title')}
        icon="layers"
        open={open.material}
        onToggle={() => toggle('material')}
        badge={
          <span
            className="mr-1 h-3.5 w-3.5 rounded-full border border-outline"
            style={{ background: material.color }}
          />
        }
      >
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {MATERIAL_LIST.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMaterial(m.id as MaterialId)}
              className={`state-layer type-label-s rounded-sm border px-1 py-2 transition-colors ${
                activeMaterial === m.id
                  ? 'border-primary bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              <span
                className="mx-auto mb-1.5 block h-2.5 w-full rounded-xs"
                style={{ background: m.color }}
              />
              {t(MATERIAL_LABELS[m.id])}
            </button>
          ))}
        </div>

        <Select
          label={t('material.profile')}
          value={activeSection}
          options={sectionsFor(activeMaterial).map((s) => ({ value: s.id, label: s.name }))}
          onChange={setActiveSection}
        />

        <Card variant="outlined" className="mt-1 !p-2.5">
          <dl className="space-y-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
            <div className="flex justify-between">
              <dt>{t('material.area')}</dt>
              <dd className="text-on-surface">{(section.area * 1e4).toFixed(2)} cm²</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('material.inertiaWeak')}</dt>
              <dd className="text-on-surface">
                {(Math.min(section.Ix, section.Iy) * 1e8).toFixed(1)} cm⁴
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('material.yield')}</dt>
              <dd className="text-on-surface">{MPa(material.fyTension)} MPa</dd>
            </div>
          </dl>
        </Card>

        <Button
          full
          variant="tonal"
          icon="brush"
          className="mt-2"
          onClick={() => applyGlobalMaterial(activeMaterial, activeSection)}
          title={t('material.applyAllHint')}
        >
          {t('material.applyAll')}
        </Button>
      </Accordion>

      {/* --- presets -------------------------------------------------------- */}
      <Accordion
        title={t('preset.title')}
        icon="science"
        open={open.preset}
        onToggle={() => toggle('preset')}
      >
        <div className="space-y-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p.id)}
              className="state-layer w-full rounded-sm px-2.5 py-2 text-left transition-colors"
            >
              <div className="type-label-l text-on-surface">
                {t(PRESET_LABELS[p.id].name)}
              </div>
              <div className="type-label-s text-on-surface-variant">
                {t(PRESET_LABELS[p.id].desc)}
              </div>
            </button>
          ))}
        </div>
      </Accordion>

      {/* --- grid ----------------------------------------------------------- */}
      <Accordion
        title={t('grid.title')}
        icon="ruler"
        open={open.grid}
        onToggle={() => toggle('grid')}
      >
        <Select
          label={t('grid.snap')}
          value={String(design.gridStep)}
          options={[
            { value: '0.25', label: '0.25 m' },
            { value: '0.5', label: '0.5 m' },
            { value: '1', label: '1.0 m' },
          ]}
          onChange={(v) => setGridStep(Number(v))}
        />
      </Accordion>
    </aside>
  )
}
