import { useEffect, useRef, useState } from 'react'
import { useHeroStore } from '../store/useHeroStore'
import { useSceneStore } from '../store/useSceneStore'
import { SwitchRow } from './LightingMenu'

interface ActionRowProps {
  label: string
  hint: string
  active?: boolean
  onClick: () => void
}

function ActionRow({ label, hint, active = false, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 focus-visible:outline-offset-2 ${
        active ? 'text-cream' : 'text-cream/85'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="block text-[10px] leading-tight text-cream/50">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-full ${
          active ? 'bg-lamp' : 'bg-cream/25'
        }`}
      />
    </button>
  )
}

/**
 * Panel pengaturan untuk perangkat sentuh.
 *
 * Menggantikan deretan tujuh pill di kanan atas agar adegan tidak tertutup.
 * Walk tetap di luar panel karena itu aksi utama.
 */
export function MobileControlMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const paused = useHeroStore((state) => state.paused)
  const togglePaused = useHeroStore((state) => state.togglePaused)
  const disable3D = useHeroStore((state) => state.disable3D)
  const setDisable3D = useHeroStore((state) => state.setDisable3D)
  const dayMode = useSceneStore((state) => state.dayMode)
  const toggleDayMode = useSceneStore((state) => state.toggleDayMode)
  const musicMuted = useSceneStore((state) => state.musicMuted)
  const toggleMusicMuted = useSceneStore((state) => state.toggleMusicMuted)
  const rectOn = useSceneStore((state) => state.lightformers.rect)
  const circleOn = useSceneStore((state) => state.lightformers.circle)
  const toggleLightformer = useSceneStore((state) => state.toggleLightformer)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Pengaturan tampilan"
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-base transition focus-visible:outline-offset-2 ${
          open
            ? 'border-lamp bg-lamp/20 text-cream'
            : 'border-cream/25 bg-ink/65 text-cream/90 hover:border-cream/50'
        }`}
      >
        <span aria-hidden="true">⚙️</span>
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-40 mt-2 max-h-[70svh] w-72 overflow-y-auto rounded-xl border border-cream/20 bg-[#14100c]/97 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.2em] text-cream/50 uppercase">
            Tampilan
          </p>
          <ActionRow
            label={paused ? 'Lanjutkan animasi' : 'Jeda animasi'}
            hint="Hentikan gerakan kamera & karakter"
            active={paused}
            onClick={togglePaused}
          />
          <ActionRow
            label={dayMode === 'day' ? 'Mode malam' : 'Mode siang'}
            hint="Ganti suhu dan intensitas cahaya"
            active={dayMode === 'night'}
            onClick={toggleDayMode}
          />
          <ActionRow
            label={musicMuted ? 'Nyalakan musik' : 'Matikan musik'}
            hint="Ambience kafe"
            active={!musicMuted}
            onClick={toggleMusicMuted}
          />
          <ActionRow
            label={disable3D ? 'Nyalakan 3D' : 'Matikan 3D'}
            hint={disable3D ? 'Kembali ke adegan interaktif' : 'Hemat baterai di perangkat lambat'}
            active={!disable3D}
            onClick={() => {
              setDisable3D(!disable3D)
              setOpen(false)
            }}
          />

          <p className="mt-3 mb-1 border-t border-cream/10 px-2 pt-3 text-[10px] font-semibold tracking-[0.2em] text-cream/50 uppercase">
            Lightformer
          </p>
          <SwitchRow
            label="Bentuk kotak"
            hint="Cahaya jendela & bidang lebar"
            checked={rectOn}
            onToggle={() => toggleLightformer('rect')}
          />
          <SwitchRow
            label="Bentuk lingkaran"
            hint="Sorot lampu gantung"
            checked={circleOn}
            onToggle={() => toggleLightformer('circle')}
          />
        </div>
      ) : null}
    </div>
  )
}
