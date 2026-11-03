import { useEffect, useState } from 'react'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Layar loading minimalis — hanya garis progres tipis, tanpa teks.
 */
export function Loader() {
  const phase = useHeroStore((state) => state.phase)
  const [progress, setProgress] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (phase !== 'loading') return
    const id = window.setInterval(() => {
      setProgress((v) => Math.min(92, v + 3 + Math.random() * 7))
    }, 150)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'loading') { setHidden(false); return }
    setProgress(100)
    const id = window.setTimeout(() => setHidden(true), 700)
    return () => window.clearTimeout(id)
  }, [phase])

  if (hidden) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-40 flex items-end justify-center pb-8 bg-ink transition-opacity duration-700"
      style={{ opacity: phase === 'loading' ? 1 : 0 }}
    >
      <div className="h-[3px] w-56 overflow-hidden rounded-full bg-cream/15">
        <div
          className="h-full rounded-full bg-lamp transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(progress)}%` }}
        />
      </div>
    </div>
  )
}
