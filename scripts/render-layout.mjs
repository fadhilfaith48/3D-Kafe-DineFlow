import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/**
 * Render denah layout dari `src/data/cafe_hero.json` ke SVG + PNG.
 * Tidak memakai browser/canvas: SVG dibuat manual lalu dirasterisasi sharp.
 */

const layout = JSON.parse(await fs.readFile('src/data/cafe_hero.json', 'utf8'))
const catalog = JSON.parse(await fs.readFile('src/data/modelCatalog.json', 'utf8'))

const ROOM = layout.room
const WIDTH = 20
const DEPTH = 12
const SCALE = 46
const PAD = 46
const HEADER = 62
const FOOTER = 58
const CANVAS_W = Math.round(WIDTH * SCALE + PAD * 2)
const CANVAS_H = Math.round(DEPTH * SCALE + PAD * 2 + HEADER + FOOTER)

const px = (x) => PAD + (x + WIDTH / 2) * SCALE
const pz = (z) => HEADER + PAD + (z + DEPTH / 2) * SCALE
const meters = (value) => value * SCALE

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      default:
        return '&quot;'
    }
  })

function footprint(object) {
  const entry = catalog.models[object.model.replace(/\.glb$/, '')]
  if (!entry) return { width: 0.4, depth: 0.4 }
  const width = entry.bounds.max[0] - entry.bounds.min[0]
  const depth = entry.bounds.max[2] - entry.bounds.min[2]
  const quarter = Math.abs(Math.sin(object.rotation?.[1] ?? 0)) > 0.7
  return {
    width: quarter ? depth : width,
    depth: quarter ? width : depth,
  }
}

const ZONE_STYLE = {
  dining_south: { fill: '#EAD8B8', stroke: '#B07B4B', text: '#5A3524' },
  dining_north: { fill: '#DDE8DE', stroke: '#5F7F63', text: '#2F4A34' },
  bar: { fill: '#3A2116', stroke: '#1F120C', text: '#F3E9DC' },
  kitchen: { fill: '#B9BEC4', stroke: '#6E767E', text: '#24242A' },
  entrance: { fill: '#D7EAF7', stroke: '#6E9BB8', text: '#22485F' },
  decor: { fill: '#D9C3A5', stroke: '#8C6B49', text: '#4A2C18' },
}

const parts = []
const push = (fragment) => parts.push(fragment)

push(`<?xml version="1.0" encoding="UTF-8"?>`)
push(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">`,
)
push('<defs>')
push(
  '<pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M 46 0 L 0 0 0 46" fill="none" stroke="#E7DFD3" stroke-width="1"/></pattern>',
)
push(
  '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAF6EF"/><stop offset="1" stop-color="#F1E9DC"/></linearGradient>',
)
push('</defs>')
push(`<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>`)

push(
  `<text x="${PAD}" y="36" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#3A2116">Kopi Senja — Denah 20 × 12 m</text>`,
)
push(
  `<text x="${PAD}" y="54" font-family="Segoe UI, sans-serif" font-size="11" fill="#7A4A2B">${layout.objects.length} objek · ${layout.objects.filter((o) => o.type === 'table').length} meja · ${layout.objects.filter((o) => o.type === 'chair').length} kursi · ${layout.objects.filter((o) => o.type === 'light').length} lampu · lorong ${ROOM.aisle.width} m</text>`,
)

// Lantai + grid.
push(
  `<rect x="${px(-10)}" y="${pz(-6)}" width="${meters(20)}" height="${meters(12)}" rx="6" fill="#FBF8F2" stroke="#4A2C18" stroke-width="3"/>`,
)
push(
  `<rect x="${px(-10)}" y="${pz(-6)}" width="${meters(20)}" height="${meters(12)}" fill="url(#grid)" opacity="0.55"/>`,
)

// Lorong utama.
const aisleCenter = ROOM.aisle.center
const aisleHalf = ROOM.aisle.width / 2
push(
  `<rect x="${px(-10)}" y="${pz(aisleCenter - aisleHalf)}" width="${meters(20)}" height="${meters(ROOM.aisle.width)}" fill="#FFE3C0" opacity="0.55"/>`,
)
push(
  `<line x1="${px(-10)}" y1="${pz(aisleCenter - aisleHalf)}" x2="${px(10)}" y2="${pz(aisleCenter - aisleHalf)}" stroke="#D79A54" stroke-width="1.5" stroke-dasharray="7 5"/>`,
)
push(
  `<line x1="${px(-10)}" y1="${pz(aisleCenter + aisleHalf)}" x2="${px(10)}" y2="${pz(aisleCenter + aisleHalf)}" stroke="#D79A54" stroke-width="1.5" stroke-dasharray="7 5"/>`,
)
push(
  `<text x="${px(0)}" y="${pz(0) + 4}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10" letter-spacing="3" fill="#A9713F">LORONG UTAMA 2 m</text>`,
)

