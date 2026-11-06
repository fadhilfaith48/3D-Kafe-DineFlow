import { useHeroStore } from '../store/useHeroStore'

const FALLBACK_IMAGE: string | null = null

/**
 * Tampilan cadangan saat WebGL tidak tersedia atau 3D dimatikan.
 *
 * Tetap menampilkan judul, deskripsi, dan CTA menu yang sama seperti hero
 * 3D agar pengunjung tanpa WebGL tidak kehilangan konteks dan tetap bisa
 * membuka menu.
 */
export function Fallback() {
  const setDisable3D = useHeroStore((state) => state.setDisable3D)
  const disable3D = useHeroStore((state) => state.disable3D)
  const webglSupported = useHeroStore((state) => state.webglSupported)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {FALLBACK_IMAGE ? (
        <img
          src={FALLBACK_IMAGE}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 22% 18%, #F1D9B4 0%, #D9A96F 26%, #9A5F36 55%, #4A2A18 82%, #24140C 100%)',
          }}
        />
      )}

      {/* overlay gelap */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(20,11,6,0.6) 0%, rgba(20,11,6,0.3) 50%, rgba(20,11,6,0.7) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

      <div className="relative z-10 flex h-full items-end lg:items-center">
        <div className="w-full px-6 pb-16 sm:px-10 lg:max-w-[36rem] lg:px-16 lg:pb-0">
          <p className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cream/25 bg-ink/70 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-cream uppercase">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lamp"
              aria-hidden="true"
            />
            <span className="truncate">Kopi Senja</span>
            <span className="hidden truncate sm:inline">· Buka tiap hari 08.00–22.00</span>
          </p>

          <h1 className="font-display text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.02em] text-cream sm:text-6xl lg:text-[4.4rem]">
            Kopi hangat,
            <br />
            <span className="text-lamp">suasana 3D.</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-cream/85 sm:text-base">
            Ruangan 20 × 12 meter dengan dapur terbuka, bar marmer, dan sembilan
            meja kayu. Menu dan suasana tetap bisa dilihat meski perangkat ini
            tidak menjalankan adegan 3D.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#menu"
              className="group inline-flex items-center gap-2 rounded-full bg-caramel px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-caramel/25 transition hover:bg-[#c4733a]"
            >
              Lihat Menu
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>

            {disable3D ? (
              <button
                type="button"
                onClick={() => setDisable3D(false)}
                className="rounded-full border border-cream/30 bg-ink/70 px-5 py-3 text-sm font-medium text-cream/90 backdrop-blur-sm transition hover:border-cream/60 hover:text-cream"
              >
                Nyalakan 3D
              </button>
            ) : !webglSupported ? (
              <p className="max-w-xs text-xs leading-relaxed text-cream/65">
                Browser ini belum mendukung WebGL. Coba browser terbaru untuk
                menjelajahi kafe dalam 3D.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
