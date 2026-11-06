import { MENU_ITEMS } from '../data/menu'
import type { Cart } from '../store/useOrderStore'
import { cartLines } from './cart'

export interface CreateOrderInput {
  tableId: string
  tableToken: string
  cart: Cart
  note?: string
}

export interface OrderResult {
  orderId: string
  status: string
  total: number
  /** Halaman pembayaran Xendit dari DineFlow (jika tersedia). */
  invoiceUrl?: string
  /** `demo` = belum ada API; `live` = respons DineFlow. */
  mode: 'demo' | 'live'
}

interface OrderResponse {
  orderId?: string
  status?: string
  total?: number
  invoiceUrl?: string
}

/** URL API DineFlow. Kosong = checkout demo lokal. */
export function dineflowApiUrl(): string {
  return (import.meta.env.VITE_DINEFLOW_API_URL ?? '').trim().replace(/\/$/, '')
}

export function isLiveCheckout(): boolean {
  return dineflowApiUrl().length > 0
}

function demoOrderId(): string {
  return `DEMO-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

/**
 * Satu pintu checkout untuk panel pesanan.
 *
 * - Tanpa `VITE_DINEFLOW_API_URL`: membuat pesanan demo lokal (tanpa jaringan).
 * - Dengan URL: `POST {DINEFLOW_API_URL}/orders`, lalu panel mengarahkan ke
 *   `invoiceUrl` Xendit yang dibuat di server DineFlow.
 *
 * Secret key Xendit tidak boleh ada di frontend; endpoint inilah batas
 * integrasinya.
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  const lines = cartLines(input.cart, MENU_ITEMS)
  const localTotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const api = dineflowApiUrl()

  if (!api) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      orderId: demoOrderId(),
      status: 'demo',
      total: localTotal,
      mode: 'demo',
    }
  }

  const response = await fetch(`${api}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableId: input.tableId,
      tableToken: input.tableToken,
      items: lines.map((line) => ({ menuId: line.menuId, qty: line.qty })),
      note: input.note?.trim() || undefined,
    }),
  })

  if (!response.ok) {
    throw new Error(`DineFlow menolak pesanan (HTTP ${response.status}).`)
  }

  const data = (await response.json()) as OrderResponse
  if (!data.orderId) {
    throw new Error('Respons DineFlow tidak berisi orderId.')
  }

  return {
    orderId: data.orderId,
    status: data.status ?? 'pending_payment',
    total: typeof data.total === 'number' ? data.total : localTotal,
    invoiceUrl: data.invoiceUrl,
    mode: 'live',
  }
}
