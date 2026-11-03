import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../../config/scene'
import { clamp } from '../../lib/math'
import { heroMotion } from '../../lib/scroll'
import { useHeroStore } from '../../store/useHeroStore'

/* ────────────────────────────────────────────────────────────
   1. MATERIAL & GEOMETRI BERSAMA — dipakai ulang seluruh adegan
   ──────────────────────────────────────────────────────────── */

const std = (
  color: string,
  roughness: number,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })

export const MAT = {
  wall: std(PALETTE.wall, 0.95),
  wallLight: std('#F3E7D6', 0.95),
  floor: std(PALETTE.floor, 0.82, { metalness: 0.04 }),
  floorEdge: std('#5C3A21', 0.9),
  wood: std(PALETTE.wood, 0.75),
  woodDark: std('#573119', 0.8),
  woodLight: std('#A9713F', 0.7),
  steel: std('#C7CCD1', 0.35, { metalness: 0.72 }),
  steelDark: std('#8E949A', 0.4, { metalness: 0.65 }),
  metal: std(PALETTE.metal, 0.45, { metalness: 0.6 }),
  ceramic: std(PALETTE.ceramic, 0.42),
  glass: std('#CFE6F7', 0.12, {
    metalness: 0.1,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  }),
  leaf: std(PALETTE.leaf, 0.85),
  leafDark: std('#2F6B3C', 0.85),
  pot: std('#C97B4A', 0.85),
  rug: std('#7C4326', 1),
  rugEdge: std('#5E3018', 1),
  chalk: std(PALETTE.chalk, 0.95),
  cake: std('#E8A87C', 0.7),
  cream: std('#F5E9D8', 0.75),
  dark: std('#2A2A30', 0.6, { metalness: 0.3 }),
  stoveTop: std('#241A16', 0.55, { metalness: 0.3 }),
}

/** Geometri unit yang diskalakan lewat matriks (hemat alokasi). */
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
}

/* ────────────────────────────────────────────────────────────
   2. INSTANCING — meja, kursi, cangkir, piring, lampu
   ──────────────────────────────────────────────────────────── */

export interface Transform {
  p: [number, number, number]
  r?: [number, number, number]
  s?: number
}

