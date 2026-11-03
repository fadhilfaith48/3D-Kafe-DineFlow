import { describe, expect, it } from 'vitest'
import { detectInitialTier, TierController } from '../../src/lib/quality'

describe('detectInitialTier', () => {
  it('memilih low untuk HP kecil', () => {
    expect(detectInitialTier({ cores: 8, memory: 8, width: 390, touch: true })).toBe('low')
  })

  it('memilih high untuk desktop kuat', () => {
    expect(detectInitialTier({ cores: 12, memory: 16, width: 1600, touch: false })).toBe('high')
  })

  it('memilih medium untuk laptop menengah', () => {
    expect(detectInitialTier({ cores: 4, memory: 8, width: 1280, touch: false })).toBe('medium')
  })
})

describe('TierController', () => {
  it('turun satu tingkat setelah FPS rendah bertahan 2 detik', () => {
    const controller = new TierController('high')
    expect(controller.update(30, 1000)).toBe('high')
    expect(controller.update(30, 1000)).toBe('medium')
  })

  it('tidak turun jika FPS rendah hanya sesaat', () => {
    const controller = new TierController('high')
    controller.update(30, 500)
    expect(controller.update(58, 500)).toBe('high')
  })

  it('tidak naik saat upgrade dimatikan', () => {
    const controller = new TierController('low', false)
    for (let index = 0; index < 20; index += 1) {
      controller.update(60, 1000)
    }
    expect(controller.current).toBe('low')
  })

  it('menghormati cooldown setelah turun tingkat', () => {
    const controller = new TierController('high')
    controller.update(30, 1000)
    controller.update(30, 1000)
    expect(controller.current).toBe('medium')
    // Masih dalam cooldown 5 detik => tidak langsung turun lagi.
    controller.update(20, 1000)
    expect(controller.current).toBe('medium')
  })
})
