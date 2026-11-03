import { useHeroStore } from '../store/useHeroStore'

const FALLBACK_IMAGE: string | null = null

/**
 * Tampilan cadangan saat WebGL tidak tersedia atau 3D dimatikan.
 * Tidak ada teks — hanya gradient kafe hangat + tombol nyalakan 3D.
 */
export function Fallback() {
  const setDisable3D = useHeroStore((state) => state.setDisable3D)
  const disable3D = useHeroStore((state) => state.disable3D)

  return (
    <div className="absolute inset-0 overflow-hidden">
      {FALLBACK_IMAGE ? (
        <img
          src={FALLBACK_IMAGE}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
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

      {/* Tombol nyalakan 3D — hanya muncul jika pengguna matikan 3D sendiri */}
      {disable3D && (
        <div className="relative z-10 flex h-full items-center justify-center">
          <button
            type="button"
            onClick={() => setDisable3D(false)}
            className="rounded-full border border-cream/30 bg-ink/70 px-5 py-3 text-sm font-medium text-cream/90 backdrop-blur-sm transition hover:border-cream/60 hover:text-cream"
          >
            Nyalakan 3D
          </button>
        </div>
      )}
    </div>
  )
}
