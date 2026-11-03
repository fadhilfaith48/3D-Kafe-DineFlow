import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

/**
 * Generator tekstur PBR prosedural (tanpa aset pihak ketiga).
 * Output: albedo / normal / roughness / metallic dalam WebP 512×512.
 *
 * Semua noise dibuat periodik (lattice di-wrap) agar tekstur bisa
 * di-tile tanpa garis sambungan yang terlihat.
 */

const SIZE = 512
const OUT = path.resolve('public/textures')

const clamp01 = (value) => Math.min(1, Math.max(0, value))
const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function hash(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

/** Value noise periodik: lattice dibungkus pada `frequency`. */
function noise(u, v, frequency, seed) {
  const x = u * frequency
  const y = v * frequency
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const wrap = (n) => ((n % frequency) + frequency) % frequency
  const h00 = hash(wrap(x0), wrap(y0), seed)
  const h10 = hash(wrap(x0 + 1), wrap(y0), seed)
  const h01 = hash(wrap(x0), wrap(y0 + 1), seed)
  const h11 = hash(wrap(x0 + 1), wrap(y0 + 1), seed)
  return lerp(lerp(h00, h10, sx), lerp(h01, h11, sx), sy)
}

function fbm(u, v, baseFrequency, octaves, seed) {
  let value = 0
  let amplitude = 0.5
  let total = 0
  let frequency = baseFrequency
  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise(u, v, frequency, seed + octave * 101) * amplitude
    total += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / total
}

const DEFS = {
  oak(u, v) {
    const warp = fbm(u, v, 3, 4, 11)
    const ring = 0.5 + 0.5 * Math.sin((v * 16 + warp * 3.4 + u * 0.6) * Math.PI * 2)
    const fine = fbm(u, v, 18, 3, 23)
    const pore = smoothstep(0.55, 0.85, fbm(u, v, 48, 2, 37))
    const t = clamp01(ring * 0.55 + fine * 0.45 - pore * 0.12)
    return {
      r: lerp(0.36, 0.68, t),
      g: lerp(0.21, 0.46, t),
      b: lerp(0.1, 0.25, t),
      height: clamp01(fine * 0.65 + ring * 0.3 - pore * 0.25),
      rough: clamp01(0.52 + fine * 0.2 + pore * 0.08),
      metal: 0,
    }
  },
  marble(u, v) {
    const warp = fbm(u, v, 3, 5, 51)
    const vein = Math.abs(Math.sin((u * 2.1 + v * 1.35 + warp * 2.8) * Math.PI * 2))
    const line = Math.pow(1 - vein, 9)
    const fine = fbm(u, v, 20, 3, 63)
    const cloud = fbm(u, v, 5, 4, 67)
    const t = clamp01(line * 0.9 + cloud * 0.16)
    return {
      r: lerp(0.83, 0.44, t),
      g: lerp(0.81, 0.43, t),
      b: lerp(0.77, 0.42, t),
      height: clamp01(0.5 + line * 0.12 + fine * 0.1),
      rough: clamp01(0.18 + fine * 0.12 + line * 0.1),
      metal: 0,
    }
  },
  leather(u, v) {
    const pores = fbm(u, v, 38, 3, 83)
    const broad = fbm(u, v, 7, 4, 89)
    const crease = smoothstep(0.62, 0.82, fbm(u, v, 9, 3, 97))
    const t = clamp01(broad * 0.4 + pores * 0.4 - crease * 0.25)
    return {
      r: lerp(0.16, 0.3, t),
      g: lerp(0.09, 0.18, t),
      b: lerp(0.05, 0.11, t),
      height: clamp01(pores * 0.8 - crease * 0.5),
      rough: clamp01(0.46 + pores * 0.26 + crease * 0.1),
      metal: 0.02,
    }
  },
  brass(u, v) {
    const streak = noise(u, v, 96, 113) * 0.6 + noise(u, v, 24, 127) * 0.4
    const patina = fbm(u, v, 5, 3, 131)
    const t = clamp01(streak * 0.7 + patina * 0.3)
    return {
      r: lerp(0.6, 0.78, t),
      g: lerp(0.46, 0.62, t),
      b: lerp(0.25, 0.37, t),
      height: clamp01(streak * 0.5 + patina * 0.5),
      rough: clamp01(0.2 + t * 0.22),
      metal: 1,
    }
  },
  steel(u, v) {
    const streak = noise(u, v, 120, 151) * 0.7 + noise(u, v, 16, 157) * 0.3
    const scratch = smoothstep(0.8, 0.95, noise(u * 3, v, 60, 163))
    return {
      r: lerp(0.62, 0.78, streak),
      g: lerp(0.65, 0.8, streak),
      b: lerp(0.68, 0.82, streak),
      height: clamp01(streak * 0.5 + scratch * 0.05),
      rough: clamp01(0.22 + streak * 0.2 + scratch * 0.1),
      metal: 1,
    }
  },
  plaster(u, v) {
    const fine = fbm(u, v, 24, 4, 181)
    const broad = fbm(u, v, 5, 3, 191)
    const t = clamp01(fine * 0.6 + broad * 0.4)
    return {
      r: lerp(0.8, 0.9, t),
      g: lerp(0.73, 0.84, t),
      b: lerp(0.62, 0.75, t),
      height: clamp01(fine * 0.7 + broad * 0.3),
      rough: clamp01(0.88 + fine * 0.08),
      metal: 0,
    }
  },
  ceramic(u, v) {
    const fine = fbm(u, v, 28, 3, 211)
    const speck = smoothstep(0.88, 0.98, noise(u, v, 128, 223))
    const t = clamp01(fine * 0.4 + speck * 0.5)
    return {
      r: lerp(0.88, 0.96, t),
      g: lerp(0.84, 0.93, t),
      b: lerp(0.77, 0.88, t),
      height: clamp01(0.5 + fine * 0.2 + speck * 0.1),
      rough: clamp01(0.3 + fine * 0.14 - speck * 0.04),
      metal: 0,
    }
  },
}

/** Blur kotak periodik: meredam detail tinggi agar normal map tidak "static". */
function boxBlur(source, size, radius, passes = 2) {
  let current = Float32Array.from(source)
  const next = new Float32Array(current.length)
  for (let pass = 0; pass < passes; pass += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0
        let count = 0
        for (let offset = -radius; offset <= radius; offset += 1) {
          sum += current[y * size + ((x + offset + size) % size)]
          count += 1
        }
        next[y * size + x] = sum / count
      }
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0
        let count = 0
        for (let offset = -radius; offset <= radius; offset += 1) {
          sum += next[((y + offset + size) % size) * size + x]
          count += 1
        }
        current[y * size + x] = sum / count
      }
    }
  }
  return current
}

