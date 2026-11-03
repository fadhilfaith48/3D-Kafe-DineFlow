import { describe, expect, it } from 'vitest'
import { MENU_ITEMS, formatRupiah } from '../../src/data/menu'

describe('data menu', () => {
  it('berisi enam item dengan id unik', () => {
    expect(MENU_ITEMS).toHaveLength(6)
    expect(new Set(MENU_ITEMS.map((item) => item.id)).size).toBe(6)
  })

  it('semua harga lebih besar dari nol', () => {
    MENU_ITEMS.forEach((item) => {
      expect(item.price).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(10)
    })
  })

  it('memformat harga sebagai rupiah tanpa desimal', () => {
    expect(formatRupiah(32000)).toMatch(/32\.000/)
  })
})
