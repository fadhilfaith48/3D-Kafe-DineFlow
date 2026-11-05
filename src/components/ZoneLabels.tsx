import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { ZONES } from '../data/zones'
import { heroMotion } from '../lib/scroll'
import { useHeroStore } from '../store/useHeroStore'
import type { Zone } from '../types/scene'

/**
 * Satu pin label melayang per zona (drei Html).
 *
 * Aturan tampil:
 * - muncul setelah intro selesai,
 * - disembunyikan selama kartu info terbuka (fokus zona),
 * - posisi pin sudah berbeda-beda di `zones.ts` sehingga tidak menumpuk.
 */
function ZonePin({ zone, active }: { zone: Zone; active: boolean }) {
  const focusZone = useHeroStore((state) => state.focusZone)

  return (
    <Html
      position={zone.label}
      distanceFactor={14}
      zIndexRange={[20, 0]}
      className="pointer-events-none"
      style={{ pointerEvents: 'none' }}
    >
      <button
        type="button"
        onClick={() => focusZone(zone.id)}
        aria-label={`Jelajahi ${zone.nama}: petugas ${zone.petugas}, ${zone.peran}`}
        className="group pointer-events-auto relative block cursor-pointer border border-white/20 bg-[#14100c]/85 px-2.5 py-1.5 text-left shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition hover:border-white/45 hover:bg-[#14100c]/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
        style={{
          transform: 'translate(-50%, calc(-100% - 14px))',
          borderRadius: '10px',
          whiteSpace: 'nowrap',
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: zone.warna }}
          />
          <span className="text-[12px] font-semibold leading-none text-white">
            {zone.nama}
          </span>
          <span aria-hidden="true" className="text-[11px] leading-none opacity-80">
            {zone.ikon}
          </span>
        </span>
        <span className="block text-[10px] leading-tight text-white/70">{zone.petugas}</span>

        {/* Tongkat penunjuk ke titik 3D */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full h-3.5 w-px -translate-x-1/2 bg-white/65"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[calc(100%+12px)] h-1.5 w-1.5 -translate-x-1/2 rounded-full border border-white/70"
          style={{ background: zone.warna }}
        />

        {/* Penanda zona aktif */}
        {active ? (
          <span
            aria-hidden="true"
            className="absolute -inset-1 -z-10 animate-pulse rounded-xl border"
            style={{ borderColor: zone.warna }}
          />
        ) : null}
      </button>
    </Html>
  )
}

/** Kumpulan seluruh pin zona; dipasang di dalam Canvas. */
export function ZoneLabels() {
  const visible = useHeroStore(
    (state) =>
      state.phase !== 'loading' &&
      state.mode !== 'intro' &&
      state.mode !== 'walk' &&
      !state.infoOpen,
  )
  const activeZone = useHeroStore((state) => state.activeZone)
  // Pin disembunyikan selama teks hero masih terbaca agar tidak menutupinya.
  const [pastHeroCopy, setPastHeroCopy] = useState(false)

  useFrame(() => {
    const next = heroMotion.scroll > 0.1
    if (next !== pastHeroCopy) setPastHeroCopy(next)
  })

  if (!visible || !pastHeroCopy) return null

  return (
    <group>
      {ZONES.map((zone) => (
        <ZonePin key={zone.id} zone={zone} active={zone.id === activeZone} />
      ))}
    </group>
  )
}