/** InstancedMesh: satu geometri + satu material, banyak posisi. */
export function InstanceSet({
  transforms,
  castShadow = true,
  receiveShadow = true,
  children,
}: {
  transforms: Transform[]
  castShadow?: boolean
  receiveShadow?: boolean
  children: ReactNode
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const euler = new THREE.Euler()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()

    transforms.forEach((item, index) => {
      euler.set(item.r?.[0] ?? 0, item.r?.[1] ?? 0, item.r?.[2] ?? 0)
      quaternion.setFromEuler(euler)
      position.set(item.p[0], item.p[1], item.p[2])
      const size = item.s ?? 1
      scale.set(size, size, size)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [transforms])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  )
}

/* ────────────────────────────────────────────────────────────
   3. TEKS 3D — CanvasTexture prosedural (tanpa font/aset eksternal)
   ──────────────────────────────────────────────────────────── */

function textTexture(
  text: string,
  options: { width: number; height: number; color: string; glow: boolean },
) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  // Rasio kanvas mengikuti rasio papan agar teks tidak melar.
  canvas.height = Math.max(64, Math.min(512, Math.round((512 * options.height) / options.width)))
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const size = Math.round(canvas.height * 0.52)
  context.font = `700 ${size}px "Plus Jakarta Sans Variable", system-ui, sans-serif`

  if (options.glow) {
    context.shadowColor = options.color
    context.shadowBlur = 28
    context.fillStyle = options.color
    context.fillText(text, canvas.width / 2, canvas.height / 2)
    context.fillText(text, canvas.width / 2, canvas.height / 2)
    context.shadowBlur = 0
  } else {
    context.fillStyle = options.color
    context.fillText(text, canvas.width / 2, canvas.height / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export interface SignProps {
  text: string
  /** Lebar papan (unit dunia) */
  width: number
  height: number
  position: [number, number, number]
  rotation?: [number, number, number]
  background?: string
  color?: string
  /** true = papan kayu; false = neon menyala (hanya teks) */
  board?: boolean
}

/** Plakat kayu / neon dengan tulisan hasil CanvasTexture. */
export function Sign({
  text,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  background = '#573119',
  color = '#F6EADA',
  board = true,
}: SignProps) {
  const texture = useMemo(
    () => textTexture(text, { width, height, color, glow: !board }),
    [text, width, height, color, board],
  )

  useEffect(() => () => texture?.dispose(), [texture])

  return (
    <group position={position} rotation={rotation}>
      {board ? (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, 0.08]} />
          <meshStandardMaterial color={background} roughness={0.78} />
        </mesh>
      ) : null}
      <mesh position={[0, 0, board ? 0.05 : 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   4. DATA DENAH — 16 × 10 satuan, pusat (0,0)
   ──────────────────────────────────────────────────────────── */

export const ROOM = {
  minX: -8,
  maxX: 8,
  minZ: -5,
  maxZ: 5,
  height: 4.6,
  /** tebal dinding */
  t: 0.3,
  /** tinggi potongan dinding depan/kanan (cutaway) */
  plinth: 0.45,
}

export const TABLE_TOP_Y = 0.74
export const COUNTER_Y = 1.06
export const RAIL_Y = 4.2

export interface TableDef {
  id: number
  x: number
  z: number
  /** offset kursi terhadap pusat meja */
  chairs: [number, number][]
}

/** 6 meja area makan. Sisi yang kosong dipakai pelayan mengantar. */
export const TABLES: TableDef[] = [
  { id: 1, x: -4.6, z: 1.1, chairs: [[0, 1.05], [1.05, 0]] },
  { id: 2, x: -4.6, z: 3.4, chairs: [[0, 1.05], [1.05, 0]] },
  { id: 3, x: 0, z: 1.1, chairs: [[-1.05, 0], [0, -1.05]] },
  { id: 4, x: 0, z: 3.4, chairs: [[-1.05, 0], [0, -1.05]] },
  { id: 5, x: 4.6, z: 1.1, chairs: [[0, 1.05], [-1.05, 0]] },
  { id: 6, x: 4.6, z: 3.4, chairs: [[0, 1.05], [1.05, 0], [-1.05, 0]] },
]

/** Menghadap pusat meja (Person selalu menghadap +Z). */
const faceTable = (dx: number, dz: number) => Math.atan2(-dx, -dz)

export const CHAIR_TRANSFORMS: Transform[] = TABLES.flatMap((table) =>
  table.chairs.map(([dx, dz]) => ({
    p: [table.x + dx, 0, table.z + dz] as [number, number, number],
    r: [0, faceTable(dx, dz), 0] as [number, number, number],
  })),
)

export const TABLE_TRANSFORMS: Transform[] = TABLES.map((table) => ({
  p: [table.x, 0, table.z] as [number, number, number],
}))

/** Lampu gantung tepat di atas tiap meja, digantung dari dua rel. */
export const LAMP_POSITIONS: [number, number, number][] = TABLES.map((table) => [
  table.x,
  RAIL_Y,
  table.z,
])

/** Rel lampu memanjang pada sumbu X di kedua baris meja. */
export const LAMP_RAILS: { z: number; from: number; to: number }[] = [
  { z: 1.1, from: -6.4, to: 6.4 },
  { z: 3.4, from: -6.4, to: 6.4 },
]

/** Cangkir & piring instanced di atas meja (2 per meja yang terisi). */
export const TABLEWARE: Transform[] = TABLES.flatMap((table, index) => {
  const y = TABLE_TOP_Y + 0.045
  const items: Transform[] = [
    { p: [table.x - 0.3, y, table.z + 0.22] },
    { p: [table.x + 0.34, y, table.z - 0.2] },
  ]
  if (index % 2 === 0) items.push({ p: [table.x + 0.05, y, table.z + 0.42] })
  return items
})

/**
 * Jalur pelayan (SATU-SATU-NYA, berulang, tidak acak):
 * pass-through dapur → meja 2 → meja 4 → meja 5 → kembali.
 * `d` = lama berhenti (detik); 0 = hanya belokan.
 * `f` = titik yang dihadapi saat berhenti (meja / jendela).
 */
export const WAITER_ROUTE: { p: [number, number]; d: number; f?: [number, number] }[] = [
  { p: [-2.4, -3.6], d: 1.6, f: [-3.0, -3.6] }, // ambil pesanan di pass-through
  { p: [-3.6, -0.6], d: 0 }, // belokan di ujung sekat dapur
  { p: [-4.6, 2.1], d: 2.0, f: [-4.6, 3.4] }, // meja 2
  { p: [0, 4.7], d: 2.0, f: [0, 3.4] }, // meja 4
  { p: [6.2, 4.6], d: 0 }, // belokan timur
  { p: [6.0, 1.1], d: 2.0, f: [4.6, 1.1] }, // meja 5
  { p: [0, -0.6], d: 0 }, // jalur pulang di depan bar
]

/** Kecepatan jalan pelayan (satuan/detik). */
export const WAITER_SPEED = 1.5

/* ────────────────────────────────────────────────────────────
   5. DEKOR KECIL — tanaman, lampu gantung, uap wajan
   ──────────────────────────────────────────────────────────── */

const FOLIAGE: { p: [number, number, number]; r: number; m: THREE.Material }[] = [
  { p: [0, 0.82, 0], r: 0.34, m: MAT.leaf },
  { p: [-0.24, 0.68, 0.12], r: 0.26, m: MAT.leafDark },
  { p: [0.26, 0.7, -0.1], r: 0.28, m: MAT.leaf },
  { p: [0.06, 1.06, 0.06], r: 0.24, m: MAT.leafDark },
]

export function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow material={MAT.pot}>
        <cylinderGeometry args={[0.3, 0.22, 0.48, 14]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={MAT.pot}>
        <cylinderGeometry args={[0.33, 0.33, 0.06, 14]} />
      </mesh>
      {FOLIAGE.map((leaf, index) => (
        <mesh key={index} position={leaf.p} castShadow material={leaf.m}>
          <sphereGeometry args={[leaf.r, 12, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/** Lampu gantung di atas meja: kabel dari rel, kap, bola, cahaya hangat. */
export function PendantLamp({
  index,
  position,
  cableLength,
  withLight,
}: {
  index: number
  position: [number, number, number]
  cableLength: number
  withLight: boolean
}) {
  const swing = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const bulb = useRef<THREE.MeshStandardMaterial>(null)
  const reducedMotion = useHeroStore((state) => state.reducedMotion)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    // Menyala SATU PER SATU di akhir intro: lampu ke-n menyala
    // setelah lampu ke-(n-1) cukup terang.
    const raw = clamp(heroMotion.lampPower * 1.45 - index * 0.09, 0, 1)
    const power = raw * raw * (3 - 2 * raw)
    if (swing.current && !reducedMotion) {
      swing.current.rotation.z = Math.sin(t * 0.55 + index * 1.7) * 0.03
      swing.current.rotation.x = Math.cos(t * 0.43 + index * 1.2) * 0.018
    }
    if (light.current) light.current.intensity = 16 * power
    if (bulb.current) bulb.current.emissiveIntensity = 0.25 + power * 2.6
  })

  return (
    <group ref={swing} position={position}>
      <mesh position={[0, -cableLength / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, cableLength, 6]} />
        <meshStandardMaterial color="#2A1B12" roughness={0.9} />
      </mesh>
      <mesh position={[0, -cableLength, 0]} castShadow material={MAT.metal}>
        <coneGeometry args={[0.26, 0.3, 20, 1, true]} />
      </mesh>
      <mesh position={[0, -cableLength - 0.13, 0]}>
        <sphereGeometry args={[0.075, 14, 12]} />
        <meshStandardMaterial
          ref={bulb}
          color={PALETTE.lamp}
          emissive={PALETTE.lamp}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {withLight ? (
        <pointLight
          ref={light}
          position={[0, -cableLength - 0.2, 0]}
          color={PALETTE.lamp}
          intensity={0}
          distance={5}
          decay={2}
        />
      ) : null}
    </group>
  )
}

/** Uap mengepul dari wajan + percikan api kecil. */
export function PanSteam({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    const cloud = group.current
    if (!cloud) return
    const t = state.clock.getElapsedTime()
    cloud.children.forEach((child, index) => {
      const cycle = (t * 0.32 + index / 7) % 1
      child.position.set(
        Math.sin(cycle * 5 + index) * 0.13,
        cycle * 1.15,
        Math.cos(cycle * 4 + index) * 0.1,
      )
      child.scale.setScalar(0.55 + cycle * 0.95)
      const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      material.opacity = (1 - cycle) * 0.4
    })
    cloud.position.x = Math.sin(t * 0.4) * 0.015
  })

  return (
    <group position={position}>
      <group ref={group}>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#F7F1E6" transparent opacity={0.35} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* Percikan api kecil di bawah wajan */}
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 14]} />
        <meshBasicMaterial color="#FF8A3C" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, -0.05, 0]} color="#FF9A4A" intensity={4} distance={2.4} decay={2} />
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   6. DAPUR — x -8…-3, z -5…-2,2
   ──────────────────────────────────────────────────────────── */

/** Kompor pulau + wajan (posisi tangan Chef Bima). */
export const STOVE_POS: [number, number, number] = [-5.6, 0, -3.5]
export const PAN_POS: [number, number, number] = [-5.6, 0.96, -3.72]

export function StoveIsland() {
  return (
    <group position={STOVE_POS}>
      {/* Badan kompor */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={MAT.steel}>
        <boxGeometry args={[2.2, 0.9, 1.0]} />
      </mesh>
      {/* Kaki panel */}
      <mesh position={[0, 0.06, 0]} material={MAT.steelDark}>
        <boxGeometry args={[2.0, 0.12, 0.84]} />
      </mesh>
      {/* Permukaan bakar */}
      <mesh position={[0, 0.92, 0]} material={MAT.stoveTop}>
        <boxGeometry args={[2.1, 0.05, 0.94]} />
      </mesh>
      {/* Dua kompor */}
      {[-0.55, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={MAT.dark}>
          <torusGeometry args={[0.17, 0.03, 8, 20]} />
        </mesh>
      ))}
      {/* Wajan + gagang */}
      <group position={[PAN_POS[0] - STOVE_POS[0], PAN_POS[1], PAN_POS[2] - STOVE_POS[2]]}>
        <mesh castShadow material={MAT.dark}>
          <cylinderGeometry args={[0.3, 0.26, 0.1, 20]} />
        </mesh>
        <mesh position={[0.38, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.woodDark}>
          <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.26, 18]} />
          <meshStandardMaterial color="#C97B2F" roughness={0.6} />
        </mesh>
      </group>
      {/* Panci kedua di kompor kanan */}
      <mesh position={[0.45, 1.0, 0.02]} castShadow material={MAT.steel}>
        <cylinderGeometry args={[0.19, 0.17, 0.16, 18]} />
      </mesh>
      {/* Kabinet bawah */}
      <mesh position={[0, 0.45, 0.51]} material={MAT.woodDark}>
        <boxGeometry args={[2.0, 0.7, 0.03]} />
      </mesh>
    </group>
  )
}

/** Hood penghisap asap di atas kompor. */
export function ExhaustHood() {
  return (
    <group position={[-5.6, 0, -3.5]}>
      <mesh position={[0, 2.4, 0]} castShadow material={MAT.steel}>
        <boxGeometry args={[1.8, 0.7, 1.2]} />
      </mesh>
      <mesh position={[0, 2.02, 0]} rotation={[Math.PI, 0, 0]} material={MAT.steelDark}>
        <boxGeometry args={[1.6, 0.1, 1.0]} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow material={MAT.steelDark}>
        <boxGeometry args={[0.7, 1.5, 0.7]} />
      </mesh>
      <mesh position={[0, 2.4, 0.61]} material={MAT.dark}>
        <boxGeometry args={[1.5, 0.28, 0.03]} />
      </mesh>
      {[-0.5, 0, 0.5].map((x) => (
        <mesh key={x} position={[x, 2.4, 0.63]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
          <meshStandardMaterial
            color={PALETTE.lamp}
            emissive={PALETTE.lamp}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Meja persiapan stainless di dinding belakang. */
export function PrepTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.87, 0]} castShadow receiveShadow material={MAT.steel}>
        <boxGeometry args={[1.6, 0.06, 0.9]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={MAT.steelDark}>
        <boxGeometry args={[1.5, 0.5, 0.8]} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial color="#6E7378" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Bumbu & talenan */}
      <mesh position={[-0.4, 0.94, 0.1]} castShadow material={MAT.woodLight}>
        <boxGeometry args={[0.5, 0.05, 0.34]} />
      </mesh>
      {([
        [0.25, 0.96, -0.15],
        [0.45, 0.96, -0.15],
        [0.65, 0.96, -0.15],
      ] as [number, number, number][]).map((p, index) => (
        <mesh key={index} position={p} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.14, 12]} />
          <meshStandardMaterial
            color={['#C4622F', '#E0A44E', '#6C8B45'][index]}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Kulkas dua pintu di sudut dapur. */
export function Fridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow material={MAT.steel}>
        <boxGeometry args={[1.0, 2.1, 0.85]} />
      </mesh>
      <mesh position={[0, 1.42, 0.44]} material={MAT.steelDark}>
        <boxGeometry args={[0.96, 0.06, 0.04]} />
      </mesh>
      <mesh position={[0.36, 1.7, 0.46]} material={MAT.metal}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
      </mesh>
      <mesh position={[0.36, 0.7, 0.46]} material={MAT.metal}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
      </mesh>
      {/* Magnet & catatan kecil */}
      <mesh position={[-0.2, 1.75, 0.435]}>
        <planeGeometry args={[0.24, 0.3]} />
        <meshStandardMaterial color="#F2E2B8" roughness={0.9} />
      </mesh>
      <mesh position={[-0.2, 1.83, 0.44]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color="#D2513F" roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Rak panci menggantung di dinding belakang. */
export function PotRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow material={MAT.wood}>
        <boxGeometry args={[1.6, 0.08, 0.4]} />
      </mesh>
      {[-0.5, -0.1, 0.3, 0.62].map((x, index) => (
        <group key={x} position={[x, -0.26, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
            <meshStandardMaterial color="#8E949A" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh castShadow material={index % 2 ? MAT.steel : MAT.dark}>
            <cylinderGeometry args={[0.15, 0.13, 0.1, 16]} />
          </mesh>
        </group>
      ))}
      {/* Panci berdiri di rak */}
      <mesh position={[0.75, 0.12, 0]} castShadow material={MAT.steel}>
        <cylinderGeometry args={[0.1, 0.1, 0.16, 14]} />
      </mesh>
    </group>
  )
}

/**
 * Sekat dapur ↔ area makan dengan JENDELA PASS-THROUGH.
 * Wajan diambil lewat sini oleh pelayan.
 */
export function KitchenPartition() {
  const x = -3
  return (
    <group>
      {/* Pilar utara (sisi dinding belakang) */}
      <mesh position={[x, ROOM.height / 2, -4.8]} castShadow receiveShadow material={MAT.wallLight}>
        <boxGeometry args={[ROOM.t, ROOM.height, 0.4]} />
      </mesh>
      {/* Pilar selatan (ujung sekat) */}
      <mesh position={[x, ROOM.height / 2, -1.8]} castShadow receiveShadow material={MAT.wallLight}>
        <boxGeometry args={[ROOM.t, ROOM.height, 0.4]} />
      </mesh>
      {/* Dinding bawah jendela */}
      <mesh position={[x, 0.55, -3.3]} castShadow receiveShadow material={MAT.wallLight}>
        <boxGeometry args={[ROOM.t, 1.1, 2.6]} />
      </mesh>
      {/* Dinding atas jendela */}
      <mesh position={[x, 2.8, -3.3]} castShadow receiveShadow material={MAT.wallLight}>
        <boxGeometry args={[ROOM.t, 1.2, 2.6]} />
      </mesh>
      {/* Ambang kayu */}
      <mesh position={[x, 1.14, -3.3]} castShadow material={MAT.wood}>
        <boxGeometry args={[0.44, 0.08, 2.7]} />
      </mesh>
      {/* Kusen jendela */}
      <mesh position={[x, 2.17, -3.3]} material={MAT.wood}>
        <boxGeometry args={[0.4, 0.08, 2.62]} />
      </mesh>
      {/* Nampan pesanan di ambang */}
      <mesh position={[x, 1.22, -3.6]} castShadow material={MAT.metal}>
        <boxGeometry args={[0.34, 0.03, 0.7]} />
      </mesh>
      <mesh position={[x, 1.3, -3.75]} castShadow material={MAT.ceramic}>
        <cylinderGeometry args={[0.11, 0.09, 0.12, 16]} />
      </mesh>
      <mesh position={[x, 1.29, -3.45]} castShadow material={MAT.ceramic}>
        <boxGeometry args={[0.22, 0.1, 0.16]} />
      </mesh>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   7. BAR KOPI — x -2…3, z -5…-2,2  (Rani di balik counter)
   ──────────────────────────────────────────────────────────── */

export const BAR_COUNTER: [number, number, number] = [0.5, 0, -2.8]
export const ESPRESSO_POS: [number, number, number] = [0, 1.09, -2.9]

export function BarCounter() {
  return (
    <group position={BAR_COUNTER}>
      {/* Badan counter */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={MAT.wood}>
        <boxGeometry args={[5.2, 1.0, 1.1]} />
      </mesh>
      {/* Panel depan bergaris */}
      {[-1.7, -0.55, 0.6, 1.75].map((x) => (
        <mesh key={x} position={[x, 0.52, 0.57]} material={MAT.woodDark}>
          <boxGeometry args={[0.95, 0.78, 0.04]} />
        </mesh>
      ))}
      {/* Top bar */}
      <mesh position={[0, 1.04, 0]} castShadow receiveShadow material={MAT.woodLight}>
        <boxGeometry args={[5.34, 0.09, 1.24]} />
      </mesh>
      {/* Bantalan kaki */}
      <mesh position={[0, 0.05, 0.6]} material={MAT.woodDark}>
        <boxGeometry args={[5.0, 0.1, 0.16]} />
      </mesh>
    </group>
  )
}

/** Mesin espresso dua group head di atas bar. */
export function EspressoMachine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.26, 0]} castShadow material={MAT.steel}>
        <boxGeometry args={[0.86, 0.52, 0.52]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow material={MAT.steelDark}>
        <boxGeometry args={[0.9, 0.07, 0.56]} />
      </mesh>
      <mesh position={[0, 0.3, 0.27]} material={MAT.metal}>
        <boxGeometry args={[0.72, 0.3, 0.03]} />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.06, 0.24]} rotation={[Math.PI / 2, 0, 0]} material={MAT.dark}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 14]} />
          </mesh>
          <mesh position={[x + 0.1, 0.02, 0.3]} rotation={[0, 0, Math.PI / 2]} material={MAT.dark}>
            <cylinderGeometry args={[0.018, 0.018, 0.24, 8]} />
          </mesh>
        </group>
      ))}
      {/* Nampan tetes + cangkir */}
      <mesh position={[0, -0.01, 0.3]} material={MAT.steelDark}>
        <boxGeometry args={[0.7, 0.03, 0.22]} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.3]} castShadow material={MAT.ceramic}>
          <cylinderGeometry args={[0.045, 0.036, 0.08, 14]} />
        </mesh>
      ))}
      {/* Steam wand */}
      <mesh position={[0.4, 0.16, 0.26]} rotation={[0, 0, -0.3]} material={MAT.steel}>
        <cylinderGeometry args={[0.014, 0.01, 0.32, 8]} />
      </mesh>
      {/* Tombol */}
      {[-0.2, 0, 0.2].map((x, index) => (
        <mesh key={x} position={[x, 0.44, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 10]} />
          <meshStandardMaterial
            color={index === 1 ? PALETTE.lamp : '#D8CDBC'}
            emissive={index === 1 ? PALETTE.lamp : '#000000'}
            emissiveIntensity={index === 1 ? 0.7 : 0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Grinder biji + silo kopi. */
export function Grinder({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow material={MAT.dark}>
        <cylinderGeometry args={[0.12, 0.14, 0.32, 16]} />
      </mesh>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.18, 16]} />
        <meshStandardMaterial color="#6B4B33" roughness={0.5} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={MAT.dark}>
        <cylinderGeometry args={[0.09, 0.1, 0.1, 14]} />
      </mesh>
      <mesh position={[0.02, 0.04, 0.15]} material={MAT.steelDark}>
        <boxGeometry args={[0.16, 0.03, 0.1]} />
      </mesh>
    </group>
  )
}

/** Rak cangkir terbalik di dinding bar. */
export function CupRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow material={MAT.wood}>
        <boxGeometry args={[1.3, 0.06, 0.34]} />
      </mesh>
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]} castShadow material={MAT.ceramic}>
          <cylinderGeometry args={[0.07, 0.06, 0.14, 14]} />
        </mesh>
      ))}
      {[-0.5, 0, 0.5].map((x) => (
        <mesh key={x} position={[x, -0.07, 0]} castShadow material={MAT.ceramic}>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 12]} />
        </mesh>
      ))}
    </group>
  )
}

