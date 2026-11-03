import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { ScrollTrigger } from '../../lib/gsap'
import { clamp, smoothstep } from '../../lib/math'
import { gyroTilt, heroMotion } from '../../lib/scroll'
import { useHeroStore } from '../../store/useHeroStore'
import type { CameraPreset, Vec3 } from '../../types/scene'
import {
  applyViewOffset,
  CAMERA_FOV,
  fitPreset,
  fullPreset,
  FULL_VIEW,
  INTRO_VIEW,
  tourPresetAt,
  tourStopFromProgress,
  zonePresetAt,
} from './cameraPath'

const tmpPosition = new THREE.Vector3()
const tmpTarget = new THREE.Vector3()

const lerpVec = (out: THREE.Vector3, a: Vec3, b: Vec3, t: number) =>
  out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)

interface Transition {
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  goal: CameraPreset
  startedAt: number
  duration: number
}

/**
 * Satu-satunya pemilik kendali kamera.
 *
 * Urutan kepemilikan (tidak pernah dua sistem berebut):
 * - `intro` : dijalankan per frame oleh `heroMotion.intro` (IntroDirector),
 * - `focus` / `tour` / `free` : transisi BERBASIS WAKTU NYATA menuju preset
 *   (dari `zones.ts`) lalu kamera diam,
 * - `free`  : OrbitControls aktif (azimuth ±35°, pan off, damping).
 *
 * Transisi sengaja tidak memakai tween GSAP: pada perangkat dengan frame
 * rate sangat rendah GSAP meng-clamp delta sehingga kamera bisa tertinggal
 * di posisi lama. Perhitungan waktu nyata selalu selesai sesuai durasi.
 */
