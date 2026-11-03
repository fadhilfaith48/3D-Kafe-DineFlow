import * as THREE from 'three'
import { CAMERA, TOUR } from '../../config/scene'
import { getZone, TOUR_ORDER } from '../../data/zones'
import { clamp, degToRad } from '../../lib/math'
import type { CameraPreset, ZoneId } from '../../types/scene'

/**
 * Seluruh matematika penempatan kamera ada di sini:
 * - preset tampak penuh & intro,
 * - preset fokus per zona (dari `data/zones.ts`),
 * - penyesuaian rasio layar (`fitDistance` / `fitPreset`),
 * - geser komposisi 3D ke kanan di desktop (`applyViewOffset`).
 */

/** Field of view kamera hero (portrait: kamera mundur & naik, FOV tetap). */
export const CAMERA_FOV = CAMERA.fov

/** Rasio acuan layar lebar; di bawah ini kamera mundur. */
const REF_ASPECT = 16 / 9

/** Sampai seberapa jauh kamera boleh mundur di layar sangat sempit. */
const MAX_BACK_OFF = CAMERA.maxBackOff

/**
 * Tampak penuh: seluruh denah 16 × 10 (cutaway depan & kanan)
 * terlihat dari sudut tiga perempat atas.
 */
export const FULL_VIEW: CameraPreset = {
  position: CAMERA.fullPosition,
  target: CAMERA.fullTarget,
}

/** Awal intro: lebih tinggi & jauh, lalu turun ke FULL_VIEW. */
export const INTRO_VIEW: CameraPreset = {
  position: CAMERA.introPosition,
  target: CAMERA.introTarget,
}

/**
 * Fraksi geser komposisi (desktop). Nilai positif = adegan bergeser ke
 * kanan sehingga kolom teks di kiri tidak menutupi kafe.
 */
export const VIEW_SHIFT = CAMERA.viewShift

/** Lebar & tinggi denah yang harus muat (satuan dunia). */
const SCENE_HALF_WIDTH = 10.8
const SCENE_HALF_HEIGHT = 6.8

const toVector = (p: [number, number, number]) => new THREE.Vector3(p[0], p[1], p[2])

/**
 * Perbesaran jarak untuk rasio layar tertentu.
 * Layar sempit (portrait) → kamera mundur; layar lebar → ukuran asli.
 */
export function aspectScale(aspect: number): number {
  const safe = clamp(aspect, 0.4, 3)
  return clamp(Math.pow(REF_ASPECT / safe, 0.45), 1, MAX_BACK_OFF)
}

/**
 * Jarak kamera tampak penuh pada rasio layar tertentu,
 * dengan jaminan seluruh denah (lebar + kedalaman) masih muat.
 */
export function fitDistance(aspect: number): number {
  const fov = degToRad(CAMERA_FOV)
  const halfV = fov / 2
  const halfH = Math.atan(Math.tan(halfV) * clamp(aspect, 0.4, 3))
  // Jarak minimal agar lebar denah muat secara horizontal…
  const needWidth = SCENE_HALF_WIDTH / Math.tan(halfH)
  // …dan agar panjang denah + tinggi dinding muat secara vertikal.
  const needDepth = (SCENE_HALF_HEIGHT * 0.8) / Math.tan(halfV)

  const base = new THREE.Vector3(...FULL_VIEW.position).distanceTo(toVector(FULL_VIEW.target))
  // Batas terjauh: di luar itu kabut & bayangan mulai memakan adegan,
  // jadi di layar sangat sempit kafe tetap "hampir" penuh, bukan hilang.
  const limit = base * MAX_BACK_OFF
  return clamp(Math.max(base * aspectScale(aspect), needWidth, needDepth), base * 0.92, limit)
}

/**
 * Tampak penuh yang sudah pas rasio layar: jaraknya dijamin oleh
 * `fitDistance` (muat lebar + kedalaman denah) lalu sedikit dinaikkan.
 */
export function fullPreset(aspect: number): CameraPreset {
  const target = toVector(FULL_VIEW.target)
  const direction = toVector(FULL_VIEW.position).sub(target)
  const baseDistance = direction.length() || 1

  const distance = fitDistance(aspect)
  direction.normalize().multiplyScalar(distance)
  direction.y += (distance / baseDistance - 1) * 2.2

  return {
    position: [target.x + direction.x, target.y + direction.y, target.z + direction.z],
    target: FULL_VIEW.target,
  }
}

/**
 * Sesuaikan satu preset (intro / fokus zona / tur) agar pas rasio layar.
 * Layar sempit → mundur & naik; layar lebar → hampir seperti aslinya.
 */
export function fitPreset(preset: CameraPreset, aspect: number): CameraPreset {
  const target = toVector(preset.target)
  const direction = toVector(preset.position).sub(target)
  if (direction.lengthSq() === 0) direction.set(0, 1, 1)

  const factor = aspectScale(aspect)
  direction.multiplyScalar(factor)

  // Di layar sempit, naikkan sedikit agar denah tidak terpotong.
  const lift = (factor - 1) * 2.2
  return {
    position: [target.x + direction.x, target.y + direction.y + lift, target.z + direction.z],
    target: preset.target,
  }
}

/** Preset fokus satu zona (sumbernya `zones.ts`), sudah pas rasio layar. */
export function zonePresetAt(id: ZoneId, aspect: number): CameraPreset {
  const zone = getZone(id)
  return fitPreset({ position: zone.focus.position, target: zone.focus.target }, aspect)
}

/**
 * Preset tur scroll: 1..n = perhentian zona sesuai `Zone.tour`,
 * 0 / di luar zona = kembali ke tampak penuh.
 */
export function tourPresetAt(stop: number, aspect: number): CameraPreset {
  const id = TOUR_ORDER[stop - 1]
  return id ? zonePresetAt(id, aspect) : fullPreset(aspect)
}

/**
 * Geser bingkai kamera agar adegan bergeser ke kanan (desktop).
 * Dipanggil ulang tiap kali ukuran canvas berubah.
 */
export function applyViewOffset(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): void {
  if (width >= 1024 && height >= 560) {
    camera.setViewOffset(width, height, -width * VIEW_SHIFT, 0, width, height)
  } else {
    camera.clearViewOffset()
  }
  camera.updateProjectionMatrix()
}

/**
 * Petakan progress scroll hero (0..1) ke perhentian tur.
 *
 * - di bawah `TOUR.startAt` masih tampak penuh (0),
 * - sisanya dibagi `TOUR.stops` segmen; 15% awal tiap segmen adalah
 *   "hold" sehingga kamera sempat diam sebelum berpindah lagi.
 *
 * Urutan perhentian mengikuti `TOUR_ORDER`: Kasir → Dapur → Bar Kopi →
 * Area Makan → tampak penuh.
 */
export function tourStopFromProgress(progress: number): number {
  if (progress < TOUR.startAt) return 0

  const segment = 1 / TOUR.stops
  const shifted = progress - TOUR.startAt
  const index = Math.floor(shifted / segment)
  const withinSegment = shifted / segment - index

  // Hold di awal segmen: gunakan segmen sebelumnya sampai lewat 15%.
  const heldIndex = withinSegment < TOUR.hold ? Math.max(0, index - 1) : index
  return clamp(heldIndex + 1, 1, TOUR.stops)
}
