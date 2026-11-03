import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Store untuk kontrol visual seperti siang/malam dan musik */
export type DayMode = 'day' | 'night'

interface SceneState {
  dayMode: DayMode
  musicMuted: boolean
  /** toggle antara siang dan malam */
  toggleDayMode: () => void
  /** toggle mute musik latar */
  toggleMusicMuted: () => void
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set, get) => ({
      dayMode: 'day',
      musicMuted: false,
      toggleDayMode: () => set({ dayMode: get().dayMode === 'day' ? 'night' : 'day' }),
      toggleMusicMuted: () => set({ musicMuted: !get().musicMuted }),
    }),
    {
      name: 'kopi-senja:scene',
      partialize: (state) => ({ dayMode: state.dayMode, musicMuted: state.musicMuted }),
    },
  ),
)
