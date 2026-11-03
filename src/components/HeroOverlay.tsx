import { useEffect, useRef } from 'react'
import { ScrollTrigger } from '../lib/gsap'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Teks hero (HTML asli agar terbaca pembaca layar).
 *
 * Desktop: kolom di sisi kiri dengan gradien gelap → transparan
 * (tanpa backdrop-filter) — kafe digeser ke kanan oleh `camera.setViewOffset`.
 * HP: teks di bawah adegan dengan gradien naik.
 */
export function HeroOverlay() {
  const phase = useHeroStore((state) => state.phase)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const infoOpen = useHeroStore((state) => state.infoOpen)
  const mode = useHeroStore((state) => state.mode)
  const enterWalk = useHeroStore((state) => state.enterWalk)
  const root = useRef<HTMLDivElement>(null)
  const revealed = useRef(false)

  // Animasi masuk per elemen, SEKALI saja setelah intro selesai.
  // Memakai transisi CSS (bukan tween GSAP) agar tetap selesai tepat waktu
  // di perangkat sangat lambat — GSAP meng-clamp delta frame sehingga
  // tween bisa tertinggal dan teks tetap transparan.
  useEffect(() => {
    if (phase !== 'idle' || revealed.current) return
    const element = root.current
    if (!element) return
    revealed.current = true

    const items = Array.from(element.querySelectorAll<HTMLElement>('[data-reveal]'))

    if (reducedMotion) {
      items.forEach((item) => {
        item.style.opacity = '1'
        item.style.transform = 'none'
      })
      return
    }

    items.forEach((item) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(28px)'
    })

    // Satu frame setelah gaya awal dipasang, mulai transisi.
    const start = window.setTimeout(() => {
      items.forEach((item, index) => {
        const delay = 0.15 + index * 0.12
        item.style.transition = `opacity 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`
        item.style.opacity = '1'
        item.style.transform = 'none'
      })
    }, 40)

    return () => window.clearTimeout(start)
  }, [phase, reducedMotion])

  // Teks memudar sejak awal scroll (hero kini 480svh, tur mulai cepat).
  useEffect(() => {
    const element = root.current
    if (!element) return
    const trigger = ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const opacity = Math.max(0, 1 - self.progress * 9)
        element.style.opacity = String(opacity)
        element.style.pointerEvents = opacity < 0.35 ? 'none' : ''
      },
    })
    return () => trigger.kill()
  }, [])

  // Masuk ke tur: scroll ke perhentian pertama (Pintu & Menu).
  const mulaiTur = () => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const range = Math.max(1, hero.offsetHeight - window.innerHeight)
    window.scrollTo({
      top: hero.offsetTop + range * 0.12,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 z-20">
      {/* Scrim desktop: gelap di kiri → transparan di kanan */}
      <div
        className="absolute inset-0 hidden lg:block"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,8,4,0.92) 0%, rgba(14,8,4,0.74) 24%, rgba(14,8,4,0.3) 46%, rgba(14,8,4,0) 64%)',
        }}
      />
      {/* Scrim HP: gelap di bawah → transparan di atas (teks di bawah adegan) */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70%] lg:hidden"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(0deg, rgba(14,8,4,0.97) 0%, rgba(14,8,4,0.93) 30%, rgba(14,8,4,0.72) 58%, rgba(14,8,4,0.3) 82%, rgba(14,8,4,0) 100%)',
        }}
      />

      <div
        className={`relative flex h-full items-end lg:items-center ${
          infoOpen || mode === 'walk' ? 'invisible' : ''
        }`}
      >
        <div className="w-full px-6 pb-32 sm:px-10 sm:pb-36 lg:max-w-[36rem] lg:px-16 lg:pb-0">
          <p
            data-reveal
            className="pointer-events-auto mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cream/25 bg-ink/70 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-cream uppercase"
          >
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lamp" aria-hidden="true" />
            <span className="truncate">Kopi Senja</span>
            <span className="hidden truncate sm:inline">· Buka tiap hari 08.00–22.00</span>
          </p>

          <h1
            data-reveal
            className="font-display text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.02em] text-cream sm:text-6xl lg:text-[4.4rem]"
          >
            Kopi hangat,
            <br />
            <span className="text-lamp">suasana 3D.</span>
          </h1>

          <p data-reveal className="mt-5 max-w-xl text-sm leading-relaxed text-cream/85 sm:text-base">
            Masuk ke kafe kami sebelum datang: ruangan 20 × 12 meter terlihat sekaligus —
            Chef Bima mengaduk wajan di dapur terbuka, Rani menyeduh di balik bar marmer,
            Dina menyambut di pintu, dan Andi mengantar pesanan ke sembilan meja.
          </p>

          <div data-reveal className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#menu"
              className="group inline-flex items-center gap-2 rounded-full bg-caramel px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-caramel/25 transition hover:bg-[#c4733a]"
            >
              Lihat Menu
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <button
              type="button"
              onClick={enterWalk}
              className="rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            >
              🚶 Jelajahi Kafe
            </button>
            <button
              type="button"
              onClick={mulaiTur}
              className="rounded-full border border-cream/30 px-5 py-3 text-sm font-medium text-cream/90 transition hover:border-cream/60 hover:text-cream"
            >
              Tur 4 area
            </button>
          </div>

          <p
            data-reveal
            className="mt-10 hidden items-center gap-3 text-[11px] tracking-[0.22em] text-cream/60 uppercase sm:flex"
          >
            <span className="relative flex h-6 w-4 items-center justify-center rounded-full border border-cream/30">
              <span className="mt-1 h-1.5 w-1 rounded-full bg-cream/70 motion-safe:animate-bounce" />
            </span>
            Gulir untuk tur · atau jalan kaki dengan WASD
          </p>
        </div>
      </div>
    </div>
  )
}
