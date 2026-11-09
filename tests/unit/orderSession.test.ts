import { describe, expect, it } from 'vitest'
import { isOrderSessionExpired, ORDER_SESSION_MS } from '../../src/lib/orderSession'

describe('sesi QR meja', () => {
  it('kedaluwarsa jika belum pernah scan', () => {
    expect(isOrderSessionExpired(null)).toBe(true)
    expect(isOrderSessionExpired(undefined)).toBe(true)
  })

  it('masih aktif di dalam masa berlaku', () => {
    const now = 1_700_000_000_000
    expect(isOrderSessionExpired(now - 1000, now)).toBe(false)
    expect(isOrderSessionExpired(now - ORDER_SESSION_MS + 1000, now)).toBe(false)
  })

  it('kedaluwarsa setelah melewati batas', () => {
    const now = 1_700_000_000_000
    expect(isOrderSessionExpired(now - ORDER_SESSION_MS - 1, now)).toBe(true)
  })

  it('menolak timestamp dari masa depan', () => {
    const now = 1_700_000_000_000
    expect(isOrderSessionExpired(now + 1000, now)).toBe(true)
  })
})
