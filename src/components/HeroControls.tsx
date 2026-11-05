import { useEffect } from 'react'
import { ZONE_IDS, getZone } from '../data/zones'
import { useGyroPermission } from '../hooks/useGyroPermission'
import { useHeroStore } from '../store/useHeroStore'
import { useSceneStore } from '../store/useSceneStore'
import type { ZoneId } from '../types/scene'
import { LightingMenu } from './LightingMenu'

/**
 * Kendali 3D:
 * - pojok kanan atas: jeda, matikan 3D, siang/malam, musik, walk, gyro,
 * - pojok bawah: "Jelajahi area" + tombol kembali,
 * - mode walk: hint WASD + tombol keluar.
 */
export function HeroControls() {
  const paused = useHeroStore((state) => state.paused)
  const togglePaused = useHeroStore((state) => state.togglePaused)
  const disable3D = useHeroStore((state) => state.disable3D)
  const setDisable3D = useHeroStore((state) => state.setDisable3D)
  const activeZone = useHeroStore((state) => state.activeZone)
  const infoOpen = useHeroStore((state) => state.infoOpen)
  const mode = useHeroStore((state) => state.mode)
  const focusZone = useHeroStore((state) => state.focusZone)
  const exitFocus = useHeroStore((state) => state.exitFocus)
  const enterWalk = useHeroStore((state) => state.enterWalk)
  const exitWalk = useHeroStore((state) => state.exitWalk)
  const dayMode = useSceneStore((state) => state.dayMode)
  const toggleDayMode = useSceneStore((state) => state.toggleDayMode)
  const musicMuted = useSceneStore((state) => state.musicMuted)
  const toggleMusicMuted = useSceneStore((state) => state.toggleMusicMuted)
  const { supported, enabled, denied, enable, disable } = useGyroPermission()
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const walking = mode === 'walk'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === 'p') {
        event.preventDefault()
        togglePaused()
      } else if (key === '3') {
        event.preventDefault()
        setDisable3D(!disable3D)
      } else if (key === 'g' && supported) {
        event.preventDefault()
        if (enabled) disable()
        else void enable()
      } else if (key === 'f') {
        event.preventDefault()
        if (walking) exitWalk()
        else enterWalk()
      } else if (key === 'n') {
        event.preventDefault()
        toggleDayMode()
      } else if (key === 'm') {
        event.preventDefault()
        toggleMusicMuted()
      } else if (key >= '1' && key <= '4') {
        event.preventDefault()
        focusZone(ZONE_IDS[Number(key) - 1])
      } else if (key === '0') {
        event.preventDefault()
        exitWalk()
        exitFocus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    supported,
    enabled,
    enable,
    disable,
    togglePaused,
    setDisable3D,
    disable3D,
    focusZone,
    exitFocus,
    enterWalk,
    exitWalk,
    walking,
    toggleDayMode,
    toggleMusicMuted,
  ])

  const utilityClass =
    'rounded-full border border-cream/25 bg-ink/60 px-3.5 py-2 text-xs font-medium text-cream/90 transition hover:border-cream/50 hover:text-cream focus-visible:outline-offset-2'

  const activeUtilityClass =
    'rounded-full border border-lamp bg-lamp/20 px-3.5 py-2 text-xs font-medium text-cream transition hover:border-lamp focus-visible:outline-offset-2'

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-2 text-xs font-medium transition focus-visible:outline-offset-2 ${
      active
        ? 'border-lamp bg-lamp/20 text-cream'
        : 'border-cream/25 bg-ink/65 text-cream/90 hover:border-cream/55 hover:text-cream'
    }`

  return (
    <>
      {/* Kendali utilitas (pojok kanan atas) */}
      <div className="absolute top-4 right-4 z-30 flex max-w-[calc(100%-2rem)] flex-wrap items-center justify-end gap-2 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={togglePaused}
          aria-pressed={paused}
          aria-keyshortcuts="P"
          className={utilityClass}
        >
          {paused ? 'Lanjutkan animasi' : 'Jeda animasi'}
        </button>

        <button
          type="button"
          onClick={() => setDisable3D(!disable3D)}
          aria-pressed={disable3D}
          aria-keyshortcuts="3"
          className={utilityClass}
        >
          {disable3D ? 'Nyalakan 3D' : 'Matikan 3D'}
        </button>

        <button
          type="button"
          onClick={toggleDayMode}
          aria-pressed={dayMode === 'night'}
          aria-keyshortcuts="N"
          className={dayMode === 'night' ? activeUtilityClass : utilityClass}
        >
          {dayMode === 'day' ? '☀️ Mode malam' : '🌙 Mode siang'}
        </button>

        <LightingMenu />

        <button
          type="button"
          onClick={toggleMusicMuted}
          aria-pressed={!musicMuted}
          aria-keyshortcuts="M"
          className={musicMuted ? utilityClass : activeUtilityClass}
        >
          {musicMuted ? '🔇 Nyalakan musik' : '🔊 Matikan musik'}
        </button>

        <button
          type="button"
          onClick={() => (walking ? exitWalk() : enterWalk())}
          aria-pressed={walking}
          aria-keyshortcuts="F"
          className={walking ? activeUtilityClass : utilityClass}
        >
          {walking ? 'Keluar walk' : '🚶 Jelajah kaki'}
        </button>

        {supported && coarsePointer && !disable3D ? (
          <button
            type="button"
            onClick={() => (enabled ? disable() : void enable())}
            aria-pressed={enabled}
            aria-keyshortcuts="G"
            className={utilityClass}
          >
            {enabled ? 'Matikan gyro' : denied ? 'Gyro ditolak' : 'Aktifkan gyro'}
          </button>
        ) : null}
      </div>

      {walking ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-cream/20 bg-ink/80 px-4 py-2 text-[11px] text-cream/80 backdrop-blur-sm sm:text-xs">
            <span className="font-semibold text-cream">Walk mode</span>
            <span className="hidden sm:inline">Klik adegan untuk melihat · WASD/panah gerak · Shift lari · Esc keluar</span>
            <span className="sm:hidden">Klik + WASD · Esc keluar</span>
            <button
              type="button"
              onClick={exitWalk}
              className="rounded-full border border-cream/30 px-3 py-1 font-semibold text-cream transition hover:border-lamp hover:text-lamp"
            >
              Keluar
            </button>
          </div>
        </div>
      ) : !infoOpen ? (
        <nav
          aria-label="Jelajahi area"
          className="pointer-events-auto absolute inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6"
        >
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
            <span className="sr-only">Jelajahi area:</span>
            {ZONE_IDS.map((id: ZoneId) => {
              const zone = getZone(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => focusZone(id)}
                  aria-pressed={activeZone === id}
                  aria-keyshortcuts={String(ZONE_IDS.indexOf(id) + 1)}
                  className={chipClass(activeZone === id)}
                >
                  <span aria-hidden="true" className="mr-1">
                    {zone.ikon}
                  </span>
                  {zone.nama}
                </button>
              )
            })}
            {activeZone ? (
              <button type="button" onClick={exitFocus} aria-keyshortcuts="0" className={chipClass(false)}>
                ⇦ Tampak penuh
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  )
}

