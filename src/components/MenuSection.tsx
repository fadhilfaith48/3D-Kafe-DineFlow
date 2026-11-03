import { useEffect, useRef } from 'react'
import { MENU_ITEMS, formatRupiah } from '../data/menu'
import { gsap } from '../lib/gsap'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Bagian menu tujuan scroll kamera. Kartu muncul bertahap
 * memakai GSAP ScrollTrigger.
 */
export function MenuSection() {
  const section = useRef<HTMLElement>(null)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)

  useEffect(() => {
    const element = section.current
    if (!element) return

    const context = gsap.context(() => {
      const cards = element.querySelectorAll<HTMLElement>('[data-card]')
      gsap.from(cards, {
        y: 30,
        duration: reducedMotion ? 0.01 : 0.8,
        stagger: reducedMotion ? 0 : 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 78%',
          once: true,
        },
      })
    }, element)

    return () => context.revert()
  }, [reducedMotion])

  return (
    <section
      id="menu"
      ref={section}
      aria-labelledby="menu-title"
      className="relative z-10 bg-ink px-6 py-20 sm:px-10 sm:py-24 lg:px-16"
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-24 bg-gradient-to-b from-transparent to-ink"
        aria-hidden="true"
      />

      <div id="tentang" className="mx-auto max-w-6xl scroll-mt-24">
        <div className="flex flex-col gap-6 border-b border-cream/12 pb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-lamp uppercase">
              Menu Kopi Senja
            </p>
            <h2
              id="menu-title"
              className="mt-3 font-display text-3xl leading-tight font-semibold text-cream sm:text-4xl"
            >
              Seduh pelan, nikmati sore.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/70 sm:text-base">
              Semua kopi digiling saat dipesan. Biji dari petani Gayo dan Lampung,
              disangrai setiap dua minggu di dapur kami. Harga sudah termasuk pajak.
            </p>
          </div>
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-cream/50">Buka</dt>
              <dd className="mt-1 font-semibold text-cream">08.00 – 22.00</dd>
            </div>
            <div>
              <dt className="text-cream/50">Lokasi</dt>
              <dd className="mt-1 font-semibold text-cream">Jl. Senja No. 12</dd>
            </div>
          </dl>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_ITEMS.map((item) => (
            <li
              key={item.id}
              data-card
              className="group relative flex flex-col justify-between rounded-2xl border border-cream/12 bg-cream/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-lamp/40 hover:bg-cream/[0.07]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold text-cream">
                    {item.name}
                  </h3>
                  {item.tag ? (
                    <span className="rounded-full border border-lamp/35 bg-lamp/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-lamp uppercase">
                      {item.tag}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-cream/65">
                  {item.description}
                </p>
              </div>
              <p className="mt-6 font-display text-lg font-semibold text-lamp">
                {formatRupiah(item.price)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-cream/12 bg-gradient-to-r from-[#2a190f] to-[#1d1109] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-semibold text-cream">
              Mau pesan untuk dibawa pulang?
            </p>
            <p className="mt-1 text-sm text-cream/60">
              Datang langsung atau hubungi kami di 0812-3456-7890.
            </p>
          </div>
          <a
            href="#hero"
            className="rounded-full border border-cream/25 px-5 py-2.5 text-sm font-medium text-cream/90 transition hover:border-lamp/60 hover:text-lamp"
          >
            Kembali ke suasana kafe
          </a>
        </div>
      </div>
    </section>
  )
}
