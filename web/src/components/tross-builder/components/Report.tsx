/**
 * Client-side PDF report (spec 6.3).
 *
 * Screenshots come straight from the two canvases already on screen — the R3F
 * canvas is created with `preserveDrawingBuffer` so `toDataURL` works, and
 * Konva exposes the same on its stage. No html2canvas pass and no server.
 */

import type { jsPDF } from 'jspdf'
import { useBridgeStore } from '../store/useBridgeStore'
import { useAnalysisStore } from '../store/useAnalysisStore'
import { MATERIALS, getSection } from '../data/materials'
import { MAX_ALLOWABLE_COST } from '../analysis/scoring'
import { captureTargets } from '../utils/captureTargets'
import { buildDiagnostics } from '../analysis/diagnostics'
import { vehicleSpec } from '../analysis/useSolver'
import { translate, useI18nStore } from '../i18n'
import type { MaterialId } from '../types'
import { fmtkNWithMass } from '../utils/format'

const MARGIN = 14

function safeDataUrl(getter: () => string | null): string | null {
  try {
    return getter()
  } catch {
    // A tainted or zero-sized canvas should not sink the whole export.
    return null
  }
}

export async function generateReport() {
  const { design, load } = useBridgeStore.getState()
  const { live, result, test } = useAnalysisStore.getState()
  const isUz = useI18nStore.getState().locale === 'uz'

  // jsPDF is a few hundred kB and only ever needed when the user actually
  // exports, so it is pulled in on demand rather than shipped in the entry.
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN

  // --- header --------------------------------------------------------------
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text(
    isUz ? 'BridgeCraft Studio — Loyiha Hisobot Hujjati' : 'BridgeCraft Studio — Design Report',
    MARGIN,
    15,
  )
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text(new Date().toLocaleString(), pageW - MARGIN, 15, { align: 'right' })
  y = 32

  doc.setTextColor(15, 23, 42)

  // --- 3D screenshot -------------------------------------------------------
  const canvas3d = captureTargets.scene3d
  const shot = safeDataUrl(() => canvas3d?.toDataURL('image/jpeg', 0.85) ?? null)
  if (shot && canvas3d) {
    const w = pageW - MARGIN * 2
    const h = Math.min(78, (w * canvas3d.height) / canvas3d.width)
    doc.addImage(shot, 'JPEG', MARGIN, y, w, h)
    y += h + 4
  } else {
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(
      isUz
        ? '3D tasvir olingani yo\'q — hisobot yaratishdan oldin 3D Simulyatsiya sahifasini oching.'
        : 'No 3D render captured — open the 3D Simulation tab before generating the report.',
      MARGIN,
      y,
    )
    doc.setTextColor(15, 23, 42)
    y += 7
  }

  // --- 2D diagram ----------------------------------------------------------
  const stage = captureTargets.stage2d
  const diagram = safeDataUrl(
    () => stage?.toDataURL({ pixelRatio: 1.5, mimeType: 'image/jpeg', quality: 0.85 }) ?? null,
  )
  if (diagram && stage) {
    const w = pageW - MARGIN * 2
    const h = Math.min(62, (w * stage.height()) / stage.width())
    doc.setFontSize(10)
    doc.text(isUz ? 'Fasad ko\'rinishi — 2D loyiha' : 'Elevation — 2D design', MARGIN, y + 4)
    y += 6
    doc.addImage(diagram, 'JPEG', MARGIN, y, w, h)
    y += h + 6
  }

  // --- geometry summary ----------------------------------------------------
  doc.setFontSize(11)
  doc.text(isUz ? 'Geometriya parametrlari' : 'Geometry', MARGIN, y)
  y += 5
  doc.setFontSize(9)
  const geometry: [string, string][] = isUz
    ? [
        ['To\'liq oraliq (Span)', `${design.span.toFixed(2)} m`],
        ['Suvdan balandlik', `${design.clearance.toFixed(2)} m`],
        ['Tugunlar soni', String(design.nodes.length)],
        ['Sterjenlar soni', String(design.members.length)],
        [
          'Statik aniqlik',
          live ? `m + r − 2j = ${live.summary.determinacy}` : '—',
        ],
        ['Mustahkamlik holati', live?.ok ? 'Barqaror (Mustahkam)' : (live?.message ?? 'Buzilgan')],
      ]
    : [
        ['Clear span', `${design.span.toFixed(2)} m`],
        ['Clearance to water', `${design.clearance.toFixed(2)} m`],
        ['Joints', String(design.nodes.length)],
        ['Members', String(design.members.length)],
        [
          'Static determinacy',
          live ? `m + r − 2j = ${live.summary.determinacy}` : '—',
        ],
        ['Stability', live?.ok ? 'Stable' : (live?.message ?? 'Unknown')],
      ]
  y = twoColumn(doc, geometry, y, pageW)

  // --- material take-off ---------------------------------------------------
  y += 4
  doc.setFontSize(11)
  doc.text(isUz ? 'Materiallar sarfi' : 'Material take-off', MARGIN, y)
  y += 5
  doc.setFontSize(8)

  const header = isUz
    ? ['Material', 'Profil kesimi', 'Soni', 'Uzunlik (m)', 'Massa (kg)', 'Narx ($)']
    : ['Material', 'Section', 'Qty', 'Length (m)', 'Mass (kg)', 'Cost ($)']
  const colX = [MARGIN, MARGIN + 28, MARGIN + 64, MARGIN + 78, MARGIN + 104, MARGIN + 132]
  doc.setFont('helvetica', 'bold')
  header.forEach((h, i) => doc.text(h, colX[i], y))
  doc.setFont('helvetica', 'normal')
  y += 4

  // Group identical material/section pairs into a schedule.
  const groups = new Map<
    string,
    { material: MaterialId; section: string; count: number; length: number; mass: number; cost: number }
  >()
  design.members.forEach((m, i) => {
    const key = `${m.materialId}|${m.sectionId}`
    const sec = getSection(m.sectionId)
    const mat = MATERIALS[m.materialId]
    const len = live?.summary.lengths[i] ?? 0
    const kg = mat.density * sec.area * len
    const entry = groups.get(key) ?? {
      material: m.materialId,
      section: sec.name,
      count: 0,
      length: 0,
      mass: 0,
      cost: 0,
    }
    entry.count += 1
    entry.length += len
    entry.mass += kg
    entry.cost += kg * mat.costPerKg
    groups.set(key, entry)
  })

  for (const g of groups.values()) {
    const row = [
      MATERIALS[g.material].name,
      g.section,
      String(g.count),
      g.length.toFixed(2),
      g.mass.toFixed(1),
      g.cost.toFixed(0),
    ]
    row.forEach((cell, i) => doc.text(cell, colX[i], y))
    y += 4
    if (y > 268) {
      doc.addPage()
      y = MARGIN
    }
  }

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.text(
    isUz ? 'Jami struktura og\'irligi (paluba bilan)' : 'Structure total (incl. deck slab)',
    colX[0],
    y,
  )
  doc.text(`${(live?.summary.totalMass ?? 0).toFixed(0)} kg`, colX[4], y)
  doc.text(`$${(live?.summary.totalCost ?? 0).toFixed(0)}`, colX[5], y)
  doc.setFont('helvetica', 'normal')
  y += 8

  // --- test results --------------------------------------------------------
  if (y > 230) {
    doc.addPage()
    y = MARGIN
  }
  doc.setFontSize(11)
  doc.text(isUz ? 'Yuklama sinovi natijalari' : 'Load test results', MARGIN, y)
  y += 5
  doc.setFontSize(9)

  if (result && test) {
    const diag = buildDiagnostics(
      test,
      design,
      vehicleSpec(load.vehicle, load.customLoad).name,
      load.windEnabled ? load.windSpeed : 0,
      translate,
    )

    if (diag) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(diag.headline, MARGIN, y)
      doc.setFont('helvetica', 'normal')
      y += 5
      doc.setFontSize(8.5)
      const wrapped = doc.splitTextToSize(diag.explanation, pageW - MARGIN * 2)
      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 4 + 3
      doc.setFontSize(9)
    }

    const rows: [string, string][] = isUz
      ? [
          ['Harakatlanuvchi yuk modeli', `${test.steps.length} ta hisoblash nuqtasi`],
          [
            'Yuklama kombinatsiyasi',
            test.liveLoadN > 0 && test.steps.length > 0 ? '1.2 D + 1.6 L (yoki +1.0 W)' : '—',
          ],
          ['Qo\'llanilgan live yuk', fmtkNWithMass(test.liveLoadN)],
          ['Sinov natijasi', result.passed ? 'O\'TDI (MUSTAHKAM)' : 'BUZILDI (YETARLI ERMAS)'],
          ['Buzilish sababi', result.passed ? 'Yo\'q' : result.failureReason],
          ['Maksimal kuchlanish nisbati', `${(result.maxRatio * 100).toFixed(1)} %`],
          ['Eng katta egilish', `${(result.peakDeflection * 1000).toFixed(1)} mm`],
          ['Ruxsat etilgan egilish', `${(test.deflectionLimit * 1000).toFixed(0)} mm`],
          ['Yuk ko\'tarish quvvati', fmtkNWithMass(result.capacityLoad)],
          ['Ko\'prikning o\'z og\'irligi', fmtkNWithMass(result.selfWeightN)],
          ['Samaradorlik (Quvvat / Og\'irlik)', result.efficiency.toFixed(2)],
          ['Byudjet sarfi nisbati', `${(result.costFactor * 100).toFixed(1)} %`],
        ]
      : [
          ['Load model', test.steps.length + ' positions solved'],
          [
            'Load combination',
            test.liveLoadN > 0 && test.steps.length > 0 ? '1.2 D + 1.6 L (or +1.0 W)' : '—',
          ],
          ['Applied live load', fmtkNWithMass(test.liveLoadN)],
          ['Result', result.passed ? 'PASS' : 'FAIL'],
          ['Failure mode', result.passed ? 'None' : result.failureReason],
          ['Max stress ratio', `${(result.maxRatio * 100).toFixed(1)} %`],
          ['Peak deflection', `${(result.peakDeflection * 1000).toFixed(1)} mm`],
          ['Deflection limit', `${(test.deflectionLimit * 1000).toFixed(0)} mm`],
          ['Load capacity', fmtkNWithMass(result.capacityLoad)],
          ['Truss self weight', fmtkNWithMass(result.selfWeightN)],
          ['Efficiency (capacity / self weight)', result.efficiency.toFixed(2)],
          ['Cost factor', `${(result.costFactor * 100).toFixed(1)} %`],
        ]
    y = twoColumn(doc, rows, y, pageW)

    y += 4
    doc.setFontSize(11)
    doc.text(isUz ? 'Ballar taqsimoti' : 'Score breakdown', MARGIN, y)
    y += 5
    doc.setFontSize(9)
    y = twoColumn(
      doc,
      isUz
        ? [
            ['Samaradorlik (maks 40)', result.scoreBreakdown.efficiency.toFixed(1)],
            ['Xarajat (maks 30)', result.scoreBreakdown.cost.toFixed(1)],
            ['Sinovdan o\'tish (maks 30)', result.scoreBreakdown.passFail.toFixed(1)],
            ['Ajratilgan byudjet', `$${MAX_ALLOWABLE_COST.toLocaleString('en-US')}`],
          ]
        : [
            ['Efficiency (max 40)', result.scoreBreakdown.efficiency.toFixed(1)],
            ['Cost (max 30)', result.scoreBreakdown.cost.toFixed(1)],
            ['Pass / Fail (max 30)', result.scoreBreakdown.passFail.toFixed(1)],
            ['Budget', `$${MAX_ALLOWABLE_COST.toLocaleString('en-US')}`],
          ],
      y,
      pageW,
    )

    y += 6
    doc.setFillColor(result.passed ? 34 : 220, result.passed ? 197 : 38, result.passed ? 94 : 38)
    doc.rect(MARGIN, y, 58, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.text(
      isUz ? `UMUMIY BALL  ${result.score} / 100` : `SCORE  ${result.score} / 100`,
      MARGIN + 4,
      y + 9.5,
    )
    doc.setTextColor(15, 23, 42)
    y += 20

    // --- most utilised members -------------------------------------------
    if (diag && diag.ranked.length > 0) {
      if (y > 240) {
        doc.addPage()
        y = MARGIN
      }
      doc.setFontSize(11)
      doc.text(
        isUz ? 'Eng ko\'p yuklangan sterjenlar holati' : 'Member utilisation at the governing position',
        MARGIN,
        y,
      )
      y += 5
      doc.setFontSize(8)

      const cols = [MARGIN, MARGIN + 18, MARGIN + 46, MARGIN + 84, MARGIN + 106, MARGIN + 132, MARGIN + 158]
      doc.setFont('helvetica', 'bold')
      ;(isUz
        ? ['Sterjen', 'Vazifasi', 'Kesimi', 'Kuch kN', 'Quvvat kN', 'Nisbat', 'Chegarasi']
        : ['Member', 'Role', 'Section', 'Force kN', 'Cap. kN', 'Util.', 'Limited by']
      ).forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 4

      for (const m of diag.ranked) {
        if (m.index === diag.failed?.index) {
          doc.setTextColor(190, 26, 26)
          doc.setFont('helvetica', 'bold')
        }
        ;[
          m.label,
          m.role,
          m.sectionName,
          `${m.force < 0 ? '-' : '+'}${Math.abs(m.force / 1000).toFixed(1)}`,
          (m.capacity / 1000).toFixed(1),
          `${(m.ratio * 100).toFixed(0)}%`,
          m.governedBy,
        ].forEach((cell, i) => doc.text(String(cell), cols[i], y))
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'normal')
        y += 4
        if (y > 275) {
          doc.addPage()
          y = MARGIN
        }
      }

      // --- support reactions ---------------------------------------------
      y += 4
      if (y > 250) {
        doc.addPage()
        y = MARGIN
      }
      doc.setFontSize(11)
      doc.text(isUz ? 'Tayanch reaksiyalari (kuchlar)' : 'Support reactions', MARGIN, y)
      y += 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      ;(isUz
        ? ['Tugun', 'Tayanch turi', 'x (m)', 'Gorizontal kN', 'Vertikal kN', 'Natijaviy kN']
        : ['Joint', 'Type', 'x (m)', 'Horizontal kN', 'Vertical kN', 'Resultant kN']
      ).forEach((h, i) => doc.text(h, cols[i], y))
      doc.setFont('helvetica', 'normal')
      y += 4
      for (const r of diag.reactions) {
        ;[
          r.nodeLabel,
          r.support,
          r.x.toFixed(2),
          (r.fx / 1000).toFixed(2),
          (r.fy / 1000).toFixed(2),
          (r.magnitude / 1000).toFixed(2),
        ].forEach((cell, i) => doc.text(String(cell), cols[i], y))
        y += 4
      }

      // --- recommendations -------------------------------------------------
      y += 4
      if (y > 250) {
        doc.addPage()
        y = MARGIN
      }
      doc.setFontSize(11)
      doc.text(isUz ? 'Tavsiyalar va xulosalar' : 'Recommendations', MARGIN, y)
      y += 5
      doc.setFontSize(8.5)
      for (const a of diag.advice) {
        const lines = doc.splitTextToSize(`•  ${a}`, pageW - MARGIN * 2)
        doc.text(lines, MARGIN, y)
        y += lines.length * 4 + 1
      }
    }
  } else {
    doc.setTextColor(120, 120, 120)
    doc.text(
      isUz
        ? 'Ushbu loyiha uchun hali yuklama sinovi o\'tkazilmadi.'
        : 'No load test has been run for this design yet.',
      MARGIN,
      y,
    )
    doc.setTextColor(15, 23, 42)
  }

  // --- footer --------------------------------------------------------------
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      isUz
        ? "Tahlil: 2D tekis sterjenli ferma, to'g'ridan-to'g'ri bikrlik usuli · Eyler bo'yicha egilish K=1.0 · SI birliklari"
        : 'Analysis: 2D pin-jointed truss, direct stiffness method · Euler buckling K=1.0 · SI units',
      MARGIN,
      doc.internal.pageSize.getHeight() - 8,
    )
    doc.text(
      isUz ? `Bet ${p} / ${pages}` : `Page ${p} / ${pages}`,
      pageW - MARGIN,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    )
  }

  const fileName = isUz ? `BridgeCraft_Koprik_Hisoboti_${Date.now()}.pdf` : `BridgeCraft_Report_${Date.now()}.pdf`
  const blob = doc.output('blob')
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
}

/** Label/value pairs laid out in two columns. */
function twoColumn(doc: jsPDF, rows: [string, string][], startY: number, pageW: number) {
  let y = startY
  const colWidth = (pageW - MARGIN * 2) / 2
  rows.forEach((row, i) => {
    const col = i % 2
    const x = MARGIN + col * colWidth
    if (col === 0 && i > 0) y += 4.6
    doc.setTextColor(100, 116, 139)
    doc.text(row[0], x, y)
    doc.setTextColor(15, 23, 42)
    doc.text(row[1], x + colWidth - 4, y, { align: 'right' })
  })
  return y + 5
}
