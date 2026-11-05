import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Store untuk kontrol visual seperti siang/malam, lightformer, dan musik */
export type DayMode = 'day' | 'night'
export type LightformerForm = 'rect' | 'circle'

interface SceneState {
  dayMode: DayMode
  musicMuted: boolean
  /** Lightformer mana yang aktif. Bisa dinyalakan/dimatikan terpisah. */
  lightformers: Record<LightformerForm, boolean>
  /** toggle antara siang dan malam */
  toggleDayMode: () => void
  /** toggle mute musik latar */
  toggleMusicMuted: () => void
  /** nyalakan/matikan satu lightformer */
  toggleLightformer: (form: LightformerForm) => void
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set, get) => ({
      dayMode: 'day',
      musicMuted: false,
      lightformers: { rect: true, circle: true },
      toggleDayMode: () => set({ dayMode: get().dayMode === 'day' ? 'night' : 'day' }),
      toggleMusicMuted: () => set({ musicMuted: !get().musicMuted }),
      toggleLightformer: (form) =>
        set((state) => ({
          lightformers: { ...state.lightformers, [form]: !state.lightformers[form] },
        })),
    }),
    {
      name: 'kopi-senja:scene',
      partialize: (state) => ({
        dayMode: state.dayMode,
        musicMuted: state.musicMuted,
        lightformers: state.lightformers,
      }),
    },
  ),
)
