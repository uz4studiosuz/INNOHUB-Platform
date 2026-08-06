import { useEffect, useRef, useState } from 'react'

/** Track a DOM element's content box, for canvases that must fill their pane. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ width: Math.round(box.width), height: Math.round(box.height) })
    })
    observer.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  return { ref, ...size }
}