// Objek, kursi/meja dulu lalu objek lain.
const order = ['decor', 'counter', 'appliance', 'shelf', 'sink', 'window', 'door', 'table', 'chair', 'character', 'light']
const objects = [...layout.objects].sort(
  (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
)

for (const object of objects) {
  const { width, depth } = footprint(object)
  const style = ZONE_STYLE[object.zone] ?? ZONE_STYLE.decor
  const [x, y, z] = object.position

  if (object.type === 'light') {
    const cx = px(x)
    const cy = pz(z)
    push(
      `<circle cx="${cx}" cy="${cy}" r="7" fill="#FFB066" stroke="#B08D57" stroke-width="2"/>`,
    )
    push(
      `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#FFB066" stroke-width="1" opacity="0.7"/>`,
    )
    continue
  }

  if (object.type === 'window') {
    push(
      `<rect x="${px(x) - meters(width) / 2}" y="${pz(z) - meters(depth) / 2}" width="${meters(width)}" height="${meters(depth)}" fill="#D7EAF7" stroke="#6E9BB8" stroke-width="2"/>`,
    )
    continue
  }

  if (object.type === 'door') {
    push(
      `<rect x="${px(x) - meters(width) / 2}" y="${pz(z) - meters(depth) / 2}" width="${meters(width)}" height="${meters(depth)}" fill="#B5652F" stroke="#4A2C18" stroke-width="1.5"/>`,
    )
    push(
      `<text x="${px(x)}" y="${pz(z) + 3}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="8" fill="#F3E9DC">PINTU</text>`,
    )
    continue
  }

  // Kotak footprint berpusat pada posisi objek (bounds horizontal simetris).
  const left = px(x) - meters(width) / 2
  const top = pz(z) - meters(depth) / 2
  const drawW = Math.max(meters(width), 3)
  const drawH = Math.max(meters(depth), 3)
  const radius = object.type === 'chair' ? 5 : 3
  const opacity = object.type === 'chair' ? 0.9 : 0.92

  if (object.type === 'chair') {
    push(
      `<rect x="${left}" y="${top}" width="${drawW}" height="${drawH}" rx="${radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.4" opacity="${opacity}"/>`,
    )
    continue
  }

  push(
    `<rect x="${left}" y="${top}" width="${drawW}" height="${drawH}" rx="${radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="1.6" opacity="${opacity}"/>`,
  )

  if (object.type === 'table') {
    push(
      `<text x="${left + drawW / 2}" y="${top + drawH / 2 + 3}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="9" font-weight="700" fill="${style.text}">${escapeXml(object.id.replace('table_', 'M'))}</text>`,
    )
  }

  if (object.type === 'character') {
    push(
      `<circle cx="${px(x)}" cy="${pz(z)}" r="6" fill="#D9A47E" stroke="#6B3E26" stroke-width="1.4"/>`,
    )
    push(
      `<text x="${px(x)}" y="${pz(z) - 11}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="8" fill="#6B3E26">barista</text>`,
    )
  }

  if (object.type === 'counter' || object.id === 'kitchen_island' || object.id === 'fridge') {
    push(
      `<text x="${left + drawW / 2}" y="${top + drawH / 2 + 3}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="8" fill="${style.text}">${escapeXml(object.id.replace(/_/g, ' '))}</text>`,
    )
  }

  if (y > 1.6 && object.type === 'decor') {
    push(`<circle cx="${left + drawW - 3}" cy="${top + 3}" r="2.4" fill="#23302A"/>`)
  }
}

// Penanda sisi & ukuran.
push(
  `<text x="${px(0)}" y="${pz(-6) - 9}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10" fill="#7A4A2B">UTARA · bar &amp; dapur terbuka</text>`,
)
push(
  `<text x="${px(0)}" y="${pz(6) + 18}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10" fill="#7A4A2B">SELATAN · jendela</text>`,
)
push(
  `<text x="${px(-10)}" y="${pz(6) + 18}" text-anchor="start" font-family="Segoe UI, sans-serif" font-size="10" fill="#7A4A2B">← 20 m →</text>`,
)
push(
  `<text x="${px(10)}" y="${pz(6) + 18}" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="10" fill="#7A4A2B">12 m</text>`,
)

// Legenda.
const legendY = CANVAS_H - FOOTER + 22
const legends = [
  ['#EAD8B8', '#B07B4B', 'Meja selatan'],
  ['#DDE8DE', '#5F7F63', 'Meja utara'],
  ['#3A2116', '#1F120C', 'Bar'],
  ['#B9BEC4', '#6E767E', 'Dapur'],
  ['#FFB066', '#B08D57', 'Lampu (22)'],
  ['#FFE3C0', '#D79A54', 'Lorong 2 m'],
]
let legendX = PAD
for (const [fill, stroke, label] of legends) {
  push(
    `<rect x="${legendX}" y="${legendY - 9}" width="13" height="13" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`,
  )
  push(
    `<text x="${legendX + 19}" y="${legendY + 2}" font-family="Segoe UI, sans-serif" font-size="10" fill="#4A2C18">${escapeXml(label)}</text>`,
  )
  legendX += 19 + label.length * 5.7 + 18
}

push(
  `<text x="${CANVAS_W - PAD}" y="${legendY + 2}" text-anchor="end" font-family="Segoe UI, sans-serif" font-size="9" fill="#8C6B49">dibuat dari src/data/cafe_hero.json</text>`,
)
push('</svg>')

const svg = parts.join('\n')
const outDir = path.resolve('shots')
await fs.mkdir(outDir, { recursive: true })
const svgFile = path.join(outDir, 'cafe-layout.svg')
const pngFile = path.join(outDir, 'cafe-layout.png')
await fs.writeFile(svgFile, svg)
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(pngFile)
const { size } = await fs.stat(pngFile)

console.log(`Denah ditulis: ${path.relative(process.cwd(), svgFile)}`)
console.log(`Pratinjau PNG: ${path.relative(process.cwd(), pngFile)} (${(size / 1024).toFixed(1)} KB)`)
