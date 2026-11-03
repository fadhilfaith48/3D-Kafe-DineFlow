import { useEffect, useState } from 'react'
import { debugStats } from '../lib/scroll'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Panel debug kecil, hanya muncul jika URL memakai ?debug.
 * Membaca statistik dari objek mutable agar tidak memicu render 60fps.
 */
export function DebugPanel() {
  const [enabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('debug'),
  )
  const [stats, setStats] = useState({ ...debugStats })
  const tier = useHeroStore((state) => state.tier)
  const fps = useHeroStore((state) => state.fps)

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setStats({ ...debugStats }), 500)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="pointer-events-none absolute top-4 left-4 z-50 rounded-lg border border-cream/20 bg-ink/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-cream/80 backdrop-blur-sm">
      <p>fps: {stats.fps}</p>
      <p>store fps: {fps}</p>
      <p>tier: {tier}</p>
      <p>draw calls: {stats.drawCalls}</p>
    </div>
  )
}
