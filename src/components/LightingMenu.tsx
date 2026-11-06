import { useEffect, useRef, useState } from 'react'
import {
  useSceneStore,
  type LightformerForm,
} from '../store/useSceneStore'

interface SwitchRowProps {
  label: string
  hint: string
  checked: boolean
  onToggle: () => void
}

export function SwitchRow({ label, hint, checked, onToggle }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-cream">{label}</span>
        <span className="block text-[10px] leading-tight text-cream/55">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
          checked ? 'border-lamp bg-lamp/70' : 'border-cream/25 bg-ink/80'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-cream shadow transition-transform ${
            checked ? 'translate-x-[1.15rem]' : 'translate-x-[0.18rem]'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * Panel kecil untuk menyalakan/mematikan lightformer rect & circle.
 * Dibuat sebagai popover agar deretan kontrol utama tidak makin padat.
 */
export function LightingMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
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

  const toggle = (form: LightformerForm) => () => toggleLightformer(form)

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Pengaturan lightformer"
        className={`rounded-full border px-3.5 py-2 text-xs font-medium transition focus-visible:outline-offset-2 ${
          open
            ? 'border-lamp bg-lamp/20 text-cream'
            : 'border-cream/25 bg-ink/60 text-cream/90 hover:border-cream/50 hover:text-cream'
        }`}
      >
        💡 Cahaya
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-cream/20 bg-[#14100c]/95 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.2em] text-cream/50 uppercase">
            Lightformer
          </p>
          <SwitchRow
            label="Bentuk kotak"
            hint="Cahaya jendela & bidang lebar"
            checked={rectOn}
            onToggle={toggle('rect')}
          />
          <SwitchRow
            label="Bentuk lingkaran"
            hint="Sorot lampu gantung"
            checked={circleOn}
            onToggle={toggle('circle')}
          />
          <p className="mt-2 border-t border-cream/10 px-2 pt-2 text-[10px] leading-snug text-cream/45">
            Perubahan langsung terlihat di refleksi material.
          </p>
        </div>
      ) : null}
    </div>
  )
}