export function CameraRig() {
  const { camera, size } = useThree()
  const reducedMotion = useHeroStore((state) => state.reducedMotion)
  const mode = useHeroStore((state) => state.mode)
  const activeZone = useHeroStore((state) => state.activeZone)
  const tourStop = useHeroStore((state) => state.tourStop)

  const controls = useRef<OrbitControlsImpl>(null)
  const lookTarget = useRef(new THREE.Vector3(0, 0.8, 0))
  const parallax = useRef({ x: 0, y: 0 })
  const transition = useRef<Transition | null>(null)
  const previousMode = useRef(mode)
  const [orbitReady, setOrbitReady] = useState(false)

  /** Preset yang sudah disesuaikan rasio layar (dihitung saat resize). */
  const fitted = useRef<{ intro: CameraPreset; full: CameraPreset }>({
    intro: INTRO_VIEW,
    full: FULL_VIEW,
  })

  // ScrollTrigger menulis ke objek mutable, bukan ke state React.
  // Perpindahan scroll juga yang menggerakkan tur: 480svh dibagi
  // 5 perhentian (Kasir → Dapur → Bar Kopi → Area Makan → tampak penuh).
  useEffect(() => {
    const section = document.getElementById('hero')
    if (!section) return
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        heroMotion.scroll = self.progress

        const store = useHeroStore.getState()
        // Sedang fokus zona (kartu terbuka) atau intro → biarkan.
        if (store.mode !== 'free' && store.mode !== 'tour') return

        const stop = tourStopFromProgress(self.progress)
        if (stop === 0) {
          if (store.mode === 'tour') {
            store.setTourStop(0)
            store.setMode('free')
          }
          return
        }
        if (store.mode !== 'tour') store.setMode('tour')
        if (store.tourStop !== stop) store.setTourStop(stop)
      },
    })
    return () => {
      trigger.kill()
      heroMotion.scroll = 0
    }
  }, [])

  // 1) Sesuaikan preset + FOV + geser komposisi tiap kali ukuran berubah.
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)

    fitted.current = {
      intro: fitPreset(INTRO_VIEW, aspect),
      full: fullPreset(aspect),
    }

    perspective.fov = CAMERA_FOV
    perspective.near = 0.1
    perspective.far = 90
    applyViewOffset(perspective, size.width, size.height)
  }, [camera, size.width, size.height])

  // 2) Ganti mode → matikan OrbitControls, mulai transisi berbasis waktu.
  useEffect(() => {
    const orbit = controls.current
    const cameFromWalk = previousMode.current === 'walk'
    previousMode.current = mode
    setOrbitReady(false)

    if (mode === 'intro') {
      transition.current = null
      if (orbit) orbit.enabled = false
      return
    }

    // Walk: kendali kamera diserahkan ke WalkControls.
    if (mode === 'walk') {
      transition.current = null
      if (orbit) orbit.enabled = false
      setOrbitReady(false)
      return
    }

    // Ambil titik pandang terkini dulu sebelum lepas kendali OrbitControls.
    if (orbit?.enabled) {
      lookTarget.current.copy(orbit.target)
      orbit.enabled = false
    }

    // Keluar dari walk: arah pandang diambil dari kamera orang pertama.
    if (cameFromWalk) {
      camera.getWorldDirection(tmpPosition)
      lookTarget.current
        .copy(camera.position)
        .addScaledVector(tmpPosition, 8)
    }

    const aspect = size.width / Math.max(1, size.height)
    const goal: CameraPreset =
      mode === 'focus' && activeZone
        ? zonePresetAt(activeZone, aspect)
        : mode === 'tour'
          ? tourPresetAt(tourStop, aspect)
          : fitted.current.full

    transition.current = {
      fromPosition: camera.position.clone(),
      fromTarget: lookTarget.current.clone(),
      goal,
      startedAt: performance.now(),
      duration: reducedMotion ? 0 : mode === 'free' ? 1.15 : 1.3,
    }

    return () => {
      transition.current = null
    }
  }, [camera, mode, activeZone, tourStop, size.width, size.height, reducedMotion])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const current = useHeroStore.getState().mode
    const orbit = controls.current

    // WalkControls memiliki kamera sepenuhnya saat mode walk.
    if (current === 'walk') return

    if (current === 'intro') {
      const p = reducedMotion ? 1 : smoothstep(heroMotion.intro)

      lerpVec(tmpPosition, fitted.current.intro.position, fitted.current.full.position, p)
      lerpVec(tmpTarget, fitted.current.intro.target, fitted.current.full.target, p)

      // Parallax kursor/gyro yang diredam (nonaktif di mode gerak berkurang).
      const px = reducedMotion ? 0 : state.pointer.x + gyroTilt.y
      const py = reducedMotion ? 0 : state.pointer.y + gyroTilt.x
      parallax.current.x += (px - parallax.current.x) * Math.min(1, dt * 4)
      parallax.current.y += (py - parallax.current.y) * Math.min(1, dt * 4)

      camera.position.set(
        tmpPosition.x + parallax.current.x * 0.3,
        tmpPosition.y + parallax.current.y * 0.16,
        tmpPosition.z,
      )
      lookTarget.current.set(
        tmpTarget.x + parallax.current.x * 0.42,
        tmpTarget.y - parallax.current.y * 0.2,
        tmpTarget.z,
      )
      camera.lookAt(lookTarget.current)

      // Intro selesai → serahkan kendali ke OrbitControls.
      if (heroMotion.intro >= 0.999) {
        useHeroStore.getState().setMode('free')
      }
      return
    }

    // Transisi kamera: interpolasi linear berdasarkan waktu nyata.
    const active = transition.current
    if (active) {
      const elapsed = performance.now() - active.startedAt
      const raw = active.duration <= 0 ? 1 : clamp(elapsed / (active.duration * 1000), 0, 1)
      const t = smoothstep(raw)

      camera.position.lerpVectors(
        active.fromPosition,
        tmpPosition.set(...active.goal.position),
        t,
      )
      lookTarget.current.lerpVectors(
        active.fromTarget,
        tmpTarget.set(...active.goal.target),
        t,
      )
      if (orbit) orbit.target.copy(lookTarget.current)

      if (raw >= 1) {
        transition.current = null
        if (current === 'free' && orbit) {
          orbit.enabled = true
          orbit.update()
          setOrbitReady(true)
        }
      }
    }

    // Selama OrbitControls belum aktif, arah pandang tetap kita yang atur.
    const orbitDrives = current === 'free' && (orbit?.enabled ?? false)
    if (!orbitDrives) camera.lookAt(lookTarget.current)
  })

  return (
    <OrbitControls
      ref={controls}
      enabled={orbitReady}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      minDistance={4}
      maxDistance={44}
      minPolarAngle={0.12}
      maxPolarAngle={1.5}
      target={[0, 1.0, 0]}
    />
  )
}
