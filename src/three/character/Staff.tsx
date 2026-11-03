import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { TIERS } from '../../lib/quality'
import { useHeroStore } from '../../store/useHeroStore'
import type { PersonAnimation, ZoneId } from '../../types/scene'
import { Person } from './Person'
import { TABLES, WAITER_ROUTE, WAITER_SPEED } from '../scene/props'

/* ────────────────────────────────────────────────────────────
   GAYA SERAGAM — ubah warna di sini
   ──────────────────────────────────────────────────────────── */

export const STAFF_STYLE = {
  bima: {
    position: [-5.6, 0, -4.35] as [number, number, number],
    skinColor: '#D9A87A',
    outfitColor: '#F7F3EA', // jas koki putih
    apronColor: '#E9E2D2',
    pantsColor: '#4A4A52',
    hairColor: '#2C1B12',
  },
  rani: {
    position: [0.1, 0, -3.65] as [number, number, number],
    skinColor: '#E9BA8E',
    outfitColor: '#F0E2CE',
    apronColor: '#5B3722', // apron cokelat
    pantsColor: '#3F3A34',
    hairColor: '#2C1B12',
  },
  dina: {
    position: [6.2, 0, -3.55] as [number, number, number],
    skinColor: '#EBC49B',
    outfitColor: '#E7E9E2', // kemeja rapi
    pantsColor: '#3E4652',
    hairColor: '#4A2C1B',
  },
  andi: {
    position: [-2.4, 0, -3.6] as [number, number, number],
    skinColor: '#C8946B',
    outfitColor: '#F4F0E6', // kemeja putih
    apronColor: '#2E2E33', // rompi hitam
    pantsColor: '#2E2E33',
    hairColor: '#231610',
  },
} as const

/* ────────────────────────────────────────────────────────────
   HELPER
   ──────────────────────────────────────────────────────────── */

/** Tier rendah: animasi karakter di luar fokus hanya tiap 2 frame. */
function useUpdateEvery(zone: ZoneId): number {
  const tier = useHeroStore((state) => state.tier)
  const active = useHeroStore((state) => state.activeZone)
  if (tier !== 'low') return 1
  return active === zone ? 1 : TIERS.low.characterUpdateEvery
}

/** Klik karakter = klik pin zonanya: kamera mendekat + kartu info muncul. */
const focusOn =
  (zone: ZoneId) =>
  (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation()
    useHeroStore.getState().focusZone(zone)
  }

/* ────────────────────────────────────────────────────────────
   1. KOKI — Chef Bima (mengaduk wajan di dapur)
   ──────────────────────────────────────────────────────────── */

export function Koki() {
  const updateEvery = useUpdateEvery('dapur')
  const style = STAFF_STYLE.bima

  return (
    <Person
      position={style.position}
      rotation={[0, 0, 0]}
      skinColor={style.skinColor}
      hairColor={style.hairColor}
      hairStyle="chefHat"
      outfitColor={style.outfitColor}
      apronColor={style.apronColor}
      pantsColor={style.pantsColor}
      accessory="mustache"
      animation="stir"
      seed={1}
      updateEvery={updateEvery}
      onClick={focusOn('dapur')}
    />
  )
}

/* ────────────────────────────────────────────────────────────
   2. BARISTA — Rani (menyeduh & menuang kopi)
   ──────────────────────────────────────────────────────────── */

export function Barista() {
  const updateEvery = useUpdateEvery('bar')
  const style = STAFF_STYLE.rani

  return (
    <Person
      position={style.position}
      rotation={[0, 0, 0]}
      skinColor={style.skinColor}
      hairColor={style.hairColor}
      hairStyle="bun"
      outfitColor={style.outfitColor}
      apronColor={style.apronColor}
      pantsColor={style.pantsColor}
      animation="brew"
      seed={2}
      updateEvery={updateEvery}
      onClick={focusOn('bar')}
    />
  )
}

/* ────────────────────────────────────────────────────────────
   3. KASIR — Dina (mengetik di mesin kasir)
   ──────────────────────────────────────────────────────────── */

export function Kasir() {
  const updateEvery = useUpdateEvery('kasir')
  const style = STAFF_STYLE.dina

  return (
    <Person
      position={style.position}
      rotation={[0, 0, 0]}
      skinColor={style.skinColor}
      hairColor={style.hairColor}
      hairStyle="long"
      outfitColor={style.outfitColor}
      pantsColor={style.pantsColor}
      accessory="nametag"
      animation="typing"
      seed={3}
      updateEvery={updateEvery}
      onClick={focusOn('kasir')}
    />
  )
}

