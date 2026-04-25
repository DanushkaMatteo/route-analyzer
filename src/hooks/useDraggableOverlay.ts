import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

interface OverlayOffset {
  x: number
  y: number
}

const STORAGE_PREFIX = 'overlay-pos:'
const NON_DRAG_SELECTOR =
  'button, input, select, textarea, label, a, svg, [data-no-drag], .saved-route-actions, .timeline'

function readStoredOffset(storageKey: string): OverlayOffset {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 }
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
    if (!raw) {
      return { x: 0, y: 0 }
    }
    const parsed = JSON.parse(raw) as Partial<OverlayOffset>
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    // ignore corrupt entry
  }
  return { x: 0, y: 0 }
}

export function useDraggableOverlay(storageKey: string) {
  const [offset, setOffset] = useState<OverlayOffset>(() =>
    readStoredOffset(storageKey),
  )
  const [isDragging, setIsDragging] = useState(false)
  const offsetRef = useRef(offset)

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${storageKey}`,
        JSON.stringify(offset),
      )
    } catch {
      // localStorage may be unavailable; ignore
    }
  }, [offset, storageKey])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null
    if (target?.closest(NON_DRAG_SELECTOR)) {
      return
    }

    event.preventDefault()
    setIsDragging(true)

    const startX = event.clientX
    const startY = event.clientY
    const baseOffset = offsetRef.current

    const handleMove = (moveEvent: PointerEvent) => {
      setOffset({
        x: baseOffset.x + (moveEvent.clientX - startX),
        y: baseOffset.y + (moveEvent.clientY - startY),
      })
    }

    const handleUp = () => {
      setIsDragging(false)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }, [])

  const style: CSSProperties = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    userSelect: isDragging ? 'none' : undefined,
  }

  return { onPointerDown, style, isDragging }
}
