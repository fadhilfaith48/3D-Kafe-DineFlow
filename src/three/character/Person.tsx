import { useEffect, useMemo, useRef, type ComponentType, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { USE_GLB_MODEL } from '../../config/scene'
import { clamp, damp } from '../../lib/math'
import { useHeroStore } from '../../store/useHeroStore'
import type { Accessory, HairStyle, PersonAnimation } from '../../types/scene'

export interface PersonProps {
  skinColor?: string
  hairColor?: string
  hairStyle?: HairStyle
  outfitColor?: string
  pantsColor?: string
  /** Bila diisi, figur memakai celemek/apron. */
  apronColor?: string
  accessory?: Accessory
  accessoryColor?: string
  animation?: PersonAnimation
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  /** Acuan fase animasi agar figur tidak bergerak serempak. */
  seed?: number
  /** Perbarui animasi tiap N frame (mode tier rendah). */
  updateEvery?: number
  /** Kecepatan langkah (0 = berhenti berjalan, mis. saat mengantar). */
  walkSpeed?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
  /** Jalur model glTF (dipakai bila `USE_GLB_MODEL === true`). */
  glbPath?: string
  /** Komponen model glTF, disuplai oleh Staff.tsx. */
  modelComponent?: ComponentType<PersonProps>
  /** Nampan/kopi yang dipegang; selalu datar karena tidak ikut berputar. */
  children?: ReactNode
}

/** Offset tubuh saat duduk: pinggul 0,42 (setinggi kursi). */
const SIT_OFFSET = -0.24

/** Warna kulit digelapkan sedikit untuk sisi bayangan. */
const shade = (hex: string, amount = -0.08) => {
  const color = new THREE.Color(hex)
  color.offsetHSL(0, 0.03, amount)
  return `#${color.getHexString()}`
}

/** Posisi sementara yang dipakai bersama antar frame (single-threaded). */
const pose = {
  bodyX: 0,
  bodyZ: 0,
  bodyY: 0,
  bob: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  armLx: 0.04,
  armLy: 0,
  armLz: 0.12,
  elbowLx: -0.2,
  armRx: 0.04,
  armRy: 0,
  armRz: -0.12,
  elbowRx: -0.2,
  hipLx: 0,
  hipRx: 0,
  kneeLx: 0,
  kneeRx: 0,
}

function resetPose() {
  pose.bodyX = 0
  pose.bodyZ = 0
  pose.bodyY = 0
  pose.bob = 0
  pose.headX = 0
  pose.headY = 0
  pose.headZ = 0
  pose.armLx = 0.04
  pose.armLy = 0
  pose.armLz = 0.12
  pose.elbowLx = -0.2
  pose.armRx = 0.04
  pose.armRy = 0
  pose.armRz = -0.12
  pose.elbowRx = -0.2
  pose.hipLx = 0
  pose.hipRx = 0
  pose.kneeLx = 0
  pose.kneeRx = 0
}

/**
 * Figur prosedural — kepala agak besar ala figur stylized,
 * lengan & kaki memakai CapsuleGeometry, wajah lengkap
 * (mata, alis, hidung, senyum, pipi, kedipan).
 *
 * Semua gerakan dibuat prosedural dari sinus/rotasi sendi di `useFrame`,
 * tanpa file animasi. Untuk ganti ke model glTF:
 * set `USE_GLB_MODEL = true` di src/config/scene.ts lalu isi
 * `MODEL_PATHS` dan kirim `modelComponent` dari Staff.tsx.
 */
export function Person(props: PersonProps) {
  const {
    skinColor = '#E9BA8E',
    hairColor = '#2C1B12',
    hairStyle = 'short',
    outfitColor = '#F0E2CE',
    pantsColor = '#4B3B34',
    apronColor,
    accessory = 'none',
    accessoryColor = '#E8C56B',
    animation = 'idle',
    position,
    rotation,
    scale = 1,
    seed = 0,
    updateEvery = 1,
    walkSpeed = 1,
    onClick,
    children,
    glbPath,
    modelComponent: Model,
  } = props

  const body = useRef<THREE.Group>(null)
  const chest = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const elbowL = useRef<THREE.Group>(null)
  const elbowR = useRef<THREE.Group>(null)
  const hipL = useRef<THREE.Group>(null)
  const hipR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  const eyeL = useRef<THREE.Mesh>(null)
  const eyeR = useRef<THREE.Mesh>(null)

  const frames = useRef(0)
  const walkPhase = useRef(0)
  const seedOffset = (seed % 7) * 1.73
  const blink = useRef({ next: 1.6 + (seed % 5) * 0.55, closing: 0 })
  const reducedMotion = useHeroStore((state) => state.reducedMotion)

  const materials = useMemo(() => {
    const mk = (
      color: string,
      roughness: number,
      extra: Partial<THREE.MeshStandardMaterialParameters> = {},
    ) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, ...extra })

    return {
      skin: mk(skinColor, 0.72),
      skinShadow: mk(shade(skinColor), 0.78),
      hair: mk(hairColor, 0.55),
      outfit: mk(outfitColor, 0.88),
      pants: mk(pantsColor, 0.9),
      apron: apronColor ? mk(apronColor, 0.85) : null,
      hat: mk('#F7F3EA', 0.92),
      eye: mk('#241610', 0.4),
      mouth: mk('#B4705F', 0.75),
      blush: mk('#E2907A', 0.8),
      shoe: mk('#3A2A20', 0.7),
      accent: mk(accessoryColor, 0.5, { metalness: 0.3 }),
      dark: mk('#2A2A30', 0.6),
    }
  }, [apronColor, accessoryColor, hairColor, outfitColor, pantsColor, skinColor])

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material?.dispose())
    },
    [materials],
  )

  useFrame((state, delta) => {
    frames.current += 1
    if (updateEvery > 1 && frames.current % updateEvery !== 0) return

    const dt = Math.min(delta, 0.05)
    const t = state.clock.getElapsedTime() + seedOffset

    // Fase langkah DIakumulasikan (bukan dari jam) supaya pelayan bisa
    // berhenti 2 detik di meja tanpa pose-nya melompat.
    walkPhase.current += dt * 7.2 * walkSpeed

    // Kedipan: jalan terus walau gerakan dimatikan.
    const blinkState = blink.current
    if (t > blinkState.next) {
      blinkState.closing = 1
      blinkState.next = t + 2.3 + Math.random() * 3.4
    }
    blinkState.closing = Math.max(0, blinkState.closing - dt * 7.5)
    const eyelid = 1 - clamp(blinkState.closing, 0, 1) * 0.9
    if (eyeL.current) eyeL.current.scale.y = eyelid
    if (eyeR.current) eyeR.current.scale.y = eyelid

    resetPose()

    if (!reducedMotion) {
      switch (animation) {
        // ── Koki: mengaduk wajan ─────────────────────────────
        case 'stir': {
          const c = t * 4.6
          pose.bodyX = -0.07
          pose.headX = 0.16
          pose.headY = -0.1
          pose.armRx = -0.74 + Math.sin(c) * 0.14
          pose.armRz = -0.26 + Math.cos(c) * 0.13
          pose.elbowRx = -0.95 + Math.cos(c) * 0.18
          pose.armLx = -0.6
          pose.armLz = 0.32
          pose.elbowLx = -0.55
          pose.hipLx = 0.06
          pose.hipRx = -0.06
          break
        }

        // ── Barista: menyeduh & menuang ──────────────────────
        case 'brew': {
          const c = t * 1.5
          pose.bodyZ = Math.sin(c * 0.5) * 0.035
          pose.headX = 0.12
          pose.headY = Math.sin(c * 0.5) * 0.14
          pose.armRx = -0.98 + Math.sin(c) * 0.18
          pose.armRz = -0.3 + Math.cos(c) * 0.08
          pose.elbowRx = -0.85 + Math.cos(c) * 0.22
          pose.armLx = -0.5 + Math.cos(c) * 0.14
          pose.armLz = 0.3
          pose.elbowLx = -0.72
          break
        }

        // ── Kasir: mengetik + sesekali mengangguk ────────────
        case 'typing': {
          const type = t * 10.5
          pose.armLx = -0.98
          pose.armLz = 0.34
          pose.elbowLx = -0.7 + Math.sin(type) * 0.07
          pose.armRx = -0.98
          pose.armRz = -0.34
          pose.elbowRx = -0.7 + Math.sin(type + Math.PI) * 0.07
          const nodPhase = (t % 6.5) / 6.5
          if (nodPhase > 0.62 && nodPhase < 0.78) {
            pose.headX = Math.sin((nodPhase - 0.62) * 19.6) * 0.24
          }
          pose.headY = Math.sin(t * 0.7) * 0.12
          pose.hipLx = 0.05
          pose.hipRx = -0.05
          break
        }

        // ── Pelayan: berjalan membawa nampan ─────────────────
        case 'walkCarry': {
          if (Math.abs(walkSpeed) > 0.01) {
            walkPhase.current += dt * 7.2 * walkSpeed
          } else {
            // Saat berhenti, fase menuju kelipatan π: kaki lurus, badan tenang.
            const settle = Math.round(walkPhase.current / Math.PI) * Math.PI
            walkPhase.current = damp(walkPhase.current, settle, 6, dt)
          }
          const step = walkPhase.current
          const swing = Math.sin(step)
          pose.hipLx = -swing * 0.58
          pose.hipRx = swing * 0.58
          pose.kneeLx = Math.max(0, swing) * 0.95
          pose.kneeRx = Math.max(0, -swing) * 0.95
          pose.bob = Math.abs(Math.sin(step)) * 0.024
          pose.bodyZ = Math.sin(step) * 0.03
          // Tangan kanan menopang nampan (tidak ikut berayun).
          pose.armRx = -0.92
          pose.armRz = -0.24
          pose.armRy = -0.22
          pose.elbowRx = -0.78
          // Tangan kiri berayun mengikuti langkah.
          pose.armLx = swing * 0.42
          pose.armLz = 0.18
          pose.elbowLx = -0.32 - Math.max(0, swing) * 0.2
          pose.headY = Math.sin(step) * 0.05
          break
        }

        // ── Pelanggan: duduk sambil makan ────────────────────
        case 'sitEat': {
          const raise = (Math.sin(t * 1.05 + seedOffset) + 1) / 2
          pose.bodyY = SIT_OFFSET
          pose.hipLx = -1.46
          pose.hipRx = -1.42
          pose.kneeLx = 1.46
          pose.kneeRx = 1.42
          pose.armRx = -0.4 - raise * 1.55
          pose.armRz = -0.34
          pose.elbowRx = -1.0 - raise * 0.7
          pose.armLx = -0.72
          pose.armLz = 0.3
          pose.elbowLx = -0.6
          pose.headX = raise * 0.14
          pose.headY = Math.sin(t * 0.6) * 0.16
          break
        }

        // ── Pelanggan: duduk menatap ponsel ──────────────────
        case 'sitPhone': {
          pose.bodyY = SIT_OFFSET
          pose.hipLx = -1.46
          pose.hipRx = -1.42
          pose.kneeLx = 1.46
          pose.kneeRx = 1.42
          pose.armLx = -0.78
          pose.armLz = 0.36
          pose.elbowLx = -1.45
          pose.armRx = -0.8
          pose.armRz = -0.36
          pose.elbowRx = -1.5
          pose.headX = 0.26
          break
        }

        // ── Santai: berdiri, napas & goyangan ringan ─────────
        default: {
          pose.armLz = 0.12 + Math.sin(t * 0.9) * 0.03
          pose.armRz = -0.12 - Math.sin(t * 0.85) * 0.03
          pose.headY = Math.sin(t * 0.35) * 0.22
          pose.bodyZ = Math.sin(t * 0.55) * 0.015
          pose.hipLx = 0.04
          pose.hipRx = -0.04
          break
        }
      }
    }

    // Terapkan pose dengan peredaman supaya mulus saat berpindah aksi.
    if (body.current) {
      body.current.position.y = damp(
        body.current.position.y,
        pose.bodyY + pose.bob,
        9,
        dt,
      )
      body.current.rotation.x = damp(body.current.rotation.x, pose.bodyX, 9, dt)
      body.current.rotation.z = damp(body.current.rotation.z, pose.bodyZ, 9, dt)
    }

    // Napas halus di dada.
    if (chest.current) {
      const breath = reducedMotion ? 0 : Math.sin(t * 1.4) * 0.008
      chest.current.scale.y = 1 + breath
      chest.current.position.y = 0.95 + breath * 0.4
    }

    if (head.current) {
      head.current.rotation.x = damp(head.current.rotation.x, pose.headX, 7, dt)
      head.current.rotation.y = damp(head.current.rotation.y, pose.headY, 7, dt)
      head.current.rotation.z = damp(head.current.rotation.z, pose.headZ, 7, dt)
    }

    if (armL.current) {
      armL.current.rotation.x = damp(armL.current.rotation.x, pose.armLx, 11, dt)
      armL.current.rotation.y = damp(armL.current.rotation.y, pose.armLy, 11, dt)
      armL.current.rotation.z = damp(armL.current.rotation.z, pose.armLz, 11, dt)
    }
    if (armR.current) {
      armR.current.rotation.x = damp(armR.current.rotation.x, pose.armRx, 11, dt)
      armR.current.rotation.y = damp(armR.current.rotation.y, pose.armRy, 11, dt)
      armR.current.rotation.z = damp(armR.current.rotation.z, pose.armRz, 11, dt)
    }
    if (elbowL.current) {
      elbowL.current.rotation.x = damp(elbowL.current.rotation.x, pose.elbowLx, 11, dt)
    }
    if (elbowR.current) {
      elbowR.current.rotation.x = damp(elbowR.current.rotation.x, pose.elbowRx, 11, dt)
    }

    if (hipL.current && hipR.current && kneeL.current && kneeR.current) {
      hipL.current.rotation.x = damp(hipL.current.rotation.x, pose.hipLx, 13, dt)
      hipR.current.rotation.x = damp(hipR.current.rotation.x, pose.hipRx, 13, dt)
      kneeL.current.rotation.x = damp(kneeL.current.rotation.x, pose.kneeLx, 13, dt)
      kneeR.current.rotation.x = damp(kneeR.current.rotation.x, pose.kneeRx, 13, dt)
    }
  })

  // Jalur glTF (aktifkan USE_GLB_MODEL di config/scene.ts).
  if (USE_GLB_MODEL && Model && glbPath) {
    return <Model {...props} />
  }

  const cursorHandlers = onClick
    ? {
        onPointerOver: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        },
        onPointerOut: () => {
          document.body.style.cursor = ''
        },
      }
    : {}

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
      {...cursorHandlers}
    >
      <group ref={body}>
        {/* ── Kaki ─────────────────────────────────────────── */}
        <group ref={hipL} position={[-0.11, 0.66, 0]}>
          <mesh castShadow material={materials.pants}>
            <capsuleGeometry args={[0.085, 0.26, 4, 12]} />
          </mesh>
          <group ref={kneeL} position={[0, -0.3, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
              <capsuleGeometry args={[0.072, 0.24, 4, 12]} />
            </mesh>
            <mesh position={[0, -0.315, 0.035]} castShadow material={materials.shoe}>
              <boxGeometry args={[0.14, 0.09, 0.22]} />
            </mesh>
          </group>
        </group>

        <group ref={hipR} position={[0.11, 0.66, 0]}>
          <mesh castShadow material={materials.pants}>
            <capsuleGeometry args={[0.085, 0.26, 4, 12]} />
          </mesh>
          <group ref={kneeR} position={[0, -0.3, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
              <capsuleGeometry args={[0.072, 0.24, 4, 12]} />
            </mesh>
            <mesh position={[0, -0.315, 0.035]} castShadow material={materials.shoe}>
              <boxGeometry args={[0.14, 0.09, 0.22]} />
            </mesh>
          </group>
        </group>

        {/* ── Badan ────────────────────────────────────────── */}
        <group ref={chest} position={[0, 0.95, 0]}>
          <mesh castShadow material={materials.outfit}>
            <capsuleGeometry args={[0.19, 0.3, 6, 18]} />
          </mesh>

          {apronColor && materials.apron ? (
            <>
              <mesh position={[0, -0.1, 0.17]} castShadow material={materials.apron}>
                <boxGeometry args={[0.36, 0.6, 0.04]} />
              </mesh>
              <mesh position={[0, 0.26, 0.16]} castShadow material={materials.apron}>
                <boxGeometry args={[0.26, 0.16, 0.03]} />
              </mesh>
            </>
          ) : null}

          {accessory === 'nametag' ? (
            <mesh position={[0.1, 0.13, 0.175]} material={materials.accent}>
              <boxGeometry args={[0.1, 0.05, 0.012]} />
            </mesh>
          ) : null}

          {accessory === 'tie' ? (
            <>
              <mesh position={[0, 0.21, 0.175]} material={materials.dark}>
                <boxGeometry args={[0.055, 0.05, 0.02]} />
              </mesh>
              <mesh position={[0, 0.06, 0.18]} material={materials.dark}>
                <boxGeometry args={[0.06, 0.2, 0.02]} />
              </mesh>
            </>
          ) : null}
        </group>

        {/* Leher */}
        <mesh position={[0, 1.3, 0]} castShadow material={materials.skinShadow}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
        </mesh>

        {/* ── Kepala & wajah ──────────────────────────────── */}
        <group ref={head} position={[0, 1.47, 0]}>
          <mesh castShadow material={materials.skin}>
            <sphereGeometry args={[0.21, 28, 24]} />
          </mesh>

          {/* Pipi */}
          <mesh position={[-0.135, -0.03, 0.165]} material={materials.blush}>
            <sphereGeometry args={[0.024, 10, 8]} />
          </mesh>
          <mesh position={[0.135, -0.03, 0.165]} material={materials.blush}>
            <sphereGeometry args={[0.024, 10, 8]} />
          </mesh>

          {/* Mata */}
          <mesh ref={eyeL} position={[-0.082, 0.04, 0.192]} material={materials.eye}>
            <sphereGeometry args={[0.032, 14, 12]} />
          </mesh>
          <mesh ref={eyeR} position={[0.082, 0.04, 0.192]} material={materials.eye}>
            <sphereGeometry args={[0.032, 14, 12]} />
          </mesh>

          {/* Alis */}
          <mesh position={[-0.086, 0.1, 0.176]} rotation={[0, 0, 0.12]} material={materials.hair}>
            <boxGeometry args={[0.062, 0.014, 0.014]} />
          </mesh>
          <mesh position={[0.086, 0.1, 0.176]} rotation={[0, 0, -0.12]} material={materials.hair}>
            <boxGeometry args={[0.062, 0.014, 0.014]} />
          </mesh>

          {/* Hidung */}
          <mesh position={[0, -0.012, 0.207]} material={materials.skinShadow}>
            <sphereGeometry args={[0.025, 12, 10]} />
          </mesh>

          {/* Senyum */}
          <mesh position={[0, -0.075, 0.19]} rotation={[0, 0, Math.PI]} material={materials.mouth}>
            <torusGeometry args={[0.05, 0.009, 6, 16, Math.PI]} />
          </mesh>

          {/* Kumis */}
          {accessory === 'mustache' ? (
            <>
              <mesh position={[-0.03, -0.048, 0.198]} rotation={[0, 0, 0.14]} material={materials.hair}>
                <boxGeometry args={[0.058, 0.017, 0.02]} />
              </mesh>
              <mesh position={[0.03, -0.048, 0.198]} rotation={[0, 0, -0.14]} material={materials.hair}>
                <boxGeometry args={[0.058, 0.017, 0.02]} />
              </mesh>
            </>
          ) : null}

          {/* Kacamata */}
          {accessory === 'glasses' ? (
            <>
              <mesh position={[-0.082, 0.04, 0.198]} material={materials.dark}>
                <torusGeometry args={[0.055, 0.008, 8, 20]} />
              </mesh>
              <mesh position={[0.082, 0.04, 0.198]} material={materials.dark}>
                <torusGeometry args={[0.055, 0.008, 8, 20]} />
              </mesh>
              <mesh position={[0, 0.04, 0.2]} material={materials.dark}>
                <boxGeometry args={[0.06, 0.01, 0.01]} />
              </mesh>
            </>
          ) : null}

          {/* ── Rambut / topi ─────────────────────────────── */}
          {hairStyle === 'chefHat' ? (
            <>
              <mesh position={[0, 0.155, 0]} castShadow material={materials.hat}>
                <cylinderGeometry args={[0.19, 0.195, 0.07, 20]} />
              </mesh>
              <mesh position={[0, 0.26, 0]} castShadow material={materials.hat}>
                <cylinderGeometry args={[0.175, 0.185, 0.15, 20]} />
              </mesh>
              <mesh position={[0, 0.4, 0]} scale={[1, 0.8, 1]} castShadow material={materials.hat}>
                <sphereGeometry args={[0.19, 20, 16]} />
              </mesh>
              <mesh position={[-0.13, 0.37, 0]} castShadow material={materials.hat}>
                <sphereGeometry args={[0.13, 16, 12]} />
              </mesh>
              <mesh position={[0.13, 0.37, 0]} castShadow material={materials.hat}>
                <sphereGeometry args={[0.13, 16, 12]} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, 0.01, 0]} castShadow material={materials.hair}>
                <sphereGeometry args={[0.216, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
              </mesh>
              {hairStyle === 'bun' ? (
                <>
                  <mesh position={[0, 0.1, -0.17]} castShadow material={materials.hair}>
                    <sphereGeometry args={[0.1, 18, 14]} />
                  </mesh>
                  <mesh position={[0, 0.02, -0.2]} material={materials.hair}>
                    <sphereGeometry args={[0.06, 12, 10]} />
                  </mesh>
                </>
              ) : null}
              {hairStyle === 'long' ? (
                <>
                  <mesh position={[0, -0.04, -0.07]} scale={[1, 1.35, 0.8]} castShadow material={materials.hair}>
                    <sphereGeometry args={[0.19, 18, 16]} />
                  </mesh>
                  <mesh position={[-0.16, -0.1, -0.02]} castShadow material={materials.hair}>
                    <capsuleGeometry args={[0.06, 0.2, 4, 12]} />
                  </mesh>
                  <mesh position={[0.16, -0.1, -0.02]} castShadow material={materials.hair}>
                    <capsuleGeometry args={[0.06, 0.2, 4, 12]} />
                  </mesh>
                </>
              ) : null}
            </>
          )}
        </group>

        {/* ── Bahu & lengan ───────────────────────────────── */}
        <mesh position={[-0.215, 1.14, 0]} castShadow material={materials.outfit}>
          <sphereGeometry args={[0.088, 14, 12]} />
        </mesh>
        <mesh position={[0.215, 1.14, 0]} castShadow material={materials.outfit}>
          <sphereGeometry args={[0.088, 14, 12]} />
        </mesh>

        <group ref={armL} position={[-0.228, 1.14, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow material={materials.outfit}>
            <capsuleGeometry args={[0.062, 0.2, 4, 12]} />
          </mesh>
          <group ref={elbowL} position={[0, -0.27, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow material={materials.skin}>
              <capsuleGeometry args={[0.055, 0.18, 4, 12]} />
            </mesh>
            <mesh position={[0, -0.3, 0]} castShadow material={materials.skin}>
              <sphereGeometry args={[0.058, 12, 10]} />
            </mesh>
          </group>
        </group>

        <group ref={armR} position={[0.228, 1.14, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow material={materials.outfit}>
            <capsuleGeometry args={[0.062, 0.2, 4, 12]} />
          </mesh>
          <group ref={elbowR} position={[0, -0.27, 0]}>
            <mesh position={[0, -0.12, 0]} castShadow material={materials.skin}>
              <capsuleGeometry args={[0.055, 0.18, 4, 12]} />
            </mesh>
            <mesh position={[0, -0.3, 0]} castShadow material={materials.skin}>
              <sphereGeometry args={[0.058, 12, 10]} />
            </mesh>

            {animation === 'sitPhone' ? (
              <group position={[0.01, -0.29, 0.09]} rotation={[-0.7, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[0.075, 0.15, 0.016]} />
                  <meshStandardMaterial color="#24242A" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0, 0.009]}>
                  <planeGeometry args={[0.06, 0.13]} />
                  <meshStandardMaterial
                    color="#9FD8FF"
                    emissive="#9FD8FF"
                    emissiveIntensity={0.7}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            ) : null}
          </group>
        </group>

        {/* Nampan / barang yang dipegang: posisi tetap, selalu datar. */}
        <group position={[0, 1.0, 0.4]}>{children}</group>
      </group>
    </group>
  )
}