/* ────────────────────────────────────────────────────────────
   4. PELAYAN — Andi (jalur tetap + berhenti 2 detik tiap meja)
   ──────────────────────────────────────────────────────────── */

interface RouteLeg {
  tStart: number
  tEnd: number
  dwelling: boolean
  uStart: number
  uEnd: number
  face?: [number, number]
}

interface Route {
  curve: THREE.CatmullRomCurve3
  legs: RouteLeg[]
  lap: number
}

/** Susun jalur: jarak antar titik dihitung dari panjang kurva. */
function buildRoute(): Route {
  const points = WAITER_ROUTE.map((item) => new THREE.Vector3(item.p[0], 0, item.p[1]))
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.15)
  const count = points.length
  const samples = count * 100

  // Panjang kumulatif → pecahan panjang (u) tiap titik simpul.
  const cumulative = new Float32Array(samples + 1)
  const previous = new THREE.Vector3()
  curve.getPoint(0, previous)
  let accumulated = 0
  for (let index = 1; index <= samples; index++) {
    const point = curve.getPoint(index / samples)
    accumulated += point.distanceTo(previous)
    cumulative[index] = accumulated
    previous.copy(point)
  }
  const total = accumulated || 1
  const uAt = (t: number) => cumulative[Math.round(t * samples)] / total
  const waypoints = WAITER_ROUTE.map((_, index) => uAt(index / count))

  const legs: RouteLeg[] = []
  let time = 0
  for (let index = 0; index < count; index++) {
    const stop = WAITER_ROUTE[index]
    const u = waypoints[index]

    if (stop.d > 0) {
      legs.push({ tStart: time, tEnd: time + stop.d, dwelling: true, uStart: u, uEnd: u, face: stop.f })
      time += stop.d
    }

    const nextU = waypoints[(index + 1) % count]
    let delta = nextU - u
    if (delta <= 0) delta += 1
    const travel = (delta * total) / WAITER_SPEED
    legs.push({
      tStart: time,
      tEnd: time + travel,
      dwelling: false,
      uStart: u,
      uEnd: u + delta,
    })
    time += travel
  }

  return { curve, legs, lap: time }
}

export function Pelayan() {
  const root = useRef<THREE.Group>(null)
  const route = useMemo(buildRoute, [])
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const updateEvery = useUpdateEvery('makan')
  const [walking, setWalking] = useState(true)
  const walkingRef = useRef(true)

  const point = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const group = root.current
    if (!group) return
    const dt = Math.min(delta, 0.05)

    // prefers-reduced-motion: pelayan berhenti berjalan di titik awal.
    if (reducedMotion) {
      route.curve.getPointAt(0, point)
      group.position.set(point.x, 0, point.z)
      const stop = WAITER_ROUTE[0]
      if (stop.f) group.rotation.y = Math.atan2(stop.f[0] - point.x, stop.f[1] - point.z)
      if (walkingRef.current) {
        walkingRef.current = false
        setWalking(false)
      }
      return
    }

    const time = state.clock.getElapsedTime() % route.lap
    const leg =
      route.legs.find((item) => time >= item.tStart && time < item.tEnd) ?? route.legs[0]

    let angle: number | null = null
    const progress = (time - leg.tStart) / Math.max(0.0001, leg.tEnd - leg.tStart)

    if (leg.dwelling) {
      route.curve.getPointAt(leg.uStart % 1, point)
      if (leg.face) angle = Math.atan2(leg.face[0] - point.x, leg.face[1] - point.z)
    } else {
      const u = (leg.uStart + (leg.uEnd - leg.uStart) * progress) % 1
      route.curve.getPointAt(u, point)
      route.curve.getTangentAt(u, tangent)
      angle = Math.atan2(tangent.x, tangent.z)
    }

    group.position.set(point.x, 0, point.z)

    if (angle !== null) {
      const current = group.rotation.y
      const diff = Math.atan2(Math.sin(angle - current), Math.cos(angle - current))
      group.rotation.y = current + diff * (1 - Math.exp(-7 * dt))
    }

    // Berhenti di meja = kaki Person ikut mengecilkan langkahnya.
    const isWalking = !leg.dwelling
    if (isWalking !== walkingRef.current) {
      walkingRef.current = isWalking
      setWalking(isWalking)
    }
  })

  const style = STAFF_STYLE.andi

  return (
    <group ref={root} position={style.position}>
      <Person
        skinColor={style.skinColor}
        hairColor={style.hairColor}
        hairStyle="short"
        outfitColor={style.outfitColor}
        apronColor={style.apronColor}
        pantsColor={style.pantsColor}
        animation="walkCarry"
        walkSpeed={walking ? 1 : 0}
        seed={4}
        updateEvery={updateEvery}
        onClick={focusOn('makan')}
      >
        {/* Nampan berisi pesanan — selalu datar */}
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.5, 0.03, 0.34]} />
            <meshStandardMaterial color="#9AA0A6" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[-0.13, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.11, 14]} />
            <meshStandardMaterial color="#F3E9DC" roughness={0.42} />
          </mesh>
          <mesh position={[0.12, 0.055, 0.02]} castShadow>
            <boxGeometry args={[0.18, 0.08, 0.14]} />
            <meshStandardMaterial color="#E8D2A8" roughness={0.7} />
          </mesh>
          <mesh position={[0.12, 0.1, 0.02]} castShadow>
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshStandardMaterial color="#C2603A" roughness={0.65} />
          </mesh>
        </group>
      </Person>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   5. PELANGGAN — 4 orang duduk di meja
   ──────────────────────────────────────────────────────────── */

