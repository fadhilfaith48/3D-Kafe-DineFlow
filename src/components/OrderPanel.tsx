import { useState } from 'react'
import { formatRupiah, MENU_ITEMS } from '../data/menu'
import { cartTotals } from '../lib/cart'
import { createOrder, isLiveCheckout, type OrderResult } from '../lib/orderApi'
import { useOrderStore } from '../store/useOrderStore'

type CheckoutState = 'idle' | 'processing' | 'done' | 'error'

/**
 * Panel pesanan mandiri yang dibuka dari QR meja (`?table=03&token=...`).
 *
 * Untuk sementara checkout berjalan sebagai demo lokal. Saat DineFlow API
 * tersedia, `OrderPanel` memakai adapter `createOrder` tanpa mengubah UI.
 */
export function OrderPanel() {
  const mode = useOrderStore((state) => state.mode)
  const tableId = useOrderStore((state) => state.tableId)
  const tableToken = useOrderStore((state) => state.tableToken)
  const cart = useOrderStore((state) => state.cart)
  const note = useOrderStore((state) => state.note)
  const setMode = useOrderStore((state) => state.setMode)
  const setNote = useOrderStore((state) => state.setNote)
  const addItem = useOrderStore((state) => state.addItem)
  const removeItem = useOrderStore((state) => state.removeItem)
  const clearCart = useOrderStore((state) => state.clearCart)

  const [collapsed, setCollapsed] = useState(false)
  const [checkout, setCheckout] = useState<CheckoutState>('idle')
  const [result, setResult] = useState<OrderResult | null>(null)
  const [error, setError] = useState('')

  if (mode !== 'selfOrder' || !tableId || !tableToken) return null

  const tableNumber = tableId.slice(-2)
  const { count, subtotal } = cartTotals(cart, MENU_ITEMS)

  const beginCheckout = async () => {
    if (count === 0 || checkout === 'processing') return
    setCheckout('processing')
    setError('')

    try {
      const order = await createOrder({
        tableId,
        tableToken,
        cart,
        note,
      })
      setResult(order)

      if (order.invoiceUrl) {
        // Pembayaran Xendit dibuat di server DineFlow.
        clearCart()
        window.location.assign(order.invoiceUrl)
        return
      }

      setCheckout('done')
      clearCart()
    } catch (cause) {
      setCheckout('error')
      setError(
        cause instanceof Error
          ? cause.message
          : 'Pesanan gagal dibuat. Coba lagi sebentar lagi.',
      )
    }
  }

  const close = () => {
    setMode('visitor')
    setCollapsed(false)
    setCheckout('idle')
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto absolute bottom-20 left-4 z-40 flex items-center gap-2 rounded-full border border-lamp/50 bg-ink/85 px-4 py-2 text-xs font-semibold text-cream shadow-lg backdrop-blur-sm transition hover:border-lamp sm:bottom-24 sm:left-6"
      >
        <span aria-hidden="true">🧾</span>
        Meja {tableNumber}
        {count > 0 ? (
          <span className="rounded-full bg-lamp px-2 py-0.5 text-[10px] font-bold text-ink">
            {count}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <section
      aria-label={`Pesanan Meja ${tableNumber}`}
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-40 flex max-h-[72svh] flex-col overflow-hidden rounded-2xl border border-cream/20 bg-[#14100c]/96 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-md sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-h-[76svh] sm:w-[24rem] lg:right-8"
    >
      <header className="flex items-start justify-between gap-3 border-b border-cream/12 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-lamp uppercase">
            Pesanan mandiri
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold text-cream">
            <span aria-hidden="true">🧾</span>
            Meja {tableNumber}
          </h2>
          <p className="mt-1 text-[11px] text-cream/55">
            QR meja aktif · pesanan langsung ke bar
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Kecilkan panel pesanan"
            className="rounded-full border border-cream/20 px-2.5 py-1 text-[11px] text-cream/75 transition hover:border-cream/50 hover:text-cream focus-visible:outline-offset-2"
          >
            −
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup panel pesanan"
            className="rounded-full border border-cream/20 px-2.5 py-1 text-[11px] text-cream/75 transition hover:border-cream/50 hover:text-cream focus-visible:outline-offset-2"
          >
            ✕
          </button>
        </div>
      </header>

      {checkout === 'done' ? (
        <div className="flex-1 overflow-y-auto px-5 py-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-lamp/50 bg-lamp/15 text-2xl"
          >
            ✓
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-cream">
            {result?.mode === 'demo' ? 'Pesanan demo diterima' : 'Pesanan dibuat'}
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-cream/70">
            Nomor pesanan{' '}
            <span className="font-semibold text-cream">{result?.orderId}</span>.
            {result?.mode === 'demo'
              ? ' Pembayaran belum aktif — pesanan tidak dikirim ke dapur.'
              : ' Pembayaran sedang disiapkan.'}
          </p>
          <p className="mx-auto mt-3 max-w-xs text-[11px] leading-relaxed text-cream/50">
            {result?.mode === 'demo'
              ? 'Setelah DineFlow + Xendit tersambung, langkah ini berubah menjadi halaman pembayaran.'
              : 'Status pembayaran akan diperbarui oleh DineFlow.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setCheckout('idle')
              setResult(null)
            }}
            className="mt-5 w-full rounded-full bg-caramel px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c4733a] focus-visible:outline-offset-2"
          >
            Pesan lagi
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full rounded-full border border-cream/25 px-5 py-2.5 text-sm font-medium text-cream/85 transition hover:border-cream/55 hover:text-cream focus-visible:outline-offset-2"
          >
            Tutup
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="space-y-1.5">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.id] ?? 0
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition ${
                      qty > 0 ? 'bg-lamp/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-cream">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-cream/55">
                        {formatRupiah(item.price)}
                        {item.tag ? (
                          <span className="ml-2 text-lamp/80">{item.tag}</span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {qty > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Kurangi ${item.name}`}
                            className="h-7 w-7 rounded-full border border-cream/25 text-sm text-cream transition hover:border-lamp hover:text-lamp focus-visible:outline-offset-2"
                          >
                            −
                          </button>
                          <span
                            aria-live="polite"
                            className="w-5 text-center text-xs font-semibold text-cream"
                          >
                            {qty}
                          </span>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => addItem(item.id)}
                        aria-label={`Tambah ${item.name}`}
                        className="h-7 w-7 rounded-full border border-lamp/50 bg-lamp/10 text-sm text-lamp transition hover:bg-lamp/20 focus-visible:outline-offset-2"
                      >
                        +
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <label className="mt-3 block px-2.5">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-cream/50 uppercase">
                Catatan (opsional)
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={160}
                rows={2}
                placeholder="Contoh: tanpa gula, es sedikit"
                className="mt-1.5 w-full resize-none rounded-xl border border-cream/15 bg-ink/60 px-3 py-2 text-xs text-cream placeholder:text-cream/35 focus:border-lamp/60 focus:outline-none"
              />
            </label>
          </div>

          <footer className="border-t border-cream/12 px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-cream/60">
                {count} porsi
              </span>
              <span className="font-display text-lg font-semibold text-cream">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void beginCheckout()}
              disabled={count === 0 || checkout === 'processing'}
              className="mt-3 w-full rounded-full bg-caramel px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c4733a] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-cream/15 disabled:text-cream/40"
            >
              {checkout === 'processing' ? 'Memproses…' : 'Lanjut ke pembayaran'}
            </button>
            {checkout === 'error' ? (
              <p
                role="alert"
                className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-[10px] leading-snug text-red-200"
              >
                {error}
              </p>
            ) : null}
            <p className="mt-2 text-center text-[10px] leading-snug text-cream/45">
              {isLiveCheckout()
                ? 'Pembayaran aman diproses lewat DineFlow · Xendit.'
                : 'Mode demo — pembayaran DineFlow/Xendit segera tersedia.'}
            </p>
          </footer>
        </>
      )}
    </section>
  )
}
