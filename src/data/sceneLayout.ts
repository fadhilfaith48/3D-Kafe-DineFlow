import layoutJson from './cafe_hero.json'
import catalogJson from './modelCatalog.json'

/**
 * Tipe & validasi layout kafe 20 × 12 m.
 *
 * Sumber data: `src/data/cafe_hero.json` yang dihasilkan oleh
 * `scripts/generate-layout.mjs`. Jangan mengedit JSON secara manual —
 * ubah generator lalu jalankan `npm run layout:sync`.
 */

export type Vec3 = [number, number, number]

export type SceneObjectType =
  | 'table'
  | 'chair'
  | 'counter'
  | 'sink'
  | 'appliance'
  | 'shelf'
  | 'decor'
  | 'character'
  | 'light'
  | 'window'
  | 'door'

export type LayoutZoneId =
  | 'dining_south'
  | 'dining_north'
  | 'bar'
  | 'kitchen'
  | 'entrance'
  | 'decor'

export type LightformerForm = 'rect' | 'circle'

export interface SceneObject {
  id: string
  type: SceneObjectType
  /** Nama file GLB, mis. `table.glb`. */
  model: string
  position: Vec3
  rotation: Vec3
  zone?: LayoutZoneId
  /** Meja pemilik kursi (dan meja itu sendiri). */
  tableId?: string
  /** Huruf kursi pada meja, mis. `a`. */
  seat?: string
  /** Nama klip animasi, mis. `idle` untuk barista. */
  animation?: string
  /** Bentuk lightformer untuk lampu gantung. */
  lightformer?: LightformerForm
  /** Intensitas lampu (mode malam). */
  intensity?: number
}

export interface Aisle {
  /** Sumbu lorong: `x` berarti lorong membentang sepanjang sumbu x. */
  axis: 'x' | 'z'
  /** Posisi tengah lorong pada sumbu lainnya. */
  center: number
  width: number
}

export interface Room {
  width: number
  depth: number
  height: number
  margin: number
  aisle: Aisle
}

export interface LayoutStandards {
  tableWidth: number
  tableDepth: number
  tableHeight: number
  chairSeatHeight: number
  chairsPerTable: [number, number]
}

export interface OnOff {
  day: 'enabled' | 'disabled'
  night: 'enabled' | 'disabled'
}

export interface Lightformer {
  id: string
  form: LightformerForm
  enabled: boolean
  intensity: number
  color: string
  scale: [number, number]
}

export interface LayoutLighting extends OnOff {
  ambientIntensity: number
  colorTemperature: number
  lampIntensity: number
  lightformers: Lightformer[]
}

export interface LayoutAudio {
  track: string
  muted: boolean
  volume: number
  autoplay: boolean
}

export interface SceneLayout {
  scene: string
  version: number
  units: 'meters'
  room: Room
  standards: LayoutStandards
  objects: SceneObject[]
  lighting: LayoutLighting
  audio: LayoutAudio
  generatedFrom: string
}

export interface ModelCatalogEntry {
  file: string
  triangles: number
  bounds: { min: Vec3; max: Vec3 }
}

export interface ModelCatalog {
  schema: string
  models: Record<string, ModelCatalogEntry>
  totals: { files: number; bytes: number; triangles: number }
}

export interface LayoutValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
  stats: {
    objects: number
    tables: number
    chairs: number
    lights: number
    models: number
  }
}

export const CAFE_LAYOUT = layoutJson as unknown as SceneLayout
export const MODEL_CATALOG = catalogJson as unknown as ModelCatalog

/** Semua model yang tersedia di `public/models`. */
export const MODEL_FILES = new Set(
  Object.values(MODEL_CATALOG.models).map((entry) => entry.file),
)

const EPSILON = 1e-6
const ROOM_TOLERANCE = 0.05
const CHAIR_TABLE_MAX_DISTANCE = 1.25

const FINITE = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((component) => FINITE(component))

