import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Sumber kebenaran layout kafe 20 × 12 m.
 * Menjalankan script ini akan menulis:
 *  - src/data/cafe_hero.json  (dipakai aplikasi & unit test)
 *  - public/scene/cafe_hero.json (untuk import / diunduh)
 *
 * Koordinat memakai meter, sumbu Y ke atas, pusat ruangan (0,0).
 * Dinding: x = ±10, z = ±6. Lorong utama 2 m pada z = -1…+1.
 */

const ROOM = { width: 20, depth: 12, height: 4.2 }
const AISLE = { axis: 'x', center: 0, width: 2 }
const MARGIN = 0.4

const round = (value, digits = 4) => Number(value.toFixed(digits))
const rad = {
  north: 0,
  south: round(Math.PI),
  west: round(Math.PI / 2),
  east: round(-Math.PI / 2),
}

/** 9 meja: 5 baris selatan (dekat jendela) + 4 baris utara. */
const TABLES = [
  { id: 'table_01', x: -7.6, z: 2.75, chairs: 5, zone: 'dining_south' },
  { id: 'table_02', x: -4.0, z: 2.75, chairs: 4, zone: 'dining_south' },
  { id: 'table_03', x: -0.4, z: 2.75, chairs: 4, zone: 'dining_south' },
  { id: 'table_04', x: 3.2, z: 2.75, chairs: 4, zone: 'dining_south' },
  { id: 'table_05', x: 6.8, z: 2.75, chairs: 4, zone: 'dining_south' },
  { id: 'table_06', x: -4.6, z: -2.55, chairs: 4, zone: 'dining_north' },
  { id: 'table_07', x: -1.0, z: -2.55, chairs: 4, zone: 'dining_north' },
  { id: 'table_08', x: 2.6, z: -2.55, chairs: 4, zone: 'dining_north' },
  { id: 'table_09', x: 6.2, z: -2.55, chairs: 5, zone: 'dining_north' },
]

/** Posisi kursi relatif terhadap pusat meja. */
function chairSeats(count) {
  if (count === 5) {
    return [
      { suffix: 'a', dx: -0.31, dz: -0.86, rot: rad.north },
      { suffix: 'b', dx: 0.31, dz: -0.86, rot: rad.north },
      { suffix: 'c', dx: 0, dz: 0.86, rot: rad.south },
      { suffix: 'd', dx: -0.86, dz: 0, rot: rad.west },
      { suffix: 'e', dx: 0.86, dz: 0, rot: rad.east },
    ]
  }
  return [
    { suffix: 'a', dx: 0, dz: -0.86, rot: rad.north },
    { suffix: 'b', dx: 0, dz: 0.86, rot: rad.south },
    { suffix: 'c', dx: -0.86, dz: 0, rot: rad.west },
    { suffix: 'd', dx: 0.86, dz: 0, rot: rad.east },
  ]
}

const objects = []

function addObject({
  id,
  type,
  model,
  position,
  rotation = [0, 0, 0],
  zone,
  tableId,
  animation,
  lightformer,
  intensity,
  seat,
}) {
  objects.push({
    id,
    type,
    model,
    position: position.map((value) => round(value)),
    rotation: rotation.map((value) => round(value)),
    ...(zone ? { zone } : {}),
    ...(tableId ? { tableId } : {}),
    ...(seat ? { seat } : {}),
    ...(animation ? { animation } : {}),
    ...(lightformer ? { lightformer } : {}),
    ...(intensity !== undefined ? { intensity } : {}),
  })
}

// ── Meja & kursi ─────────────────────────────────────────────
for (const table of TABLES) {
  addObject({
    id: table.id,
    type: 'table',
    model: 'table.glb',
    position: [table.x, 0, table.z],
    zone: table.zone,
    tableId: table.id,
  })
  for (const seat of chairSeats(table.chairs)) {
    addObject({
      id: `chair_${table.id.slice(-2)}${seat.suffix}`,
      type: 'chair',
      model: 'chair.glb',
      position: [table.x + seat.dx, 0, table.z + seat.dz],
      rotation: [0, seat.rot, 0],
      zone: table.zone,
      tableId: table.id,
      seat: seat.suffix,
    })
  }
}

