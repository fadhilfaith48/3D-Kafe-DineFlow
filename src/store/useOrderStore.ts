import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store untuk mode interaksi self‑order / staff map.
 * Menyimpan informasi yang berasal dari URL QR (nomor meja & token),
 * mode tampilan yang aktif, dan keranjang pesanan sementara.
 *
 * Checkout masih berupa demo lokal. Integrasi DineFlow/Xendit nanti
 * memakai data yang sama lewat `createOrder` di `src/lib/orderApi.ts`.
 */
export type InteractionMode = 'visitor' | 'selfOrder' | 'staffMap'

/** Jumlah per menuId; item dengan qty 0 tidak disimpan. */
export type Cart = Record<string, number>

interface OrderState {
  mode: InteractionMode
  tableId: string | null
  tableToken: string | null
  cart: Cart
  /** Catatan opsional untuk dapur/barista. */
  note: string
  /** Set mode dan data QR (jika ada) */
  setMode: (mode: InteractionMode) => void
  setTableInfo: (tableId: string | null, token: string | null) => void
  setNote: (note: string) => void
  /** Tambah satu porsi menu. */
  addItem: (menuId: string) => void
  /** Kurangi satu porsi; qty 0 menghapus baris. */
  removeItem: (menuId: string) => void
  /** Set jumlah langsung (0 = hapus). */
  setQty: (menuId: string, qty: number) => void
  clearCart: () => void
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      mode: 'visitor',
      tableId: null,
      tableToken: null,
      cart: {},
      note: '',
      setMode: (mode) => set({ mode }),
      setTableInfo: (tableId, token) =>
        set((state) => ({
          tableId,
          tableToken: token,
          // Pindah meja = keranjang lama tidak berlaku lagi.
          ...(state.tableId !== tableId ? { cart: {}, note: '' } : {}),
        })),
      setNote: (note) => set({ note }),
      addItem: (menuId) =>
        set((state) => ({
          cart: { ...state.cart, [menuId]: (state.cart[menuId] ?? 0) + 1 },
        })),
      removeItem: (menuId) =>
        set((state) => {
          const next = { ...state.cart }
          const qty = (next[menuId] ?? 0) - 1
          if (qty <= 0) delete next[menuId]
          else next[menuId] = qty
          return { cart: next }
        }),
      setQty: (menuId, qty) =>
        set((state) => {
          const next = { ...state.cart }
          if (qty <= 0) delete next[menuId]
          else next[menuId] = Math.floor(qty)
          return { cart: next }
        }),
      clearCart: () => set({ cart: {}, note: '' }),
    }),
    {
      name: 'kopi-senja:order',
      partialize: (state) => ({
        mode: state.mode,
        tableId: state.tableId,
        tableToken: state.tableToken,
        cart: state.cart,
        note: state.note,
      }),
    },
  ),
)
