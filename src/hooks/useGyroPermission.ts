import { useCallback, useEffect, useRef, useState } from 'react'
import { gyroTilt } from '../lib/scroll'
import { useHeroStore } from '../store/useHeroStore'

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Gyroscope hanya diaktifkan setelah pengguna menekan tombol
 * (iOS Safari mewajibkan permintaan izin di dalam gesture pengguna).
 */
export function useGyroPermission() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
  )
  const enabled = useHeroStore((state) => state.gyroEnabled)
  const setGyroEnabled = useHeroStore((state) => state.setGyroEnabled)
  const [denied, setDenied] = useState(false)

  const enable = useCallback(async () => {
    const events = window.DeviceOrientationEvent as OrientationEventWithPermission | undefined
    if (!events) return false

    if (typeof events.requestPermission === 'function') {
      try {
        const result = await events.requestPermission()
        if (result !== 'granted') {
          setDenied(true)
          return false
        }
      } catch {
        setDenied(true)
        return false
      }
    }

    setDenied(false)
    setGyroEnabled(true)
    return true
  }, [setGyroEnabled])

  const disable = useCallback(() => {
    setGyroEnabled(false)
    gyroTilt.x = 0
    gyroTilt.y = 0
  }, [setGyroEnabled])

  const timeout = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      gyroTilt.x = 0
      gyroTilt.y = 0
      return
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0 // kiri-kanan (-90..90)
      const beta = event.beta ?? 45 // depan-belakang
      gyroTilt.y = Math.max(-1, Math.min(1, gamma / 40))
      gyroTilt.x = Math.max(-1, Math.min(1, (beta - 45) / 40))
    }

    window.addEventListener('deviceorientation', onOrientation)
    // Jika tidak ada data dalam 1,5 detik, anggap tidak tersedia.
    timeout.current = window.setTimeout(() => {
      if (gyroTilt.x === 0 && gyroTilt.y === 0) setDenied(true)
    }, 1500)

    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      if (timeout.current) window.clearTimeout(timeout.current)
    }
  }, [enabled, setDenied])

  return { supported, enabled, denied, enable, disable }
}
