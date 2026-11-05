import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib'
import { clamp } from '../../lib/math'
import { useHeroStore } from '../../store/useHeroStore'
import {
  buildColliders,
  EYE_HEIGHT,
  moveWalk,
  WALK_SPAWN,
  walkBounds,
} from './collision'
import { resetTouchInput, touchInput } from './touchInput'

const UP = new THREE.Vector3(0, 1, 0)
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const LOOK_SPEED = 0.0042
const MAX_PITCH = 1.2

/**
 * Mode jelajah orang pertama.
 *
 * Desktop:
 * - klik canvas untuk mengunci pointer (mouse look),
 * - WASD/panah untuk bergerak, Shift untuk lari.
 *
 * Sentuh:
 * - joystick kiri untuk bergerak (lihat `WalkTouchControls`),
 * - geser di canvas untuk melihat sekeliling.
 *
 * Escape / tombol Keluar mengembalikan kamera ke tampak penuh.
 */
export function WalkControls() {
  const mode = useHeroStore((state) => state.mode)
  const exitWalk = useHeroStore((state) => state.exitWalk)
  const { camera, gl } = useThree()
  const controls = useRef<PointerLockControlsImpl>(null)
  const keys = useRef(new Set<string>())
  const look = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const lookTouch = useRef<{ id: number; x: number; y: number } | null>(null)
  const [isTouch] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches,
  )
  const colliders = useMemo(() => buildColliders(), [])
  const bounds = useMemo(() => walkBounds(), [])
  const active = mode === 'walk'

  // Posisi awal & arah hadap.
  useEffect(() => {
    if (!active) return
    camera.position.set(...WALK_SPAWN)
    camera.lookAt(0, 1.55, 0)
    look.current.setFromQuaternion(camera.quaternion, 'YXZ')
    camera.updateMatrixWorld()
  }, [active, camera])

  // Keyboard, pointer lock (desktop), dan drag-look (sentuh).
  useEffect(() => {
    if (!active) return
    const canvas = gl.domElement
    const previousTouchAction = canvas.style.touchAction

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
    const onBlur = () => {
      keys.current.clear()
      resetTouchInput()
    }
    const onClick = () => {
      if (document.pointerLockElement !== canvas) controls.current?.lock()
    }

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!touch) return
      lookTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY }
      event.preventDefault()
    }
    const onTouchMove = (event: TouchEvent) => {
      const track = lookTouch.current
      if (!track) return
      const touch = Array.from(event.touches).find(
        (item) => item.identifier === track.id,
      )
      if (!touch) return
      const dx = touch.clientX - track.x
      const dy = touch.clientY - track.y
      track.x = touch.clientX
      track.y = touch.clientY
      look.current.y -= dx * LOOK_SPEED
      look.current.x = clamp(look.current.x - dy * LOOK_SPEED, -MAX_PITCH, MAX_PITCH)
      camera.quaternion.setFromEuler(look.current)
      event.preventDefault()
    }
    const onTouchEnd = (event: TouchEvent) => {
      const track = lookTouch.current
      if (!track) return
      const stillTouching = Array.from(event.touches).some(
        (item) => item.identifier === track.id,
      )
      if (!stillTouching) lookTouch.current = null
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    if (isTouch) {
      canvas.style.touchAction = 'none'
      canvas.addEventListener('touchstart', onTouchStart, { passive: false })
      canvas.addEventListener('touchmove', onTouchMove, { passive: false })
      canvas.addEventListener('touchend', onTouchEnd)
      canvas.addEventListener('touchcancel', onTouchEnd)
    } else {
      canvas.addEventListener('click', onClick)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      canvas.removeEventListener('click', onClick)
      canvas.style.touchAction = previousTouchAction
      keys.current.clear()
      lookTouch.current = null
      resetTouchInput()
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [active, exitWalk, gl, camera, isTouch])

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

    let forwardInput =
      (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) -
      (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0)
    let sideInput =
      (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1 : 0) -
      (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1 : 0)

    if (isTouch) {
      forwardInput += -touchInput.y
      sideInput += touchInput.x
      const magnitude = Math.hypot(forwardInput, sideInput)
      if (magnitude > 1) {
        forwardInput /= magnitude
        sideInput /= magnitude
      }
    }

    const dx = (forward.x * forwardInput + right.x * sideInput) * speed
    const dz = (forward.z * forwardInput + right.z * sideInput) * speed

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

  if (!active || isTouch) return null

  return <PointerLockControls ref={controls} pointerSpeed={0.75} />
}
