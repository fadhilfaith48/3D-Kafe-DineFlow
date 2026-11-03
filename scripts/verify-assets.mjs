import fs from 'node:fs/promises'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'

const ROOT = path.resolve('.')
const PUBLIC = path.join(ROOT, 'public')
const MODELS = path.join(PUBLIC, 'models')
const TEXTURES = path.join(PUBLIC, 'textures')
const AUDIO = path.join(PUBLIC, 'audio')

const BUDGET = {
  perModelTriangles: 2000,
  totalModelsBytes: 3 * 1024 * 1024,
  totalTexturesBytes: 4 * 1024 * 1024,
  audioBytes: 1.5 * 1024 * 1024,
}

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  return condition
}

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

async function verifyGlb(file) {
  const bytes = await fs.readFile(file)
  const magic = bytes.readUInt32LE(0)
  const version = bytes.readUInt32LE(4)
  const length = bytes.readUInt32LE(8)
  check(magic === 0x46546c67, `${path.basename(file)} bukan GLB valid`)
  check(version === 2, `${path.basename(file)} bukan glTF 2.0`)
  check(length === bytes.length, `${path.basename(file)} panjang header tidak cocok`)
  const jsonLength = bytes.readUInt32LE(12)
  const jsonType = bytes.readUInt32LE(16)
  check(jsonType === 0x4e4f534a, `${path.basename(file)} chunk JSON tidak valid`)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
  const used = json.extensionsUsed ?? []
  const required = json.extensionsRequired ?? []
  check(
    used.includes('KHR_draco_mesh_compression') && required.includes('KHR_draco_mesh_compression'),
    `${path.basename(file)} tidak memakai Draco wajib`,
  )
  check((json.meshes ?? []).length > 0, `${path.basename(file)} tidak punya mesh`)
  return { bytes: bytes.length, json }
}

async function verifyModels() {
  const manifest = await readJson(path.join(MODELS, 'manifest.json'))
  const dec = await draco3d.createDecoderModule()
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({ 'draco3d.decoder': dec })

  let bytes = 0
  let triangles = 0
  for (const item of manifest.models) {
    const file = path.join(MODELS, item.file)
    if (!(await exists(file))) {
      failures.push(`Model hilang: ${item.file}`)
      continue
    }
    const glb = await verifyGlb(file)
    bytes += glb.bytes
    triangles += item.triangles
    check(
      item.triangles > 0 && item.triangles <= BUDGET.perModelTriangles,
      `${item.name}: ${item.triangles} tri (batas ${BUDGET.perModelTriangles})`,
    )
    const doc = await io.read(file)
    const primitives = doc
      .getRoot()
      .listMeshes()
      .reduce((sum, mesh) => sum + mesh.listPrimitives().length, 0)
    check(primitives > 0, `${item.name}: tidak ada primitive`)
    if (item.name === 'barista') {
      check(
        doc.getRoot().listAnimations().some((animation) => animation.getName() === 'Idle'),
        'barista: klip animasi Idle tidak ditemukan',
      )
    }
  }
  check(bytes <= BUDGET.totalModelsBytes, `Total GLB ${bytes} B melebihi budget`)
  return { ...manifest.totals, verifiedBytes: bytes, verifiedTriangles: triangles }
}

async function verifyTextures() {
  const manifest = await readJson(path.join(TEXTURES, 'manifest.json'))
  let bytes = 0
  let count = 0
  for (const texture of manifest.textures) {
    for (const [map, entry] of Object.entries(texture.maps)) {
      const file = path.join(TEXTURES, entry.file)
      if (!(await exists(file))) {
        failures.push(`Tekstur hilang: ${entry.file}`)
        continue
      }
      const stat = await fs.stat(file)
      bytes += stat.size
      count += 1
      check(stat.size > 64, `${entry.file} terlalu kecil`)
      check(entry.file.endsWith('.webp'), `${entry.file} bukan WebP`)
      check(['albedo', 'normal', 'roughness', 'metallic'].includes(map), `${entry.file} map tidak dikenal`)
    }
  }
  check(bytes <= BUDGET.totalTexturesBytes, `Total tekstur ${bytes} B melebihi budget`)
  return { materials: manifest.textures.length, files: count, bytes }
}

async function verifyAudio() {
  const manifest = await readJson(path.join(AUDIO, 'manifest.json'))
  const file = path.join(AUDIO, manifest.track)
  if (!(await exists(file))) {
    failures.push(`Audio hilang: ${manifest.track}`)
    return manifest
  }
  const bytes = (await fs.stat(file)).size
  const head = await fs.readFile(file)
  check(head[0] === 0xff && (head[1] & 0xe0) === 0xe0, 'MP3 tidak diawali frame sync')
  check(bytes <= BUDGET.audioBytes, `Audio ${bytes} B melebihi budget`)
  return { ...manifest, verifiedBytes: bytes }
}

async function main() {
  const models = await verifyModels()
  const textures = await verifyTextures()
  const audio = await verifyAudio()
  const draco = await exists(path.join(PUBLIC, 'draco', 'draco_decoder.wasm'))

  check(draco, 'Decoder Draco lokal tidak ada di public/draco')

  const report = {
    schema: 'kopi-senja/asset-report@1',
    ok: failures.length === 0,
    budgets: BUDGET,
    models,
    textures,
    audio,
    dracoDecoder: draco,
    failures,
  }
  await fs.writeFile(path.join(PUBLIC, 'asset-report.json'), JSON.stringify(report, null, 2))

  console.log(`Model   : ${models.files} file, ${models.verifiedTriangles} tri, ${(models.verifiedBytes / 1024).toFixed(1)} KB`)
  console.log(`Tekstur : ${textures.files} file WebP, ${(textures.bytes / 1024).toFixed(1)} KB`)
  console.log(`Audio   : ${(audio.verifiedBytes / 1024).toFixed(1)} KB`)
  console.log(`Draco   : ${draco ? 'decoder lokal tersedia' : 'TIDAK ADA'}`)

  if (failures.length > 0) {
    console.error('\nVerifikasi GAGAL:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }
  console.log('\nVerifikasi aset OK.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
