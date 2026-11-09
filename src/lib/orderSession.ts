/**
 * Masa berlaku sesi QR meja. Setelah ini, data meja/token/keranjang
 * dianggap kedaluwarsa supaya tautan lama tidak terus membuka pesanan.
 */
export const ORDER_SESSION_MS = 6 * 60 * 60 * 1000

export function isOrderSessionExpired(
  sessionAt: number | null | undefined,
  now = Date.now(),
  ttl = ORDER_SESSION_MS,
): boolean {
  if (!sessionAt || !Number.isFinite(sessionAt)) return true
  // Timestamp dari masa depan juga dianggap tidak valid.
  if (sessionAt > now) return true
  return now - sessionAt > ttl
}
