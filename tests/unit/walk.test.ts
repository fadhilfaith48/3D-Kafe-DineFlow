import { describe, expect, it } from 'vitest'
import {
  buildColliders,
  clampToRoom,
  EYE_HEIGHT,
  isWalkable,
  moveWalk,
  WALK_RADIUS,
  WALK_SPAWN,
  walkBounds,
} from '../../src/three/walk/collision'

const colliders = buildColliders()
const bounds = walkBounds()

describe('walk mode: collision 20 × 12', () => {
  it('membuat collider untuk furniture, bukan karpet/jendela/pintu', () => {
    const ids = colliders.map((collider) => collider.id)
    expect(ids).toContain('table_01')
    expect(ids).toContain('chair_01a')
    expect(ids).toContain('bar_counter')
    expect(ids).toContain('barista')
    expect(ids).not.toContain('rug')
    expect(ids).not.toContain('window_01')
    expect(ids).not.toContain('door')
    expect(ids).not.toContain('lamp_01')
  })

  it('collider punya batas min/max yang wajar', () => {
    for (const collider of colliders) {
      expect(collider.maxX).toBeGreaterThan(collider.minX)
      expect(collider.maxZ).toBeGreaterThan(collider.minZ)
      expect(Number.isFinite(collider.minX)).toBe(true)
      expect(Number.isFinite(collider.maxZ)).toBe(true)
    }
  })

  it('batas ruangan menyisakan margin dari dinding', () => {
    expect(bounds.minX).toBeGreaterThan(-10)
    expect(bounds.maxX).toBeLessThan(10)
    expect(bounds.minZ).toBeGreaterThan(-6)
    expect(bounds.maxZ).toBeLessThan(6)
  })

  it('titik spawn berada di lorong dan bisa dilewati', () => {
    const [x, y, z] = WALK_SPAWN
    expect(y).toBe(EYE_HEIGHT)
    expect(isWalkable(x, z, colliders)).toBe(true)
    expect(Math.abs(z)).toBeLessThan(1)
  })

  it('seluruh lorong tengah 2 m bebas dihuni collider', () => {
    for (let x = -8.5; x <= 8.5; x += 0.25) {
      expect(isWalkable(x, 0, colliders)).toBe(true)
      expect(isWalkable(x, 0.5, colliders)).toBe(true)
      expect(isWalkable(x, -0.5, colliders)).toBe(true)
    }
  })

  it('meja & kursi tidak bisa ditembus', () => {
    const table = colliders.find((collider) => collider.id === 'table_05')
    expect(table).toBeDefined()
    const centerX = (table!.minX + table!.maxX) / 2
    const centerZ = (table!.minZ + table!.maxZ) / 2
    expect(isWalkable(centerX, centerZ, colliders)).toBe(false)
  })

  it('clampToRoom menahan pemain di dalam ruangan', () => {
    expect(clampToRoom(99, 99, bounds)).toEqual([bounds.maxX, bounds.maxZ])
    expect(clampToRoom(-99, -99, bounds)).toEqual([bounds.minX, bounds.minZ])
    expect(clampToRoom(0, 0, bounds)).toEqual([0, 0])
  })

  it('moveWalk menggeser bebas di lorong', () => {
    const [x, z] = moveWalk(8.55, 0, -1.2, 0, colliders, bounds)
    expect(x).toBeCloseTo(7.35, 5)
    expect(z).toBe(0)
  })

  it('moveWalk berhenti di depan meja, tidak menembusnya', () => {
    // Dari lorong bergerak ke selatan menuju meja_05 (z = 2.75).
    let x = 6.8
    let z = 0
    for (let step = 0; step < 120; step += 1) {
      ;[x, z] = moveWalk(x, z, 0, 0.05, colliders, bounds)
    }
    const table = colliders.find((collider) => collider.id === 'table_05')!
    expect(z).toBeLessThan(table.minZ - WALK_RADIUS + 1e-6)
    expect(z).toBeGreaterThan(0.5)
  })

  it('moveWalk menggeser menyusuri rintangan (sliding)', () => {
    // Bergerak diagonal ke arah meja: sumbu Z tertahan, sumbu X tetap maju.
    const startX = 8.55
    const [x, z] = moveWalk(startX, 0.5, -0.4, 0.4, colliders, bounds)
    expect(x).toBeLessThan(startX)
    expect(z).toBeGreaterThan(0.5)
  })

  it('radius tubuh menambah jarak aman dari collider', () => {
    const table = colliders.find((collider) => collider.id === 'table_05')!
    const justOutside = table.minZ - WALK_RADIUS - 0.01
    const justInside = table.minZ - WALK_RADIUS + 0.01
    expect(isWalkable(6.8, justOutside, [table])).toBe(true)
    expect(isWalkable(6.8, justInside, [table])).toBe(false)
  })
})
