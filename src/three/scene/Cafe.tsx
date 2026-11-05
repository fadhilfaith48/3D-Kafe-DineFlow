import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LIGHTING } from '../../config/scene'
import {
  CAFE_LAYOUT,
  getTableById,
  tableFromQuery,
  type SceneObject,
} from '../../data/sceneLayout'
import { useOrderStore } from '../../store/useOrderStore'
import { useSceneStore } from '../../store/useSceneStore'
import { useCafeTextures, type CafeTextureSets } from './cafeMaterials'
import { LayoutModels } from './LayoutModel'

/** Shell ruangan 20 × 12 dengan dinding cutaway selatan & timur. */
function RoomShell({ textures }: { textures: CafeTextureSets }) {
  const materials = useMemo(() => {
    const floorMap = textures.oak.albedo.clone()
    floorMap.repeat.set(7, 4)
    floorMap.needsUpdate = true
    const floorNormal = textures.oak.normal.clone()
    floorNormal.repeat.set(7, 4)
    floorNormal.needsUpdate = true
    const floorRough = textures.oak.roughness.clone()
    floorRough.repeat.set(7, 4)
    floorRough.needsUpdate = true
    const floorMetal = textures.oak.metallic.clone()
    floorMetal.repeat.set(7, 4)
    floorMetal.needsUpdate = true

    const wallMap = textures.plaster.albedo.clone()
    wallMap.repeat.set(6, 2.4)
    wallMap.needsUpdate = true
    const wallNormal = textures.plaster.normal.clone()
    wallNormal.repeat.set(6, 2.4)
    wallNormal.needsUpdate = true
    const wallRough = textures.plaster.roughness.clone()
    wallRough.repeat.set(6, 2.4)
    wallRough.needsUpdate = true

    return {
      floor: new THREE.MeshStandardMaterial({
        map: floorMap,
        normalMap: floorNormal,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughnessMap: floorRough,
        metalnessMap: floorMetal,
        color: '#D8B18C',
        roughness: 1,
        metalness: 1,
      }),
      wall: new THREE.MeshStandardMaterial({
        map: wallMap,
        normalMap: wallNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughnessMap: wallRough,
        color: '#F2E4D2',
        roughness: 1,
      }),
      wallShade: new THREE.MeshStandardMaterial({ color: '#C9AE8E', roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#4A2C18', roughness: 0.78 }),
      slab: new THREE.MeshStandardMaterial({ color: '#2A1A10', roughness: 0.9 }),
    }
  }, [textures])

  return (
    <group>
      {/* Lantai + slab tebal ala diorama. */}
      <mesh position={[0, -0.16, 0]} receiveShadow material={materials.floor}>
        <boxGeometry args={[20.6, 0.32, 12.6]} />
      </mesh>
      <mesh position={[0, -0.52, 0]} material={materials.slab}>
        <boxGeometry args={[21.3, 0.42, 13.3]} />
      </mesh>

      {/* Dinding penuh: utara & barat. */}
      <mesh
        position={[0, 2.1, -6.18]}
        receiveShadow
        material={materials.wall}
      >
        <boxGeometry args={[20.6, 4.2, 0.32]} />
      </mesh>
      <mesh
        position={[-10.18, 2.1, 0]}
        receiveShadow
        material={materials.wall}
      >
        <boxGeometry args={[0.32, 4.2, 12.6]} />
      </mesh>

      {/* Dinding cutaway: plinth rendah selatan & timur. */}
      <mesh position={[0, 0.29, 6.18]} receiveShadow material={materials.wallShade}>
        <boxGeometry args={[20.6, 0.58, 0.32]} />
      </mesh>
      <mesh position={[10.18, 0.29, 0]} receiveShadow material={materials.wallShade}>
        <boxGeometry args={[0.32, 0.58, 12.6]} />
      </mesh>

      {/* Lis kayu di atas plinth. */}
      <mesh position={[0, 0.61, 6.18]} material={materials.wood}>
        <boxGeometry args={[20.66, 0.07, 0.4]} />
      </mesh>
      <mesh position={[10.18, 0.61, 0]} material={materials.wood}>
        <boxGeometry args={[0.4, 0.07, 12.66]} />
      </mesh>

      {/* Lis dinding penuh. */}
      <mesh position={[0, 0.1, -5.98]} material={materials.wood}>
        <boxGeometry args={[20.2, 0.2, 0.08]} />
      </mesh>
      <mesh position={[-9.98, 0.1, 0]} material={materials.wood}>
        <boxGeometry args={[0.08, 0.2, 12.2]} />
      </mesh>

      {/* Track lampu tipis (tanpa langit-langit). */}
      {[-4.3, -2.55, 2.75].map((z) => (
        <mesh key={z} position={[0, 4.18, z]} material={materials.wood}>
          <boxGeometry args={[17.5, 0.05, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}

/** Lima lampu gantung: model GLB + point light yang menguat di malam hari. */
function PendantLights() {
  const day = useSceneStore((state) => state.dayMode === 'day')
  const lamps = useMemo(
    () => CAFE_LAYOUT.objects.filter((object) => object.type === 'light'),
    [],
  )
  const intensity = day ? LIGHTING.lampDayIntensity : LIGHTING.lampNightIntensity

  return (
    <>
      {lamps.map((lamp) => (
        <pointLight
          key={lamp.id}
          position={[lamp.position[0], 3.05, lamp.position[2]]}
          intensity={intensity}
          distance={LIGHTING.lampDistance}
          decay={2}
          color="#FFB066"
        />
      ))}
      {/* Cahaya isi ruangan lembut di malam hari. */}
      {!day ? (
        <>
          <pointLight position={[-6, 2.6, 0]} intensity={7} distance={13} decay={2} color="#FFC48A" />
          <pointLight position={[5, 2.8, 2]} intensity={6} distance={12} decay={2} color="#FFB066" />
        </>
      ) : null}
    </>
  )
}

/** Cincin cahaya + label pada meja yang dipindai lewat QR. */
function TableGlow() {
  const rawTable = useOrderStore((state) => state.tableId)
  const tableId = useMemo(() => tableFromQuery(rawTable), [rawTable])
  const table = tableId ? getTableById(tableId) : undefined
  const ring = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (!table) return
    const pulse = 0.65 + Math.sin(state.clock.elapsedTime * 2.2) * 0.2
    const ringMaterial = ring.current?.material as THREE.MeshBasicMaterial | undefined
    if (ringMaterial) ringMaterial.opacity = pulse
    const beamMaterial = beam.current?.material as THREE.MeshBasicMaterial | undefined
    if (beamMaterial) beamMaterial.opacity = 0.06 + pulse * 0.07
    if (light.current) light.current.intensity = 1.6 + pulse * 1.8
  })

  if (!table) return null
  const [x, , z] = table.position
  const label = `Meja ${table.id.slice(-2)}`
  // Permukaan meja hasil generator berada di y = 0,75.
  const tabletop = 0.765

  return (
    <group>
      {/* Cincin & piringan cahaya tepat di atas permukaan meja. */}
      <mesh ref={ring} position={[x, tabletop, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 64]} />
        <meshBasicMaterial
          color="#FFB066"
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[x, tabletop - 0.006, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.47, 48]} />
        <meshBasicMaterial
          color="#FF9A3C"
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Berkas cahaya vertikal agar meja terlihat dari kamera jauh. */}
      <mesh ref={beam} position={[x, tabletop + 0.58, z]}>
        <cylinderGeometry args={[0.3, 0.46, 1.16, 32, 1, true]} />
        <meshBasicMaterial
          color="#FFB066"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={light}
        position={[x, 1.15, z]}
        intensity={2.2}
        distance={3.2}
        decay={2}
        color="#FFB066"
      />
      <Html position={[x, 1.65, z]} center distanceFactor={11} zIndexRange={[15, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-lamp/60 bg-[#14100c]/90 px-3 py-1 text-[11px] font-semibold text-[#FFD9A8] shadow-lg">
          {label} · QR aktif
        </div>
      </Html>
    </group>
  )
}

/**
 * Scene kafe utama: shell ruangan, seluruh objek dari `cafe_hero.json`,
 * lampu gantung, dan sorotan meja QR.
 */
export function Cafe() {
  const textures = useCafeTextures()
  const objects = CAFE_LAYOUT.objects as SceneObject[]

  return (
    <group>
      <RoomShell textures={textures} />
      <LayoutModels objects={objects} textures={textures} />
      <PendantLights />
      <TableGlow />
    </group>
  )
}