const objectById = (layout: SceneLayout, id: string) =>
  layout.objects.find((object) => object.id === id)

const round = (value: number) => Number(value.toFixed(2))

/**
 * Setengah ukuran footprint horizontal setelah rotasi Y 90°/180°/270°.
 * Dipakai untuk cek lorong dan batas ruangan tanpa perlu mengimpor three.js.
 */
export function footprint(object: SceneObject): {
  halfX: number
  halfZ: number
} {
  const entry = MODEL_CATALOG.models[object.model.replace(/\.glb$/, '')]
  if (!entry) return { halfX: 0, halfZ: 0 }
  const width = entry.bounds.max[0] - entry.bounds.min[0]
  const depth = entry.bounds.max[2] - entry.bounds.min[2]
  const quarterTurn = Math.abs(Math.sin(object.rotation[1])) > 0.7
  return quarterTurn
    ? { halfX: depth / 2, halfZ: width / 2 }
    : { halfX: width / 2, halfZ: depth / 2 }
}

/** Objek yang footprint-nya menyentuh lorong utama. */
export function objectsInAisle(layout: SceneLayout = CAFE_LAYOUT): SceneObject[] {
  const { aisle } = layout.room
  const half = aisle.width / 2
  return layout.objects.filter((object) => {
    const { halfX, halfZ } = footprint(object)
    const [x, , z] = object.position
    if (aisle.axis === 'x') {
      const min = z - halfZ
      const max = z + halfZ
      return max > aisle.center - half + EPSILON && min < aisle.center + half - EPSILON
    }
    const min = x - halfX
    const max = x + halfX
    return max > aisle.center - half + EPSILON && min < aisle.center + half - EPSILON
  })
}

/** Kursi milik satu meja, urut berdasarkan `seat`. */
export function getTableChairs(
  tableId: string,
  layout: SceneLayout = CAFE_LAYOUT,
): SceneObject[] {
  return layout.objects
    .filter((object) => object.type === 'chair' && object.tableId === tableId)
    .sort((a, b) => (a.seat ?? '').localeCompare(b.seat ?? ''))
}

/** Meja berdasarkan ID (`table_03`). */
export function getTableById(
  tableId: string,
  layout: SceneLayout = CAFE_LAYOUT,
): SceneObject | undefined {
  const object = objectById(layout, tableId)
  return object?.type === 'table' ? object : undefined
}

/**
 * Normalisasi query QR menjadi ID meja.
 *
 * Menerima `3`, `03`, `table_3`, `table_03`, atau `?table=03`.
 * Mengembalikan `null` jika meja tidak ada.
 */
export function normalizeTableQuery(
  raw: string | null | undefined,
  layout: SceneLayout = CAFE_LAYOUT,
): string | null {
  if (!raw) return null
  let value = raw.trim()
  if (value.includes('=')) value = value.split('=').pop() ?? ''
  value = decodeURIComponent(value).trim().toLowerCase()
  const match = /^(?:table[\s_-]*)?0*(\d{1,2})$/.exec(value)
  if (!match) return null
  const id = `table_${match[1].padStart(2, '0')}`
  return getTableById(id, layout) ? id : null
}

/** ID meja dari query `?table=03`, atau `null`. */
export function tableFromQuery(
  raw: string | null | undefined,
  layout: SceneLayout = CAFE_LAYOUT,
): string | null {
  return normalizeTableQuery(raw, layout)
}

