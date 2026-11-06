import { describe, expect, it } from 'vitest'
import { MENU_ITEMS } from '../../src/data/menu'
import { cartLines, cartTotals } from '../../src/lib/cart'

describe('keranjang pesanan', () => {
  it('kosong berarti nol porsi dan nol rupiah', () => {
    expect(cartTotals({}, MENU_ITEMS)).toEqual({ count: 0, subtotal: 0 })
  })

  it('menjumlahkan porsi dan harga dari katalog menu', () => {
    const latte = MENU_ITEMS.find((item) => item.id === 'senja-latte')!
    const croissant = MENU_ITEMS.find((item) => item.id === 'croissant')!

    const totals = cartTotals({ 'senja-latte': 2, croissant: 1 }, MENU_ITEMS)
    expect(totals.count).toBe(3)
    expect(totals.subtotal).toBe(latte.price * 2 + croissant.price)
  })

  it('mengabaikan qty nol atau negatif', () => {
    const totals = cartTotals({ 'senja-latte': 0, croissant: -2 }, MENU_ITEMS)
    expect(totals).toEqual({ count: 0, subtotal: 0 })
  })

  it('menghasilkan payload hanya untuk item yang dipesan', () => {
    const lines = cartLines({ 'manual-brew': 3 }, MENU_ITEMS)
    expect(lines).toEqual([{ menuId: 'manual-brew', qty: 3, price: 38000 }])
  })
})