// ── Bar espresso 3 m + back bar ─────────────────────────────
addObject({
  id: 'bar_counter',
  type: 'counter',
  model: 'bar_counter.glb',
  position: [-1.5, 0, -4.55],
  zone: 'bar',
})
addObject({
  id: 'sink_01',
  type: 'sink',
  model: 'sink.glb',
  position: [-2.55, 1.063, -4.55],
  zone: 'bar',
})
addObject({
  id: 'sink_02',
  type: 'sink',
  model: 'sink.glb',
  position: [-2.05, 1.063, -4.55],
  zone: 'bar',
})
addObject({
  id: 'espresso_machine',
  type: 'appliance',
  model: 'espresso_machine.glb',
  position: [-0.9, 1.063, -4.55],
  zone: 'bar',
})
addObject({
  id: 'glass_shelf',
  type: 'shelf',
  model: 'glass_shelf.glb',
  position: [-1.5, 2.45, -5.62],
  zone: 'bar',
})

const JARS = [
  { id: 'jar_01', x: -2.38, y: 2.17 },
  { id: 'jar_02', x: -2.02, y: 2.17 },
  { id: 'jar_03', x: -1.02, y: 2.17 },
  { id: 'jar_04', x: -0.66, y: 2.17 },
]
for (const jar of JARS) {
  addObject({
    id: jar.id,
    type: 'decor',
    model: 'jar.glb',
    position: [jar.x, jar.y, -5.6],
    zone: 'bar',
  })
}
addObject({
  id: 'pastry_01',
  type: 'decor',
  model: 'pastry.glb',
  position: [-1.8, 2.73, -5.6],
  zone: 'bar',
})
addObject({
  id: 'pastry_02',
  type: 'decor',
  model: 'pastry.glb',
  position: [-0.75, 2.73, -5.6],
  zone: 'bar',
})

addObject({
  id: 'barista',
  type: 'character',
  model: 'barista.glb',
  position: [-1.5, 0, -5.25],
  rotation: [0, 0, 0],
  animation: 'idle',
  zone: 'bar',
})

// ── Dapur terbuka di sisi barat ─────────────────────────────
addObject({
  id: 'kitchen_island',
  type: 'appliance',
  model: 'kitchen_island.glb',
  position: [-8, 0, -4.35],
  zone: 'kitchen',
})
addObject({
  id: 'range_hood',
  type: 'appliance',
  model: 'range_hood.glb',
  position: [-8, 3.95, -4.35],
  zone: 'kitchen',
})
addObject({
  id: 'fridge',
  type: 'appliance',
  model: 'fridge.glb',
  position: [-9.15, 0, -5.2],
  zone: 'kitchen',
})
addObject({
  id: 'pot_rack',
  type: 'decor',
  model: 'pot_rack.glb',
  position: [-8, 2.75, -4.35],
  zone: 'kitchen',
})
addObject({
  id: 'copper_pot_01',
  type: 'decor',
  model: 'copper_pot.glb',
  position: [-8.35, 2.09, -4.35],
  zone: 'kitchen',
})
addObject({
  id: 'copper_pot_02',
  type: 'decor',
  model: 'copper_pot.glb',
  position: [-7.65, 2.09, -4.35],
  zone: 'kitchen',
})

// ── Dekorasi ────────────────────────────────────────────────
addObject({
  id: 'rug',
  type: 'decor',
  model: 'rug.glb',
  position: [0, 0, 2.75],
  zone: 'decor',
})
for (const [index, x] of [-6, -2, 2, 6].entries()) {
  addObject({
    id: `window_0${index + 1}`,
    type: 'window',
    model: 'window.glb',
    position: [x, 2.4, 5.9],
    rotation: [0, round(Math.PI), 0],
    zone: 'entrance',
  })
}
addObject({
  id: 'door',
  type: 'door',
  model: 'door.glb',
  position: [9.92, 0, 4.4],
  rotation: [0, rad.east, 0],
  zone: 'entrance',
})
addObject({
  id: 'menu_board',
  type: 'decor',
  model: 'menu_board.glb',
  position: [9.82, 2.3, -2.2],
  rotation: [0, rad.east, 0],
  zone: 'decor',
})
addObject({
  id: 'bookshelf',
  type: 'decor',
  model: 'bookshelf.glb',
  position: [9.7, 0, 2.4],
  rotation: [0, rad.east, 0],
  zone: 'decor',
})
addObject({
  id: 'art_01',
  type: 'decor',
  model: 'art_frame.glb',
  position: [-9.88, 2.35, 1.8],
  rotation: [0, rad.west, 0],
  zone: 'decor',
})
addObject({
  id: 'art_02',
  type: 'decor',
  model: 'art_frame.glb',
  position: [9.88, 2.35, -3.8],
  rotation: [0, rad.east, 0],
  zone: 'decor',
})
addObject({
  id: 'art_03',
  type: 'decor',
  model: 'art_frame.glb',
  position: [6.6, 2.6, -5.82],
  rotation: [0, 0, 0],
  zone: 'decor',
})

