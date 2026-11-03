import { useEffect, useRef } from 'react'
import { useSceneStore } from '../store/useSceneStore'

/**
 * Ambience MP3 orisinal yang diputar berulang.
 *
 * Browser memblokir autoplay bersuara, jadi pemutaran dicoba lagi pada
 * interaksi pertama (klik/sentuh/tombol). Tombol musik di kontrol
 * memakai `musicMuted` dari store yang sama.
 */
export function AmbienceAudio() {
  const muted = useSceneStore((state) => state.musicMuted)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const element = audio.current
    if (!element) return
    element.volume = 0.18

    const play = () => {
      if (useSceneStore.getState().musicMuted) return
      void element.play().catch(() => {
        // Masih diblokir; percobaan berikutnya terjadi pada interaksi lain.
      })
    }

    if (!muted) play()
    const unlock = () => play()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [muted])

  useEffect(() => {
    const element = audio.current
    if (!element) return
    element.muted = muted
    if (!muted) {
      void element.play().catch(() => undefined)
    }
  }, [muted])

  return (
    <audio
      ref={audio}
      src="/audio/cafe_ambience.mp3"
      loop
      preload="auto"
      muted={muted}
      aria-hidden="true"
    />
  )
}
