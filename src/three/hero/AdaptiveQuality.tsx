import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PERFORMANCE } from '../../config/scene'
import { FpsMeter } from '../../lib/fps'
import { TierController } from '../../lib/quality'
import { debugStats } from '../../lib/scroll'
import { useHeroStore } from '../../store/useHeroStore'

/**
 * Memantau FPS dan menurunkan/menaikkan tier kualitas.
 * Berjalan di dalam Canvas supaya bisa memakai useFrame.
 */
export function AdaptiveQuality() {
  const { gl } = useThree()
  const tier = useHeroStore((state) => state.tier)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const setTier = useHeroStore((state) => state.setTier)
  const setFps = useHeroStore((state) => state.setFps)

  const meter = useRef(new FpsMeter())
  const controller = useRef(new TierController(tier, !reducedMotion))
  const accum = useRef(0)

  // Sinkronkan pengendali saat tier berubah dari luar (mis. reduce motion).
  useEffect(() => {
    controller.current = new TierController(tier, !reducedMotion)
    debugStats.tier = tier
  }, [tier, reducedMotion])

  useFrame((_, delta) => {
    const fps = meter.current.update(delta)
    accum.current += delta * 1000

    if (accum.current < PERFORMANCE.sampleMs) return

    const elapsed = accum.current
    accum.current = 0

    const rounded = Math.round(fps)
    debugStats.fps = rounded
    debugStats.drawCalls = gl.info.render.calls
    setFps(rounded)

    const next = controller.current.update(fps, elapsed)
    if (next !== tier) {
      debugStats.tier = next
      setTier(next)
    }
  })

  return null
}
