import { type ReactNode, Suspense, lazy, useEffect, useState } from 'react'
import { useBridgeStore } from './store/useBridgeStore'
import { useSyncPlatformLocale } from './i18n'
import { useSolver } from './analysis/useSolver'
import { TopBar } from './components/panels/TopBar'
import { LeftPanel } from './components/panels/LeftPanel'
import { RightPanel } from './components/panels/RightPanel'
import { StatusBar } from './components/panels/StatusBar'
import { Canvas2D } from './components/design2d/Canvas2D'
import { Hud } from './components/sim3d/Hud'
import { Tutorial } from './components/Tutorial'

import { FloatingToolbar } from './components/panels/FloatingToolbar'

// The app opens in the 2D editor, and three.js + drei are by far the largest
// thing we ship. Splitting the 3D scene out keeps the initial load to the
// editor alone and pulls the renderer in only when the user opens a 3D view.
const Scene3D = lazy(() =>
  import('./components/sim3d/Scene3D').then((m) => ({ default: m.Scene3D })),
)

function SceneFallback() {
  return (
    <div className="type-body-m flex h-full w-full items-center justify-center bg-surface text-on-surface-variant">
      Loading 3D scene…
    </div>
  )
}

export function App({ appBarLeading }: { appBarLeading?: ReactNode } = {}) {
  // The top app bar's UZ / RU / EN switch drives this module too.
  useSyncPlatformLocale()

  const view = useBridgeStore((s) => s.view)
  const setTool = useBridgeStore((s) => s.setTool)
  const undo = useBridgeStore((s) => s.undo)
  const redo = useBridgeStore((s) => s.redo)
  const select = useBridgeStore((s) => s.select)
  const setPendingNode = useBridgeStore((s) => s.setPendingNode)

  const { runTest } = useSolver()

  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // Panel visibility by view mode: 2D defaults left open, 3D defaults right open
  useEffect(() => {
    if (view === '3d') {
      setLeftOpen(false)
      setRightOpen(true)
    } else if (view === '2d') {
      setLeftOpen(true)
    }
  }, [view])

  // Global hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo()
        else undo()
        e.preventDefault()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo()
        e.preventDefault()
        return
      }

      if (e.key === 'Escape') {
        select({ nodeId: null, memberId: null })
        setPendingNode(null)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useBridgeStore.getState()
        if (state.selectedMemberId) state.deleteMember(state.selectedMemberId)
        else if (state.selectedNodeId) state.deleteNode(state.selectedNodeId)
        return
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select')
          break
        case 'n':
          setTool('node')
          break
        case 'm':
          setTool('member')
          break
        case 'd':
          setTool('delete')
          break
        case 'p':
          setTool('paint')
          break
        case 's':
          setTool('support')
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setTool, undo, redo, select, setPendingNode])

  return (
    <div className="md3-scope flex h-full w-full select-none flex-col overflow-hidden bg-surface-container-low font-sans text-on-surface">
      <TopBar
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        leading={appBarLeading}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <LeftPanel collapsed={!leftOpen} />

        <main className="relative flex flex-1 overflow-hidden bg-surface">
          {view === '2d' && (
            <div className="relative h-full w-full">
              <Canvas2D />
              <FloatingToolbar />
            </div>
          )}
          {view === '3d' && (
            <div className="relative h-full w-full">
              <Suspense fallback={<SceneFallback />}>
                <Scene3D />
              </Suspense>
              <div className="pointer-events-none absolute inset-0">
                <Hud />
              </div>
            </div>
          )}
          {view === 'split' && (
            <div className="flex h-full w-full">
              <div className="relative h-full w-1/2 border-r border-outline-variant">
                <Canvas2D />
                <FloatingToolbar />
              </div>
              <div className="relative h-full w-1/2">
                <Suspense fallback={<SceneFallback />}>
                  <Scene3D />
                </Suspense>
                <div className="pointer-events-none absolute inset-0">
                  <Hud />
                </div>
              </div>
            </div>
          )}
        </main>

        <RightPanel collapsed={!rightOpen} runTest={runTest} />
      </div>

      <StatusBar />
      <Tutorial />
    </div>
  )
}

export default App