function validateLighting(layout: SceneLayout, errors: string[], warnings: string[]) {
  const { lighting } = layout
  if (!['enabled', 'disabled'].includes(lighting.day)) {
    errors.push(`lighting.day tidak valid: ${String(lighting.day)}`)
  }
  if (!['enabled', 'disabled'].includes(lighting.night)) {
    errors.push(`lighting.night tidak valid: ${String(lighting.night)}`)
  }
  if (lighting.day === 'enabled' && lighting.night === 'enabled') {
    warnings.push('Mode siang dan malam sama-sama aktif.')
  }
  if (lighting.ambientIntensity !== 0.85) {
    errors.push(`ambientIntensity harus 0.85, ditemukan ${lighting.ambientIntensity}`)
  }
  if (lighting.colorTemperature !== 5600) {
    errors.push(`colorTemperature harus 5600 K, ditemukan ${lighting.colorTemperature}`)
  }
  if (lighting.lampIntensity !== 22) {
    errors.push(`lampIntensity harus 22, ditemukan ${lighting.lampIntensity}`)
  }

  const lights = layout.objects.filter((object) => object.type === 'light')
  if (lights.length !== 5) errors.push(`Jumlah lampu harus 5, ditemukan ${lights.length}`)
  for (const lamp of lights) {
    if (lamp.intensity !== 22) {
      errors.push(`${lamp.id}: intensity lampu harus 22`)
    }
    if (!lamp.lightformer || !['rect', 'circle'].includes(lamp.lightformer)) {
      errors.push(`${lamp.id}: lightformer tidak valid`)
    }
  }

  const forms = new Set(lighting.lightformers.map((former) => former.form))
  if (!forms.has('rect')) errors.push('Lightformer rect tidak tersedia')
  if (!forms.has('circle')) errors.push('Lightformer circle tidak tersedia')
  for (const former of lighting.lightformers) {
    if (!FINITE(former.intensity) || former.intensity < 0) {
      errors.push(`Lightformer ${former.id}: intensity tidak valid`)
    }
    if (typeof former.enabled !== 'boolean') {
      errors.push(`Lightformer ${former.id}: enabled harus boolean`)
    }
  }
}

function validateAudio(layout: SceneLayout, errors: string[]) {
  const { audio } = layout
  if (!audio.track.endsWith('.mp3')) {
    errors.push(`Audio harus MP3, ditemukan ${audio.track}`)
  }
  if (typeof audio.muted !== 'boolean') errors.push('audio.muted harus boolean')
  if (!FINITE(audio.volume) || audio.volume < 0 || audio.volume > 1) {
    errors.push(`audio.volume harus 0..1, ditemukan ${audio.volume}`)
  }
  if (typeof audio.autoplay !== 'boolean') errors.push('audio.autoplay harus boolean')
}

