import { describe, expect, it } from 'vitest'
import { createOrder, isLiveCheckout } from '../../src/lib/orderApi'

describe('checkout DineFlow', () => {
  it('memakai mode demo saat API belum dikonfigurasi', async () => {
    expect(isLiveCheckout()).toBe(false)

    const order = await createOrder({
      tableId: 'table_03',
      tableToken: 'demo-token',
      cart: { 'senja-latte': 2, croissant: 1 },
      note: 'tanpa gula',
    })

    expect(order.mode).toBe('demo')
    expect(order.status).toBe('demo')
    expect(order.total).toBe(32000 * 2 + 24000)
    expect(order.orderId).toMatch(/^DEMO-/)
    expect(order.invoiceUrl).toBeUndefined()
  })
})
