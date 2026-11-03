import { useEffect } from 'react'
import { readDeviceHints } from '../lib/device'
import { detectInitialTier } from '../lib/quality'
import { useHeroStore } from '../store/useHeroStore'
import type { QualityTier } from '../types/scene'

/**
 * Menentukan tier awal dari perangkat, lalu menyerahkan kendali
 * berikutnya ke AdaptiveQuality (pengukuran FPS di dalam Canvas).
 */
export function usePerformanceTier(): QualityTier {
  const tier = useHeroStore((state) => state.tier)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const setTier = useHeroStore((state) => state.setTier)

  useEffect(() => {
    if (reducedMotion) {
      setTier('low')
      return
    }
    setTier(detectInitialTier(readDeviceHints()))
  }, [reducedMotion, setTier])

  return tier
}
