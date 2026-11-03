import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAFE_LAYOUT,
  MODEL_CATALOG,
  MODEL_FILES,
  assertLayout,
  getTableById,
  getTableChairs,
  objectsInAisle,
  tableFromQuery,
  validateLayout,
} from '../../src/data/sceneLayout'

const tables = CAFE_LAYOUT.objects.filter((object) => object.type === 'table')
const chairs = CAFE_LAYOUT.objects.filter((object) => object.type === 'chair')
const lights = CAFE_LAYOUT.objects.filter((object) => object.type === 'light')

describe('layout kafe 20 × 12', () => {
  it('lolos validasi tanpa error', () => {
    const result = validateLayout()
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(() => assertLayout()).not.toThrow()
  })

  it('berukuran 20 × 12 m dengan lorong 2 m', () => {
    expect(CAFE_LAYOUT.room).toMatchObject({
      width: 20,
      depth: 12,
      height: 4.2,
      aisle: { axis: 'x', center: 0, width: 2 },
    })
  })

  it('berisi 9 meja, 38 kursi, dan 5 lampu', () => {
    expect(tables).toHaveLength(9)
    expect(chairs).toHaveLength(38)
    expect(lights).toHaveLength(5)
  })

  it('setiap meja punya 4–5 kursi, meja 01 & 09 punya 5', () => {
    for (const table of tables) {
      const count = getTableChairs(table.id).length
      expect(count).toBeGreaterThanOrEqual(4)
      expect(count).toBeLessThanOrEqual(5)
    }
    expect(getTableChairs('table_01')).toHaveLength(5)
    expect(getTableChairs('table_09')).toHaveLength(5)
  })

  it('semua ID unik', () => {
    const ids = CAFE_LAYOUT.objects.map((object) => object.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lorong utama bebas dari semua objek', () => {
    expect(objectsInAisle()).toEqual([])
  })

  it('semua objek berada di dalam ruangan', () => {
    for (const object of CAFE_LAYOUT.objects) {
      const [x, y, z] = object.position
      expect(Math.abs(x)).toBeLessThanOrEqual(10)
      expect(Math.abs(z)).toBeLessThanOrEqual(6)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(4.2)
    }
  })

  it('setiap kursi menunjuk meja yang valid', () => {
    for (const chair of chairs) {
      expect(chair.tableId).toBeTruthy()
      expect(getTableById(String(chair.tableId))).toBeDefined()
    }
  })

  it('dua baris meja: 5 selatan dan 4 utara', () => {
    const south = tables.filter((table) => table.zone === 'dining_south')
    const north = tables.filter((table) => table.zone === 'dining_north')
    expect(south).toHaveLength(5)
    expect(north).toHaveLength(4)
    expect(new Set(south.map((table) => table.position[2]))).toEqual(new Set([2.75]))
    expect(new Set(north.map((table) => table.position[2]))).toEqual(new Set([-2.55]))
  })

  it('bar 3 m dan barista beranimasi idle', () => {
    const bar = CAFE_LAYOUT.objects.find((object) => object.id === 'bar_counter')
    expect(bar).toBeDefined()
    expect(bar?.model).toBe('bar_counter.glb')
    expect(MODEL_CATALOG.models.bar_counter.bounds.max[0] * 2).toBeGreaterThanOrEqual(3)

    const barista = CAFE_LAYOUT.objects.find((object) => object.id === 'barista')
    expect(barista).toMatchObject({ type: 'character', animation: 'idle' })
  })

  it('lampu memakai intensity 22 dan lightformer yang dapat di-toggle', () => {
    for (const lamp of lights) {
      expect(lamp.intensity).toBe(22)
      expect(['rect', 'circle']).toContain(lamp.lightformer)
    }
    const forms = CAFE_LAYOUT.lighting.lightformers.map((former) => former.form)
    expect(forms).toContain('rect')
    expect(forms).toContain('circle')
    expect(CAFE_LAYOUT.lighting.lightformers.every((former) => typeof former.enabled === 'boolean')).toBe(true)
  })

  it('pencahayaan siang/malam sesuai spesifikasi', () => {
    expect(CAFE_LAYOUT.lighting).toMatchObject({
      day: 'enabled',
      night: 'disabled',
      ambientIntensity: 0.85,
      colorTemperature: 5600,
      lampIntensity: 22,
    })
  })

  it('audio ambience valid dan tidak autoplay', () => {
    expect(CAFE_LAYOUT.audio.track).toBe('cafe_ambience.mp3')
    expect(CAFE_LAYOUT.audio.volume).toBeGreaterThan(0)
    expect(CAFE_LAYOUT.audio.volume).toBeLessThanOrEqual(1)
    expect(CAFE_LAYOUT.audio.autoplay).toBe(false)
  })
})

describe('QR meja', () => {
  it.each([
    ['03', 'table_03'],
    ['3', 'table_03'],
    ['table_3', 'table_03'],
    ['table_03', 'table_03'],
    ['?table=09', 'table_09'],
    [' 7 ', 'table_07'],
  ])('query %s → %s', (query, expected) => {
    expect(tableFromQuery(query)).toBe(expected)
  })

  it.each(['', '00', '10', 'abc', 'table_99', null, undefined])(
    'query tidak valid %s → null',
    (query) => {
      expect(tableFromQuery(query)).toBeNull()
    },
  )
})

describe('katalog model', () => {
  it('semua model layout tersedia di katalog', () => {
    const used = new Set(CAFE_LAYOUT.objects.map((object) => object.model))
    for (const file of used) expect(MODEL_FILES.has(file)).toBe(true)
  })

  it('katalog sinkron dengan manifest hasil build', () => {
    const manifestPath = path.resolve('public/models/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      models: Array<{ name: string; file: string; triangles: number }>
    }
    expect(Object.keys(MODEL_CATALOG.models)).toHaveLength(manifest.models.length)
    for (const item of manifest.models) {
      expect(MODEL_CATALOG.models[item.name]).toMatchObject({
        file: item.file,
        triangles: item.triangles,
      })
    }
  })

  it('semua model ≤ 2.000 triangle', () => {
    for (const entry of Object.values(MODEL_CATALOG.models)) {
      expect(entry.triangles).toBeGreaterThan(0)
      expect(entry.triangles).toBeLessThanOrEqual(2000)
    }
  })
})
