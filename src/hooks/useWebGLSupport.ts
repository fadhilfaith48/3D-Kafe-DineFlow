import { useEffect, useState } from 'react'
import { isWebGLAvailable } from '../lib/device'
import { useHeroStore } from '../store/useHeroStore'

/** Memeriksa dukungan WebGL sebelum memasang Canvas 3D. */
export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState(() => isWebGLAvailable())
  const setWebglSupported = useHeroStore((state) => state.setWebglSupported)

  useEffect(() => {
    setWebglSupported(supported)
    // Pemeriksaan ulang sekali setelah mount: sebagian browser
    // baru menyiapkan konteks GPU setelah event pertama.
    if (!supported) {
      const retry = window.setTimeout(() => {
        const second = isWebGLAvailable()
        if (second) setSupported(true)
      }, 1200)
      return () => window.clearTimeout(retry)
    }
  }, [supported, setWebglSupported])

  return supported
}
