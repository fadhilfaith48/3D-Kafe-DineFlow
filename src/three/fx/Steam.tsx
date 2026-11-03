import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PARTICLES } from '../../config/scene'

interface SteamProps {
  positions: [number, number, number][]
  perCup: number
}

const dummy = new THREE.Object3D()

/**
 * Uap kopi: partikel bulat kecil (instanced) yang naik, bergoyang,
 * lalu mengecil dan menghilang sebelum diulang dari bawah.
 * Tanpa tekstur eksternal agar tetap ringan.
 */
export function Steam({ positions, perCup }: SteamProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  const particles = useMemo(() => {
    const list: {
      x: number
      y: number
      z: number
      offset: number
      speed: number
      drift: number
      size: number
    }[] = []

    positions.forEach(([x, y, z]) => {
      for (let index = 0; index < perCup; index += 1) {
        list.push({
          x,
          y,
          z,
          offset: Math.random(),
          speed: 0.7 + Math.random() * 0.7,
          drift: Math.random() * Math.PI * 2,
          size: 0.6 + Math.random() * 0.7,
        })
      }
    })

    return list
  }, [positions, perCup])

  useFrame((state) => {
    const instanced = mesh.current
    if (!instanced) return

    const time = state.clock.getElapsedTime()

    particles.forEach((particle, index) => {
      const progress =
        (time * PARTICLES.steamSpeed * particle.speed + particle.offset) % 1

      const rise = progress * 0.8
      const sway =
        Math.sin(progress * Math.PI * 2 + particle.drift) * 0.035 * progress
      const wobble =
        Math.cos(progress * Math.PI * 1.6 + particle.drift) * 0.02 * progress
      // Mengecil di awal dan akhir => muncul & memudar tanpa transparansi per-partikel.
      const scale = Math.sin(progress * Math.PI) * 0.055 * particle.size

      dummy.position.set(particle.x + sway, particle.y + rise, particle.z + wobble)
      dummy.scale.setScalar(Math.max(0.001, scale))
      dummy.updateMatrix()
      instanced.setMatrixAt(index, dummy.matrix)
    })

    instanced.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      key={particles.length}
      ref={mesh}
      args={[undefined, undefined, Math.max(particles.length, 1)]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 7, 6]} />
      <meshBasicMaterial
        color="#FFF1DE"
        transparent
        opacity={0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
