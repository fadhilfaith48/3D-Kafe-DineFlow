import { describe, expect, it } from 'vitest'
import { FpsMeter } from '../../src/lib/fps'

describe('FpsMeter', () => {
  it('meratakan FPS menuju nilai sebenarnya', () => {
    const meter = new FpsMeter()
    // 30 frame dengan delta 1/30 detik => 30 FPS
    for (let index = 0; index < 30; index += 1) {
      meter.update(1 / 30)
    }
    expect(meter.value).toBeGreaterThan(30)
    expect(meter.value).toBeLessThan(55)
  })

  it('tidak berubah sebelum jendela 0,5 detik terlewati', () => {
    const meter = new FpsMeter()
    const before = meter.value
    meter.update(0.1)
    expect(meter.value).toBe(before)
  })

  it('reset mengembalikan nilai awal', () => {
    const meter = new FpsMeter()
    meter.reset(45)
    expect(meter.value).toBe(45)
  })
})
