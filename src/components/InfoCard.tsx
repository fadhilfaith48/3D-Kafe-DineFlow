import { useEffect, useRef } from 'react'
import { getZone } from '../data/zones'
import { gsap } from '../lib/gsap'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Kartu info zona yang muncul saat pin/karakter diklik.
 * - Desktop: kolom kanan (teks hero ada di kolom kiri).
 * - HP: bottom sheet di atas adegan.
 * - Tombol "Kembali ke tampak penuh" mengembalikan kamera & menutup kartu.
 * - Escape juga menutup; kontras teks minimal 4,5:1.
 */
export function InfoCard() {
  const open = useHeroStore((state) => state.infoOpen)
  const zoneId = useHeroStore((state) => state.activeZone)
  const exitFocus = useHeroStore((state) => state.exitFocus)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const root = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Escape menutup, Tab berputar di dalam kartu, dan fokus kembali ke
  // tombol pemicu saat kartu ditutup.
  useEffect(() => {
    if (!open) return
    const element = root.current
    if (!element) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        exitFocus()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((item) => item.offsetParent !== null)

      if (focusables.length === 0) {
        event.preventDefault()
        element.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !element.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, exitFocus])

  // Animasi masuk/keluar (dengan jaring pengaman berbasis waktu supaya
  // kartu tidak tertinggal transparan di perangkat yang sangat lambat).
  useEffect(() => {
    const element = root.current
    if (!element) return
    if (!open) {
      element.style.visibility = 'hidden'
      return
    }
    element.style.visibility = 'visible'

    const settle = () => {
      gsap.killTweensOf(element)
      element.style.opacity = '1'
      element.style.transform = 'none'
    }
    const safety = window.setTimeout(settle, 900)

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: reducedMotion ? 0 : 26 },
        { autoAlpha: 1, y: 0, duration: reducedMotion ? 0.01 : 0.5, ease: 'power3.out' },
      )
    }, element)
    return () => {
      window.clearTimeout(safety)
      context.revert()
    }
  }, [open, zoneId, reducedMotion])

  if (!zoneId) return null
  const zone = getZone(zoneId)

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zone-card-title"
      tabIndex={-1}
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 max-h-[62svh] overflow-y-auto border border-white/15 bg-[#14100c]/92 shadow-[0_18px_50px_rgba(0,0,0,0.55)] sm:inset-x-auto sm:right-5 sm:bottom-6 sm:w-[24rem] lg:right-8"
      style={{ visibility: 'hidden', borderRadius: '16px' }}
    >
      {/* Pita warna zona */}
      <div className="h-1.5 w-full" style={{ background: zone.warna }} aria-hidden="true" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-white/60 uppercase">
              Area kafe
            </p>
            <h2
              id="zone-card-title"
              className="mt-1 flex items-center gap-2 text-xl font-semibold text-white"
            >
              <span aria-hidden="true">{zone.ikon}</span>
              {zone.nama}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              <span className="font-semibold text-white">{zone.petugas}</span>
              <span className="text-white/60"> · {zone.peran}</span>
            </p>
          </div>

          <button
            ref={closeButton}
            type="button"
            onClick={exitFocus}
            aria-label="Tutup kartu info"
            className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[11px] font-medium text-white/80 transition hover:border-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/85">{zone.deskripsi}</p>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-[12px]">
          <div className="flex gap-2 rounded-lg bg-white/5 px-3 py-2">
            <dt className="shrink-0 text-white/55">Jam kerja</dt>
            <dd className="ml-auto font-medium text-white">{zone.jamKerja}</dd>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <dt className="text-white/55">Spesialisasi</dt>
            <dd className="mt-0.5 leading-snug text-white/90">{zone.spesialisasi}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={exitFocus}
          className="mt-4 w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
          style={{ background: zone.warna }}
        >
          Kembali ke tampak penuh
        </button>

        <p className="mt-2 text-center text-[11px] text-white/55">
          Geser untuk memutar · scroll untuk tur ke area berikutnya
        </p>
      </div>
    </div>
  )
}
