import type { MenuItem } from '../types/scene'
import type { Cart } from '../store/useOrderStore'

export interface CartTotals {
  /** Total porsi, dipakai untuk badge keranjang. */
  count: number
  subtotal: number
}

/** Hitung jumlah porsi & subtotal dari keranjang + katalog menu. */
export function cartTotals(cart: Cart, items: MenuItem[]): CartTotals {
  let count = 0
  let subtotal = 0

  for (const item of items) {
    const qty = cart[item.id] ?? 0
    if (qty <= 0) continue
    count += qty
    subtotal += qty * item.price
  }

  return { count, subtotal }
}

/** Ubah keranjang menjadi payload item yang ringkas untuk API. */
export function cartLines(cart: Cart, items: MenuItem[]) {
  return items
    .filter((item) => (cart[item.id] ?? 0) > 0)
    .map((item) => ({ menuId: item.id, qty: cart[item.id], price: item.price }))
}
