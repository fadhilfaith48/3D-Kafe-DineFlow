import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store untuk mode interaksi self‑order / staff map.
 * Menyimpan informasi yang berasal dari URL QR (nomor meja & token)
 * serta mode tampilan yang aktif.
 */
export type InteractionMode = 'visitor' | 'selfOrder' | 'staffMap'

interface OrderState {
  mode: InteractionMode
  tableId: string | null
  tableToken: string | null
  /** Set mode dan data QR (jika ada) */
  setMode: (mode: InteractionMode) => void
  setTableInfo: (tableId: string | null, token: string | null) => void
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      mode: 'visitor',
      tableId: null,
      tableToken: null,
      setMode: (mode) => set({ mode }),
      setTableInfo: (tableId, token) => set({ tableId, tableToken: token }),
    }),
    {
      name: 'kopi-senja:order',
      // Simpan mode agar tetap ketika user reload halaman
      partialize: (state) => ({ mode: state.mode, tableId: state.tableId, tableToken: state.tableToken }),
    },
  ),
)
