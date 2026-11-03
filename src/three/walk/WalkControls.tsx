import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib'
import { useHeroStore } from '../../store/useHeroStore'
import {
  buildColliders,
  EYE_HEIGHT,
  moveWalk,
  WALK_SPAWN,
  walkBounds,
} from './collision'

const UP = new THREE.Vector3(0, 1, 0)
const forward = new THREE.Vector3()
const right = new THREE.Vector3()

/**
 * Mode jelajah orang pertama.
 *
 * - Klik canvas untuk mengunci pointer (mouse look).
 * - WASD/panah untuk bergerak, Shift untuk lari.
 * - Escape keluar; kamera kembali ke tampak penuh lewat CameraRig.
 */
export function WalkControls() {
  const mode = useHeroStore((state) => state.mode)
  const exitWalk = useHeroStore((state) => state.exitWalk)
  const { camera, gl } = useThree()
  const controls = useRef<PointerLockControlsImpl>(null)
  const keys = useRef(new Set<string>())
  const colliders = useMemo(() => buildColliders(), [])
  const bounds = useMemo(() => walkBounds(), [])
  const active = mode === 'walk'

  // Posisi awal & arah hadap.
  useEffect(() => {
    if (!active) return
    camera.position.set(...WALK_SPAWN)
    camera.lookAt(0, 1.55, 0)
    camera.updateMatrixWorld()
  }, [active, camera])

  // Input keyboard + klik untuk pointer lock.
  useEffect(() => {
    if (!active) return
    const canvas = gl.domElement

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        exitWalk()
        return
      }
      keys.current.add(event.code)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault()
      }
    }
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code)
    const onBlur = () => keys.current.clear()
    const onClick = () => {
      if (document.pointerLockElement !== canvas) controls.current?.lock()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    canvas.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      canvas.removeEventListener('click', onClick)
      keys.current.clear()
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [active, exitWalk, gl])

  useFrame((_, delta) => {
    if (!active) return
    const dt = Math.min(delta, 0.05)
    const pressed = keys.current
    const shift = pressed.has('ShiftLeft') || pressed.has('ShiftRight')
    const speed = (shift ? 4.1 : 2.25) * dt

    camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    let dx = 0
    let dz = 0
    const forwardInput =
      (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) -
      (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0)
    const sideInput =
      (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1 : 0) -
      (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1 : 0)

    dx = (forward.x * forwardInput + right.x * sideInput) * speed
    dz = (forward.z * forwardInput + right.z * sideInput) * speed

    if (dx === 0 && dz === 0) {
      camera.position.y = EYE_HEIGHT
      return
    }

    const [x, z] = moveWalk(
      camera.position.x,
      camera.position.z,
      dx,
      dz,
      colliders,
      bounds,
    )
    camera.position.set(x, EYE_HEIGHT, z)
  })

  if (!active) return null

  return <PointerLockControls ref={controls} pointerSpeed={0.75} />
}
