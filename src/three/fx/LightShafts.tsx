import * as THREE from 'three'
import { PALETTE } from '../../config/scene'
import { useSceneStore } from '../../store/useSceneStore'

/** Empat jendela di dinding selatan (z = +5.9). */
const BEAMS = [
  { x: -6, opacity: 0.045 },
  { x: -2, opacity: 0.06 },
  { x: 2, opacity: 0.05 },
  { x: 6, opacity: 0.04 },
]

/**
 * Berkas cahaya (light shafts) dari jendela selatan: bidang transparan
 * dengan blending additive. Hanya tampil saat siang & tier menengah/tinggi.
 */
export function LightShafts() {
  const day = useSceneStore((state) => state.dayMode === 'day')
  if (!day) return null

  return (
    <group position={[0, 3.2, 5.2]}>
      {BEAMS.map((beam) => (
        <mesh
          key={beam.x}
          position={[beam.x, -1.25, -1.5]}
          rotation={[0.52, 0, 0]}
        >
          <planeGeometry args={[0.7, 4.8]} />
          <meshBasicMaterial
            color={PALETTE.daylight}
            transparent
            opacity={beam.opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