/** Papan menu kapur di dinding belakang. */
export function ChalkMenuBoard({ position }: { position: [number, number, number] }) {
  const lines = [0.24, 0.09, -0.06, -0.21, -0.36]
  return (
    <group position={position}>
      <mesh castShadow material={MAT.wood}>
        <boxGeometry args={[2.4, 1.3, 0.08]} />
      </mesh>
      <mesh position={[0, 0, 0.046]} material={MAT.chalk}>
        <planeGeometry args={[2.24, 1.14]} />
      </mesh>
      {/* Judul */}
      <mesh position={[0, 0.44, 0.05]}>
        <planeGeometry args={[0.8, 0.05]} />
        <meshBasicMaterial color="#F3E4CB" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.36, 0.05]}>
        <planeGeometry args={[0.46, 0.016]} />
        <meshBasicMaterial color={PALETTE.lamp} transparent opacity={0.85} />
      </mesh>
      {/* Baris menu + harga */}
      {lines.map((y, index) => (
        <group key={y}>
          <mesh position={[-0.22, y, 0.05]}>
            <planeGeometry args={[1.2 - (index % 3) * 0.18, 0.024]} />
            <meshBasicMaterial color="#F6EADA" transparent opacity={0.45} />
          </mesh>
          <mesh position={[0.86, y, 0.05]}>
            <planeGeometry args={[0.3, 0.024]} />
            <meshBasicMaterial color={PALETTE.lamp} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Hiasan biji kopi */}
      <mesh position={[-0.96, 0.5, 0.05]} rotation={[0, 0, 0.4]}>
        <circleGeometry args={[0.06, 12]} />
        <meshBasicMaterial color={PALETTE.caramel} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   8. KASIR — x 4…8, z -4,5…-1,5  (Dina di balik meja)
   ──────────────────────────────────────────────────────────── */

export const CASHIER_COUNTER: [number, number, number] = [6.2, 0, -2.6]
/** Mesin kasir tepat di depan Dina. */
export const REGISTER_POS: [number, number, number] = [5.5, 1.09, -2.6]

export function CashierDesk() {
  return (
    <group position={CASHIER_COUNTER}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={MAT.wood}>
        <boxGeometry args={[3.4, 1.0, 1.1]} />
      </mesh>
      <mesh position={[0, 1.04, 0]} castShadow receiveShadow material={MAT.woodLight}>
        <boxGeometry args={[3.54, 0.09, 1.24]} />
      </mesh>
      {[-1.0, 0, 1.0].map((x) => (
        <mesh key={x} position={[x, 0.5, 0.57]} material={MAT.woodDark}>
          <boxGeometry args={[0.85, 0.74, 0.04]} />
        </mesh>
      ))}
      {/* Laci uang */}
      <mesh position={[-0.4, 0.72, 0.58]} material={MAT.steelDark}>
        <boxGeometry args={[0.6, 0.16, 0.04]} />
      </mesh>
    </group>
  )
}

/** Mesin kasir + layar kecil menghadap Dina. */
export function Register({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow material={MAT.cream}>
        <boxGeometry args={[0.5, 0.28, 0.42]} />
      </mesh>
      <mesh position={[0, 0.06, 0.22]} material={MAT.dark}>
        <boxGeometry args={[0.42, 0.1, 0.03]} />
      </mesh>
      {/* Layar menghadap kasir (-Z) */}
      <group position={[0, 0.4, -0.14]} rotation={[-0.35, Math.PI, 0]}>
        <mesh castShadow material={MAT.dark}>
          <boxGeometry args={[0.44, 0.32, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[0.38, 0.26]} />
          <meshStandardMaterial
            color="#7FD8B0"
            emissive="#7FD8B0"
            emissiveIntensity={0.55}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh position={[0, 0.3, -0.06]} material={MAT.dark}>
        <boxGeometry args={[0.06, 0.18, 0.06]} />
      </mesh>
    </group>
  )
}

/** Etalase kue kaca dengan tiga tingkat. */
export function DisplayCase({ position }: { position: [number, number, number] }) {
  const cakes: [number, number, number, string][] = [
    [-0.4, 0.14, 0, '#E8A87C'],
    [0, 0.14, 0, '#C87F5A'],
    [0.4, 0.14, 0, '#F0C070'],
    [-0.3, 0.36, 0, '#B5652F'],
    [0.15, 0.36, 0, '#E8D2A8'],
  ]
  return (
    <group position={position}>
      {/* Kaca */}
      <mesh position={[0, 0.3, 0]} material={MAT.glass}>
        <boxGeometry args={[1.3, 0.6, 0.86]} />
      </mesh>
      {/* Rangka */}
      <mesh position={[0, 0.61, 0]} castShadow material={MAT.metal}>
        <boxGeometry args={[1.34, 0.04, 0.9]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={MAT.metal}>
        <boxGeometry args={[1.34, 0.05, 0.9]} />
      </mesh>
      {/* Rak kue */}
      <mesh position={[0, 0.3, 0]} material={MAT.steelDark}>
        <boxGeometry args={[1.26, 0.02, 0.8]} />
      </mesh>
      {cakes.map(([x, y, z, color], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 14]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
      ))}
      {/* Kue tart tingkat */}
      <mesh position={[0.42, 0.44, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.16, 16]} />
        <meshStandardMaterial color="#F5E4D0" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Kotak tip di ujung meja kasir. */
export function TipBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.2, 0.2]} />
        <meshStandardMaterial color="#4E8D5B" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.14]} />
        <meshBasicMaterial color="#2A1A10" />
      </mesh>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   9. AREA MAKAN — 6 meja + 13 kursi (semuanya instanced)
   ──────────────────────────────────────────────────────────── */

const rotateY = (angle: number, x: number, z: number): [number, number] => [
  x * Math.cos(angle) + z * Math.sin(angle),
  -x * Math.sin(angle) + z * Math.cos(angle),
]

/** Sandaran kursi (offset lokal -Z sudah diputar sesuai arah duduk). */
const CHAIR_BACKS: Transform[] = CHAIR_TRANSFORMS.flatMap((chair) => {
  const [dx, dz] = rotateY(chair.r?.[1] ?? 0, 0, -0.17)
  return [{ p: [chair.p[0] + dx, 0.63, chair.p[2] + dz], r: chair.r }]
})

/** Empat kaki per kursi (13 × 4 = 52 instance). */
const CHAIR_LEGS: Transform[] = CHAIR_TRANSFORMS.flatMap((chair) =>
  [
    [0.15, 0.15],
    [-0.15, 0.15],
    [0.15, -0.15],
    [-0.15, -0.15],
  ].flatMap(([lx, lz]) => {
    const [dx, dz] = rotateY(chair.r?.[1] ?? 0, lx, lz)
    return [{ p: [chair.p[0] + dx, 0.18, chair.p[2] + dz] }]
  }),
)

/** Meja kaki tunggal + alas bundar. */
export function DiningTables() {
  return (
    <group>
      {/* Permukaan meja */}
      <InstanceSet transforms={TABLE_TRANSFORMS} receiveShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.07, 24]} />
        <meshStandardMaterial color="#A9713F" roughness={0.62} />
      </InstanceSet>
      {/* Tiang */}
      <InstanceSet transforms={TABLE_TRANSFORMS.map((item) => ({ p: [item.p[0], 0.36, item.p[2]] }))}>
        <cylinderGeometry args={[0.1, 0.14, 0.7, 14]} />
        <meshStandardMaterial color="#573119" roughness={0.8} />
      </InstanceSet>
      {/* Alas */}
      <InstanceSet transforms={TABLE_TRANSFORMS.map((item) => ({ p: [item.p[0], 0.04, item.p[2]] }))} castShadow={false}>
        <cylinderGeometry args={[0.4, 0.44, 0.08, 18]} />
        <meshStandardMaterial color="#3E2415" roughness={0.9} />
      </InstanceSet>

      {/* Kursi: dudukan */}
      <InstanceSet
        transforms={CHAIR_TRANSFORMS.map((chair) => ({ p: [chair.p[0], 0.4, chair.p[2]], r: chair.r }))}
      >
        <boxGeometry args={[0.44, 0.07, 0.44]} />
        <meshStandardMaterial color="#7A4A2B" roughness={0.7} />
      </InstanceSet>
      {/* Kursi: sandaran */}
      <InstanceSet transforms={CHAIR_BACKS}>
        <boxGeometry args={[0.44, 0.4, 0.06]} />
        <meshStandardMaterial color="#7A4A2B" roughness={0.7} />
      </InstanceSet>
      {/* Kursi: kaki */}
      <InstanceSet transforms={CHAIR_LEGS}>
        <boxGeometry args={[0.05, 0.36, 0.05]} />
        <meshStandardMaterial color="#573119" roughness={0.8} />
      </InstanceSet>

      {/* Gelas & piring di atas meja (instanced) */}
      <InstanceSet transforms={TABLEWARE} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.09, 16]} />
        <meshStandardMaterial color="#F3E9DC" roughness={0.4} />
      </InstanceSet>
    </group>
  )
}