/** Validasi lengkap layout. Tidak melempar error; lihat `assertLayout`. */
export function validateLayout(layout: SceneLayout = CAFE_LAYOUT): LayoutValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (layout.scene !== 'cafe_hero') errors.push(`scene harus cafe_hero, ditemukan ${layout.scene}`)
  if (layout.units !== 'meters') errors.push('units harus meters')
  if (layout.room.width !== 20) errors.push(`Lebar ruangan harus 20 m, ditemukan ${layout.room.width}`)
  if (layout.room.depth !== 12) errors.push(`Kedalaman ruangan harus 12 m, ditemukan ${layout.room.depth}`)
  if (layout.room.height !== 4.2) errors.push(`Tinggi ruangan harus 4.2 m, ditemukan ${layout.room.height}`)
  if (layout.room.aisle.width !== 2) {
    errors.push(`Lebar lorong harus 2 m, ditemukan ${layout.room.aisle.width}`)
  }

  // ID unik.
  const ids = new Set<string>()
  for (const object of layout.objects) {
    if (ids.has(object.id)) errors.push(`ID duplikat: ${object.id}`)
    ids.add(object.id)
  }

  const tables = layout.objects.filter((object) => object.type === 'table')
  const chairs = layout.objects.filter((object) => object.type === 'chair')
  const lights = layout.objects.filter((object) => object.type === 'light')

  if (tables.length < 8 || tables.length > 10) {
    errors.push(`Jumlah meja harus 8–10, ditemukan ${tables.length}`)
  }
  if (layout.standards.tableWidth !== 1.2 || layout.standards.tableDepth !== 0.8) {
    errors.push('Ukuran meja harus 1.2 × 0.8 m')
  }
  if (layout.standards.chairsPerTable[0] !== 4 || layout.standards.chairsPerTable[1] !== 5) {
    errors.push('Rentang kursi per meja harus 4–5')
  }

  const halfWidth = layout.room.width / 2
  const halfDepth = layout.room.depth / 2

  for (const object of layout.objects) {
    if (!isVec3(object.position)) {
      errors.push(`${object.id}: position tidak valid`)
      continue
    }
    if (!isVec3(object.rotation)) {
      errors.push(`${object.id}: rotation tidak valid`)
      continue
    }
    if (Math.abs(object.rotation[0]) > EPSILON || Math.abs(object.rotation[2]) > EPSILON) {
      errors.push(`${object.id}: rotasi hanya boleh pada sumbu Y`)
    }
    if (!MODEL_FILES.has(object.model)) {
      errors.push(`${object.id}: model ${object.model} tidak ada di katalog`)
    }

    const [x, y, z] = object.position
    if (Math.abs(x) > halfWidth + ROOM_TOLERANCE || Math.abs(z) > halfDepth + ROOM_TOLERANCE) {
      errors.push(`${object.id}: posisi di luar ruangan (${round(x)}, ${round(z)})`)
    }
    if (y < -ROOM_TOLERANCE || y > layout.room.height + ROOM_TOLERANCE) {
      errors.push(`${object.id}: ketinggian ${round(y)} m di luar ruangan`)
    }
  }

  // Meja: tableId harus menunjuk ke dirinya sendiri & punya 4–5 kursi.
  for (const table of tables) {
    if (table.tableId !== table.id) {
      errors.push(`${table.id}: tableId harus sama dengan id meja`)
    }
    const tableChairs = getTableChairs(table.id, layout)
    if (tableChairs.length < 4 || tableChairs.length > 5) {
      errors.push(`${table.id}: jumlah kursi ${tableChairs.length}, harus 4–5`)
    }
    const seats = new Set(tableChairs.map((chair) => chair.seat))
    if (seats.size !== tableChairs.length) {
      errors.push(`${table.id}: ada huruf kursi duplikat`)
    }
  }

  // Kursi harus punya meja valid dan berada dekat meja tersebut.
  for (const chair of chairs) {
    if (!chair.tableId) {
      errors.push(`${chair.id}: kursi tanpa tableId`)
      continue
    }
    const table = getTableById(chair.tableId, layout)
    if (!table) {
      errors.push(`${chair.id}: tableId ${chair.tableId} tidak ditemukan`)
      continue
    }
    const distance = Math.hypot(
      chair.position[0] - table.position[0],
      chair.position[2] - table.position[2],
    )
    if (distance > CHAIR_TABLE_MAX_DISTANCE) {
      errors.push(`${chair.id}: terlalu jauh dari ${chair.tableId} (${round(distance)} m)`)
    }
  }

  const aisleObjects = objectsInAisle(layout)
  for (const object of aisleObjects) {
    errors.push(`${object.id}: menghalangi lorong utama`)
  }

  validateLighting(layout, errors, warnings)
  validateAudio(layout, errors)

  const models = new Set(layout.objects.map((object) => object.model))
  for (const file of models) {
    if (!MODEL_FILES.has(file)) errors.push(`Model tidak dikenal: ${file}`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      objects: layout.objects.length,
      tables: tables.length,
      chairs: chairs.length,
      lights: lights.length,
      models: models.size,
    },
  }
}

/** Lempar `Error` berisi semua masalah layout. */
export function assertLayout(layout: SceneLayout = CAFE_LAYOUT): SceneLayout {
  const result = validateLayout(layout)
  if (!result.ok) {
    throw new Error(`Layout tidak valid:\n- ${result.errors.join('\n- ')}`)
  }
  return layout
}

/** Klip animasi yang tersedia untuk sebuah objek. */
export function animationFor(object: SceneObject): string | undefined {
  return object.animation
}