function normalFromHeight(height, width, size, strength = 1.2) {
  const normal = new Uint8Array(width * size * 3)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + ((x - 1 + size) % size)]
      const right = height[y * size + ((x + 1) % size)]
      const up = height[((y - 1 + size) % size) * size + x]
      const down = height[((y + 1) % size) * size + x]
      const dx = (right - left) * strength
      const dy = (down - up) * strength
      const length = Math.hypot(dx, dy, 1)
      const index = (y * size + x) * 3
      normal[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255)
      normal[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255)
      normal[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255)
    }
  }
  return normal
}

async function writeWebp(name, data, width, height, channels) {
  const file = path.join(OUT, name)
  await sharp(Buffer.from(data), { raw: { width, height, channels } })
    .webp({ quality: 82, effort: 5 })
    .toFile(file)
  const { size } = await fs.stat(file)
  return { file: name, bytes: size }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const manifest = { size: SIZE, textures: [] }

  for (const [name, sample] of Object.entries(DEFS)) {
    const albedo = new Uint8Array(SIZE * SIZE * 3)
    const height = new Uint8Array(SIZE * SIZE)
    const roughness = new Uint8Array(SIZE * SIZE * 3)
    const metallic = new Uint8Array(SIZE * SIZE * 3)

    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const u = x / SIZE
        const v = y / SIZE
        const value = sample(u, v)
        const i3 = (y * SIZE + x) * 3
        albedo[i3] = Math.round(clamp01(value.r) * 255)
        albedo[i3 + 1] = Math.round(clamp01(value.g) * 255)
        albedo[i3 + 2] = Math.round(clamp01(value.b) * 255)
        height[y * SIZE + x] = Math.round(clamp01(value.height) * 255)
        const rough = Math.round(clamp01(value.rough) * 255)
        const metal = Math.round(clamp01(value.metal) * 255)
        roughness[i3] = rough
        roughness[i3 + 1] = rough
        roughness[i3 + 2] = rough
        metallic[i3] = metal
        metallic[i3 + 1] = metal
        metallic[i3 + 2] = metal
      }
    }

    const smoothing = {
      oak: [4, 3],
      marble: [3, 2],
      leather: [3, 2],
      brass: [4, 2],
      steel: [4, 2],
      plaster: [8, 3],
      ceramic: [4, 2],
    }[name] ?? [3, 2]
    const smoothedHeight = boxBlur(height, SIZE, smoothing[0], smoothing[1])
    const normal = normalFromHeight(
      smoothedHeight,
      SIZE,
      SIZE,
      name === 'leather' ? 1.6 : 1.1,
    )
    const entries = []
    entries.push(await writeWebp(`${name}_albedo.webp`, albedo, SIZE, SIZE, 3))
    entries.push(await writeWebp(`${name}_normal.webp`, normal, SIZE, SIZE, 3))
    entries.push(await writeWebp(`${name}_roughness.webp`, roughness, SIZE, SIZE, 3))
    entries.push(await writeWebp(`${name}_metallic.webp`, metallic, SIZE, SIZE, 3))
    manifest.textures.push({ name, maps: Object.fromEntries(entries.map((entry, index) => [
      ['albedo', 'normal', 'roughness', 'metallic'][index],
      entry,
    ])) })
    console.log(`texture ${name}: ${entries.map((entry) => `${entry.file} ${(entry.bytes / 1024).toFixed(1)} KB`).join(', ')}`)
  }

  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\nSelesai: ${manifest.textures.length} material, ${manifest.textures.length * 4} file WebP.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
