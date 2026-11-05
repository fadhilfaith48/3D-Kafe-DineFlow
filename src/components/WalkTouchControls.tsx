import { useEffect, useRef, useState } from 'react'
import { useHeroStore } from '../store/useHeroStore'
import { joystickToInput, resetTouchInput, touchInput } from '../three/walk/touchInput'

const RADIUS = 40

/**
 * Joystick virtual untuk walk mode di perangkat sentuh.
 * Gerakan jari menulis ke `touchInput` (lihat WalkControls); drag di canvas
 * dipakai untuk memutar pandangan.
 */
export function WalkTouchControls() {
  const mode = useHeroStore((state) => state.mode)
  const [coarse, setCoarse] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches,
  )
  const base = useRef<HTMLDivElement>(null)
  const dragId = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (mode !== 'walk') {
      resetTouchInput()
      setKnob({ x: 0, y: 0 })
      dragId.current = null
    }
  }, [mode])

  useEffect(() => resetTouchInput, [])

  if (mode !== 'walk' || !coarse) return null

  const move = (clientX: number, clientY: number) => {
    const rect = base.current?.getBoundingClientRect()
    if (!rect) return
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    const distance = Math.hypot(dx, dy) || 1
    const scale = Math.min(distance, RADIUS) / distance

    setKnob({ x: dx * scale, y: dy * scale })
    const input = joystickToInput(dx, dy, RADIUS)
    touchInput.x = input.x
    touchInput.y = input.y
  }

  const stop = () => {
    dragId.current = null
    setKnob({ x: 0, y: 0 })
    resetTouchInput()
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <p className="sr-only">
        Geser joystick kiri untuk bergerak dan geser layar untuk melihat sekeliling.
      </p>

      <div
        ref={base}
        role="group"
        aria-label="Joystick gerak"
        className="pointer-events-auto absolute bottom-24 left-5 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-cream/30 bg-ink/55 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm select-none sm:left-8"
        onPointerDown={(event) => {
          event.preventDefault()
          dragId.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          move(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          if (dragId.current !== event.pointerId) return
          event.preventDefault()
          move(event.clientX, event.clientY)
        }}
        onPointerUp={(event) => {
          if (dragId.current === event.pointerId) stop()
        }}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
      >
        <span
          aria-hidden="true"
          className="absolute inset-3 rounded-full border border-cream/15"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-full border border-lamp/60 bg-lamp/25 text-[16px] text-cream shadow"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        >
          ✥
        </span>
      </div>

      <div className="pointer-events-none absolute right-5 bottom-24 rounded-full border border-cream/20 bg-ink/60 px-3 py-1.5 text-[10px] font-medium text-cream/70 backdrop-blur-sm sm:right-8">
        👆 Geser layar untuk lihat
      </div>
    </div>
  )
}
