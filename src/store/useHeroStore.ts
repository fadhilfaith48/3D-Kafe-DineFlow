import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CameraMode, HeroPhase, QualityTier, ZoneId } from '../types/scene'

interface HeroState {
  phase: HeroPhase
  tier: QualityTier
  paused: boolean
  disable3D: boolean
  webglSupported: boolean
  reducedMotion: boolean
  gyroEnabled: boolean
  visible: boolean
  fps: number

  /** Zona yang sedang mendapat fokus kamera (null = tampak penuh). */
  activeZone: ZoneId | null
  /** Keadaan kamera saat ini. */
  mode: CameraMode
  /** Perhentian tur scroll berjalan (0 = di luar tur). */
  tourStop: number
  /** Apakah kartu info zona sedang terbuka. */
  infoOpen: boolean

  setPhase: (phase: HeroPhase) => void
  setTier: (tier: QualityTier) => void
  setPaused: (paused: boolean) => void
  togglePaused: () => void
  setDisable3D: (value: boolean) => void
  setWebglSupported: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setGyroEnabled: (value: boolean) => void
  setVisible: (value: boolean) => void
  setFps: (fps: number) => void

  /** Fokuskan kamera ke satu zona + buka kartu info. */
  focusZone: (zoneId: ZoneId) => void
  /** Tutup kartu info dan kembali ke tampak penuh. */
  exitFocus: () => void
  setMode: (mode: CameraMode) => void
  setTourStop: (stop: number) => void
  setInfoOpen: (open: boolean) => void
  /** Masuk mode jelajah orang pertama (walk). */
  enterWalk: () => void
  /** Keluar walk dan kembali ke tampak penuh. */
  exitWalk: () => void
}

/**
 * Zustand hanya menyimpan state yang memicu render UI.
 * Nilai per-frame (scroll, intro, pointer) ada di lib/scroll.ts.
 */
export const useHeroStore = create<HeroState>()(
  persist(
    (set) => ({
      phase: 'loading',
      tier: 'medium',
      paused: false,
      disable3D: false,
      webglSupported: true,
      reducedMotion: false,
      gyroEnabled: false,
      visible: true,
      fps: 60,

      activeZone: null,
      mode: 'intro',
      tourStop: 0,
      infoOpen: false,

      setPhase: (phase) => set({ phase }),
      setTier: (tier) => set({ tier }),
      setPaused: (paused) => set({ paused }),
      togglePaused: () => set((state) => ({ paused: !state.paused })),
      setDisable3D: (disable3D) => set({ disable3D }),
      setWebglSupported: (webglSupported) => set({ webglSupported }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setGyroEnabled: (gyroEnabled) => set({ gyroEnabled }),
      setVisible: (visible) => set({ visible }),
      setFps: (fps) => set({ fps }),

      focusZone: (zoneId) =>
        set({ activeZone: zoneId, mode: 'focus', infoOpen: true, tourStop: 0 }),
      exitFocus: () => set({ activeZone: null, mode: 'free', infoOpen: false }),
      setMode: (mode) => set({ mode }),
      setTourStop: (tourStop) => set({ tourStop }),
      setInfoOpen: (infoOpen) => set({ infoOpen }),
      enterWalk: () =>
        set({ activeZone: null, mode: 'walk', infoOpen: false, tourStop: 0 }),
      exitWalk: () => set({ activeZone: null, mode: 'free', infoOpen: false }),
    }),
    {
      name: 'kopi-senja:hero',
      // Hanya pilihan "Matikan 3D" yang diingat antar kunjungan.
      partialize: (state) => ({ disable3D: state.disable3D }),
    },
  ),
)