const PLANTS = [
  { id: 'plant_01', x: -9.2, z: 5.2 },
  { id: 'plant_02', x: -9.2, z: 1.7 },
  { id: 'plant_03', x: 8.9, z: -5.1 },
  { id: 'plant_04', x: -5.3, z: 5.2 },
]
for (const plant of PLANTS) {
  addObject({
    id: plant.id,
    type: 'decor',
    model: 'plant.glb',
    position: [plant.x, 0, plant.z],
    zone: 'decor',
  })
}

for (const [index, x] of [-2.6, -1.5, -0.4].entries()) {
  addObject({
    id: `bar_stool_0${index + 1}`,
    type: 'decor',
    model: 'bar_stool.glb',
    position: [x, 0, -3.45],
    rotation: [0, rad.south, 0],
    zone: 'bar',
  })
}

// Cangkir di meja & bar.
addObject({
  id: 'cup_01',
  type: 'decor',
  model: 'cup.glb',
  position: [-0.62, 0.75, 2.52],
  zone: 'dining_south',
})
addObject({
  id: 'cup_02',
  type: 'decor',
  model: 'cup.glb',
  position: [-4.78, 0.75, -2.32],
  zone: 'dining_north',
})
addObject({
  id: 'cup_03',
  type: 'decor',
  model: 'cup.glb',
  position: [-2.2, 1.063, -4.32],
  zone: 'bar',
})

// ── Lampu gantung ───────────────────────────────────────────
const LAMPS = [
  { id: 'lamp_01', x: -1.5, z: -4.3, zone: 'bar' },
  { id: 'lamp_02', x: -4.6, z: -2.55, zone: 'dining_north' },
  { id: 'lamp_03', x: 2.6, z: -2.55, zone: 'dining_north' },
  { id: 'lamp_04', x: -4.0, z: 2.75, zone: 'dining_south' },
  { id: 'lamp_05', x: 3.2, z: 2.75, zone: 'dining_south' },
]
for (const lamp of LAMPS) {
  addObject({
    id: lamp.id,
    type: 'light',
    model: 'pendant_lamp.glb',
    position: [lamp.x, ROOM.height, lamp.z],
    zone: lamp.zone,
    lightformer: 'circle',
    intensity: 22,
  })
}

const layout = {
  scene: 'cafe_hero',
  version: 2,
  units: 'meters',
  room: {
    width: ROOM.width,
    depth: ROOM.depth,
    height: ROOM.height,
    margin: MARGIN,
    aisle: AISLE,
  },
  standards: {
    tableWidth: 1.2,
    tableDepth: 0.8,
    tableHeight: 0.75,
    chairSeatHeight: 0.45,
    chairsPerTable: [4, 5],
  },
  objects,
  lighting: {
    day: 'enabled',
    night: 'disabled',
    ambientIntensity: 0.85,
    colorTemperature: 5600,
    lampIntensity: 22,
    lightformers: [
      {
        id: 'lightformer_rect',
        form: 'rect',
        enabled: true,
        intensity: 1.6,
        color: '#FFE3C0',
        scale: [9, 6],
      },
      {
        id: 'lightformer_circle',
        form: 'circle',
        enabled: true,
        intensity: 0.7,
        color: '#FFB066',
        scale: [4, 4],
      },
    ],
  },
  audio: {
    track: 'cafe_ambience.mp3',
    muted: false,
    volume: 0.18,
    autoplay: false,
  },
  generatedFrom: 'scripts/generate-layout.mjs',
}

const json = `${JSON.stringify(layout, null, 2)}\n`
await fs.mkdir(path.resolve('src/data'), { recursive: true })
await fs.mkdir(path.resolve('public/scene'), { recursive: true })
await fs.writeFile(path.resolve('src/data/cafe_hero.json'), json)
await fs.writeFile(path.resolve('public/scene/cafe_hero.json'), json)

const tables = objects.filter((object) => object.type === 'table')
const chairs = objects.filter((object) => object.type === 'chair')
const lamps = objects.filter((object) => object.type === 'light')
console.log(
  `Layout ditulis: ${objects.length} objek, ${tables.length} meja, ${chairs.length} kursi, ${lamps.length} lampu.`,
)
console.log('  src/data/cafe_hero.json')
console.log('  public/scene/cafe_hero.json')
