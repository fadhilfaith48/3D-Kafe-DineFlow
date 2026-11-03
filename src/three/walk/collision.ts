import { CAFE_LAYOUT, footprint } from '../../data/sceneLayout'
import type { SceneLayout, SceneObject } from '../../data/sceneLayout'

/**
 * Collider sederhana untuk walk mode: AABB horizontal per objek.
 * Tidak memakai three.js agar bisa diuji sebagai fungsi murni.
 */

export interface WalkCollider {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface WalkBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

const COLLIDE_TYPES = new Set<SceneObject['type']>([
  'table',
  'chair',
  'counter',
  'appliance',
  'shelf',
  'decor',
  'character',
])

/** Jari-jari tubuh pemain (meter). */
export const WALK_RADIUS = 0.3

/** Ketinggian mata orang pertama (meter). */
export const EYE_HEIGHT = 1.62

/** Titik masuk walk mode: dekat pintu timur, di lorong. */
export const WALK_SPAWN: [number, number, number] = [8.55, EYE_HEIGHT, 0]

export function walkBounds(layout: SceneLayout = CAFE_LAYOUT): WalkBounds {
  const margin = 0.45
  return {
    minX: -layout.room.width / 2 + margin,
    maxX: layout.room.width / 2 - margin,
    minZ: -layout.room.depth / 2 + margin,
    maxZ: layout.room.depth / 2 - margin,
  }
}

export function buildColliders(layout: SceneLayout = CAFE_LAYOUT): WalkCollider[] {
  const pad = 0.05
  return layout.objects
    .filter((object) => {
      if (!COLLIDE_TYPES.has(object.type)) return false
      // Karpet & dekorasi yang menempel di dinding tidak menghalangi kaki.
      if (object.model === 'rug.glb') return false
      if (object.position[1] > 1.4) return false
      return true
    })
    .map((object) => {
      const { halfX, halfZ } = footprint(object)
      const [x, , z] = object.position
      return {
        id: object.id,
        minX: x - halfX - pad,
        maxX: x + halfX + pad,
        minZ: z - halfZ - pad,
        maxZ: z + halfZ + pad,
      }
    })
}

/** Apakah posisi kaki (x,z) bebas dari furniture? */
export function isWalkable(
  x: number,
  z: number,
  colliders: WalkCollider[],
  radius = WALK_RADIUS,
): boolean {
  for (const box of colliders) {
    if (
      x > box.minX - radius &&
      x < box.maxX + radius &&
      z > box.minZ - radius &&
      z < box.maxZ + radius
    ) {
      return false
    }
  }
  return true
}

/** Batasi posisi ke dalam ruangan. */
export function clampToRoom(
  x: number,
  z: number,
  bounds: WalkBounds = walkBounds(),
): [number, number] {
  return [
    Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
  ]
}

/**
 * Geser pemain dengan sliding: coba sumbu X dulu, lalu Z,
 * supaya tetap bisa menyusuri dinding/meja tanpa tersangkut.
 */
export function moveWalk(
  x: number,
  z: number,
  dx: number,
  dz: number,
  colliders: WalkCollider[],
  bounds: WalkBounds = walkBounds(),
  radius = WALK_RADIUS,
): [number, number] {
  const [clampedX, clampedZ] = clampToRoom(x, z, bounds)
  let nextX = clampedX
  let nextZ = clampedZ

  const tryX = clampToRoom(nextX + dx, nextZ, bounds)
  if (isWalkable(tryX[0], tryX[1], colliders, radius)) nextX = tryX[0]

  const tryZ = clampToRoom(nextX, nextZ + dz, bounds)
  if (isWalkable(tryZ[0], tryZ[1], colliders, radius)) nextZ = tryZ[1]

  return [nextX, nextZ]
}
