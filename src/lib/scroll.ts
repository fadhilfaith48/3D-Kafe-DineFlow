/**
 * Nilai yang berubah tiap frame TIDAK disimpan di Zustand,
 * agar React tidak re-render 60 kali per detik.
 */
export const heroMotion = {
  /** 0 → 1 selama intro kamera */
  intro: 0,
  /** 0 → 1 sepanjang scroll hero */
  scroll: 0,
  /** 0 → 1 saat lampu gantung menyala */
  lampPower: 0,
  /** apakah mode gerak berkurang aktif */
  reducedMotion: false,
}

export const gyroTilt = { x: 0, y: 0 }

export function resetHeroMotion() {
  heroMotion.intro = 0
  heroMotion.scroll = 0
  heroMotion.lampPower = 0
}

/** Statistik yang dibaca panel debug tanpa memicu render React. */
export const debugStats = {
  fps: 60,
  drawCalls: 0,
  tier: 'medium' as 'low' | 'medium' | 'high',
}