interface CustomerSpec {
  table: number
  chair: number
  animation: PersonAnimation
  seed: number
  skinColor: string
  hairColor: string
  hairStyle: 'bun' | 'short' | 'long'
  outfitColor: string
  pantsColor: string
}

const CUSTOMERS: CustomerSpec[] = [
  {
    table: 1,
    chair: 0,
    animation: 'sitEat',
    seed: 11,
    skinColor: '#E9BA8E',
    hairColor: '#3A241A',
    hairStyle: 'short',
    outfitColor: '#C2603A',
    pantsColor: '#3F4A57',
  },
  {
    table: 3,
    chair: 1,
    animation: 'sitPhone',
    seed: 12,
    skinColor: '#D9A87A',
    hairColor: '#231610',
    hairStyle: 'long',
    outfitColor: '#4E8D5B',
    pantsColor: '#4A4A52',
  },
  {
    table: 6,
    chair: 0,
    animation: 'sitEat',
    seed: 13,
    skinColor: '#C8946B',
    hairColor: '#4A2C1B',
    hairStyle: 'short',
    outfitColor: '#B5652F',
    pantsColor: '#3E4652',
  },
  {
    table: 6,
    chair: 2,
    animation: 'sitPhone',
    seed: 14,
    skinColor: '#EBC49B',
    hairColor: '#2C1B12',
    hairStyle: 'bun',
    outfitColor: '#7A6A4F',
    pantsColor: '#2E2E33',
  },
]

function Pelanggan({ spec }: { spec: CustomerSpec }) {
  const updateEvery = useUpdateEvery('makan')

  const spot = useMemo(() => {
    const table = TABLES.find((item) => item.id === spec.table)
    const offset = table?.chairs[spec.chair]
    if (!table || !offset) return null
    return {
      position: [table.x + offset[0], 0, table.z + offset[1]] as [number, number, number],
      rotation: [0, Math.atan2(-offset[0], -offset[1]), 0] as [number, number, number],
    }
  }, [spec])

  if (!spot) return null

  return (
    <Person
      position={spot.position}
      rotation={spot.rotation}
      skinColor={spec.skinColor}
      hairColor={spec.hairColor}
      hairStyle={spec.hairStyle}
      outfitColor={spec.outfitColor}
      pantsColor={spec.pantsColor}
      animation={spec.animation}
      seed={spec.seed}
      updateEvery={updateEvery}
      onClick={focusOn('makan')}
    />
  )
}

/** Seluruh penghuni kafe. */
export function Staff() {
  return (
    <group>
      <Koki />
      <Barista />
      <Kasir />
      <Pelayan />
      {CUSTOMERS.map((spec) => (
        <Pelanggan key={`${spec.table}-${spec.chair}`} spec={spec} />
      ))}
    </group>
  )
}
