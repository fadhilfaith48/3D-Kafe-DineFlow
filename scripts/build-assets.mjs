import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const steps = [
  ['build-textures.mjs', 'Tekstur WebP'],
  ['build-models.mjs', 'Model GLB + Draco'],
  ['build-audio.mjs', 'Audio MP3'],
]

function run(script) {
  const result = spawnSync(process.execPath, [path.join('scripts', script)], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${script} gagal dengan kode ${result.status}`)
  }
}

async function copyDracoDecoder() {
  const source = path.resolve('node_modules/three/examples/jsm/libs/draco')
  const target = path.resolve('public/draco')
  await fs.mkdir(target, { recursive: true })
  const files = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']
  for (const file of files) {
    await fs.copyFile(path.join(source, file), path.join(target, file))
  }
  console.log(`Decoder Draco disalin ke public/draco (${files.length} file).`)
}

async function main() {
  const started = Date.now()
  for (const [script, label] of steps) {
    console.log(`\n=== ${label} ===`)
    run(script)
  }
  console.log('\n=== Decoder Draco ===')
  await copyDracoDecoder()
  console.log('\n=== Verifikasi ===')
  run('verify-assets.mjs')
  console.log(`\nPipeline aset selesai dalam ${((Date.now() - started) / 1000).toFixed(1)} detik.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
