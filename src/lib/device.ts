import type { DeviceHints } from '../types/scene'

/** Membaca kemampuan kasar perangkat dari API browser. */
export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    cores: nav.hardwareConcurrency ?? 4,
    memory: nav.deviceMemory ?? 4,
    width: window.innerWidth,
    touch: window.matchMedia('(pointer: coarse)').matches,
  }
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}
