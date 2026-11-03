import { PERFORMANCE } from '../config/scene'
import type { DeviceHints, QualityTier, TierConfig } from '../types/scene'

/**
 * Tiga tingkat kualitas. Perubahan hanya di sini agar konsisten
 * dengan anggaran performa di PRD.
 */
export const TIERS: Record<QualityTier, TierConfig> = {
  low: {
    dpr: [1, 1.5],
    shadows: true,
    depthOfField: false,
    bloom: true,
    steamPerCup: 6,
    dust: 36,
    lightShafts: false,
    // Karakter di luar fokus diperbarui tiap 2 frame.
    characterUpdateEvery: 2,
  },
  medium: {
    dpr: [1.5, 2],
    shadows: true,
    depthOfField: false,
    bloom: true,
    steamPerCup: 7,
    dust: 48,
    lightShafts: true,
    characterUpdateEvery: 1,
  },
  high: {
    dpr: [2, 2],
    shadows: true,
    // DOF dimatikan: efek termahal, tidak diperlukan untuk diorama.
    depthOfField: false,
    bloom: true,
    steamPerCup: 9,
    dust: 60,
    lightShafts: true,
    characterUpdateEvery: 1,
  },
}

export const TIER_ORDER: QualityTier[] = ['low', 'medium', 'high']

/** Perkiraan awal berdasarkan informasi perangkat (sebelum FPS diukur). */
export function detectInitialTier(hints: DeviceHints): QualityTier {
  // HP kecil: cukup tier rendah agar baterai & frame rate aman.
  if (hints.touch && hints.width < 768) return 'low'
  // Laptop menengah / perangkat RAM kecil: turunkan satu tingkat.
  if (hints.cores <= 4 || hints.memory <= 4) return 'medium'
  return 'high'
}

/**
 * Pengendali tier dengan histeresis:
 * - turun setelah FPS rendah bertahan 2 detik,
 * - naik hanya setelah FPS tinggi bertahan 12 detik,
 * - ada jeda 5 detik setelah setiap perubahan agar tidak berkedip.
 */
export class TierController {
  private tier: QualityTier
  private lowMs = 0
  private highMs = 0
  private cooldownMs = 0
  private allowUpgrade: boolean

  constructor(initial: QualityTier, allowUpgrade = true) {
    this.tier = initial
    this.allowUpgrade = allowUpgrade
  }

  get current() {
    return this.tier
  }

  setAllowUpgrade(value: boolean) {
    this.allowUpgrade = value
  }

  update(fps: number, deltaMs: number): QualityTier {
    const dt = Math.min(deltaMs, 1000)
    this.cooldownMs = Math.max(0, this.cooldownMs - dt)

    if (this.cooldownMs > 0) {
      this.lowMs = 0
      this.highMs = 0
      return this.tier
    }

    if (fps < PERFORMANCE.downgradeFps) {
      this.lowMs += dt
      this.highMs = 0
    } else if (fps > PERFORMANCE.upgradeFps) {
      this.highMs += dt
      this.lowMs = Math.max(0, this.lowMs - dt)
    } else {
      this.lowMs = Math.max(0, this.lowMs - dt)
      this.highMs = Math.max(0, this.highMs - dt)
    }

    if (this.lowMs >= PERFORMANCE.downgradeMs) {
      this.tier = this.step(-1)
      this.change()
    } else if (this.allowUpgrade && this.highMs >= PERFORMANCE.upgradeMs) {
      this.tier = this.step(1)
      this.change()
    }

    return this.tier
  }

  private step(direction: -1 | 1): QualityTier {
    const index = TIER_ORDER.indexOf(this.tier)
    const next = Math.min(TIER_ORDER.length - 1, Math.max(0, index + direction))
    return TIER_ORDER[next]
  }

  private change() {
    this.lowMs = 0
    this.highMs = 0
    this.cooldownMs = PERFORMANCE.cooldownMs
  }
}