/* ────────────────────────────────────────────────────────────
   10. ARSITEKTUR — jendela besar, pintu masuk, karpet
   ──────────────────────────────────────────────────────────── */

/** Jendela besar di dinding kiri (menghadap +X ke ruang makan). */
export function BigWindow({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* Cahaya langit di balik kaca */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial
          color="#CFE6F7"
          emissive="#CFE6F7"
          emissiveIntensity={1.35}
          roughness={0.4}
        />
      </mesh>
      {/* Matahari sore */}
      <mesh position={[1.0, 0.6, -0.04]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#FFE0AE" toneMapped={false} />
      </mesh>
      <mesh position={[1.0, 0.6, -0.06]}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color="#FFC98C" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      {/* Kusen */}
      {[[-1.7, 0], [1.7, 0]].map(([x]) => (
        <mesh key={x} position={[x, 0, 0.03]} material={MAT.wood}>
          <boxGeometry args={[0.16, 2.5, 0.16]} />
        </mesh>
      ))}
      {[-1.15, 1.15].map((y) => (
        <mesh key={y} position={[0, y, 0.03]} material={MAT.wood}>
          <boxGeometry args={[3.56, 0.16, 0.16]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.03]} material={MAT.wood}>
        <boxGeometry args={[0.09, 2.3, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.03]} material={MAT.wood}>
        <boxGeometry args={[3.5, 0.09, 0.12]} />
      </mesh>
      {/* Kaca */}
      <mesh position={[0, 0, 0.02]} material={MAT.glass}>
        <planeGeometry args={[3.4, 2.3]} />
      </mesh>
      {/* Ambang */}
      <mesh position={[0, -1.25, 0.16]} castShadow material={MAT.wood}>
        <boxGeometry args={[3.7, 0.12, 0.5]} />
      </mesh>
      {/* Pot mini di ambang */}
      <group position={[-1.2, -1.14, 0.18]}>
        <mesh castShadow material={MAT.pot}>
          <cylinderGeometry args={[0.1, 0.08, 0.16, 12]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow material={MAT.leaf}>
          <sphereGeometry args={[0.12, 12, 10]} />
        </mesh>
      </group>
    </group>
  )
}

/** Pintu kaca + neon "BUKA" di sisi kanan depan (sudut cutaway). */
export function EntranceDoor() {
  return (
    <group position={[7.0, 0, 4.75]}>
      {/* Tiang kusen */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 1.35, 0]} castShadow material={MAT.woodDark}>
          <boxGeometry args={[0.14, 2.7, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 2.76, 0]} castShadow material={MAT.woodDark}>
        <boxGeometry args={[1.84, 0.14, 0.2]} />
      </mesh>
      {/* Kaca pintu */}
      <mesh position={[0, 1.35, 0]} material={MAT.glass}>
        <boxGeometry args={[1.5, 2.5, 0.06]} />
      </mesh>
      {/* Gagang */}
      <mesh position={[0.6, 1.2, 0.1]} material={MAT.metal}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
      </mesh>
      {/* Neon BUKA */}
      <Sign
        text="BUKA"
        width={1.5}
        height={0.5}
        position={[0, 3.16, 0.06]}
        color="#FF8A3C"
        board={false}
      />
      {/* Plakat jam buka di kaca */}
      <Sign
        text="08.00 – 22.00"
        width={1.24}
        height={0.34}
        position={[0, 1.9, 0.06]}
        background="#23302A"
        color="#F6EADA"
      />
      {/* Pijakan pintu */}
      <mesh position={[0, 0.03, 0.1]} receiveShadow material={MAT.woodLight}>
        <boxGeometry args={[1.9, 0.06, 0.7]} />
      </mesh>
    </group>
  )
}

/** Karpet area makan (dua lapis supaya punya tepi). */
export function DiningRug() {
  return (
    <group>
      <mesh position={[0, 0.004, 2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT.rugEdge}>
        <planeGeometry args={[13.6, 5.4]} />
      </mesh>
      <mesh position={[0, 0.007, 2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={MAT.rug}>
        <planeGeometry args={[13.1, 4.9]} />
      </mesh>
      {/* Garis tengah */}
      <mesh position={[0, 0.009, 2.3]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.rugEdge}>
        <planeGeometry args={[12.6, 0.12]} />
      </mesh>
    </group>
  )
}




