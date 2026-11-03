import fs from 'node:fs/promises'
import path from 'node:path'
import { Mp3Encoder } from '@breezystack/lamejs'

/**
 * Sintesis ambience kafe orisinal (tanpa sampel pihak ketiga):
 * room tone, murmur percakapan, grinder berkala, clink cangkir,
 * dan gesekan kursi. Output MP3 mono 96 kbps, 45 detik, loop.
 *
 * Semua event deterministik (seed tetap) agar hasil build konsisten.
 */

const SAMPLE_RATE = 44100
const DURATION = 45
const OUT = path.resolve('public/audio')

let seed = 0x9e3779b9
function random() {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return (seed >>> 0) / 4294967296
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Biquad RBJ direct form 1. */
function biquad(type, frequency, q = 0.707) {
  const w0 = (2 * Math.PI * frequency) / SAMPLE_RATE
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * q)
  let b0
  let b1
  let b2
  if (type === 'lowpass') {
    b0 = (1 - cos) / 2
    b1 = 1 - cos
    b2 = (1 - cos) / 2
  } else if (type === 'highpass') {
    b0 = (1 + cos) / 2
    b1 = -(1 + cos)
    b2 = (1 + cos) / 2
  } else {
    b0 = alpha
    b1 = 0
    b2 = -alpha
  }
  const a0 = 1 + alpha
  const a1 = -2 * cos
  const a2 = 1 - alpha
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  return (input) => {
    const output =
      (b0 / a0) * input +
      (b1 / a0) * x1 +
      (b2 / a0) * x2 -
      (a1 / a0) * y1 -
      (a2 / a0) * y2
    x2 = x1
    x1 = input
    y2 = y1
    y1 = output
    return output
  }
}

function smoothEnvelope(time, duration, attack = 0.25, release = 0.35) {
  if (time < 0 || time > duration) return 0
  const inGain = Math.min(1, time / attack)
  const outGain = Math.min(1, (duration - time) / release)
  return inGain * outGain
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const length = SAMPLE_RATE * DURATION
  const samples = new Float32Array(length)

  // 1. Room tone: brown noise sangat lembut.
  const roomLow = biquad('lowpass', 280, 0.6)
  let brown = 0
  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1
    brown = (brown + white * 0.015) / 1.015
    samples[i] += roomLow(brown) * 1.6
  }

  // 2. Murmur percakapan: beberapa pita frekuensi dengan envelope lambat.
  for (let voice = 0; voice < 9; voice += 1) {
    const center = 240 + random() * 900
    const band = biquad('bandpass', center, 2.2 + random() * 2.5)
    const band2 = biquad('bandpass', center * 1.8, 3)
    const rate = 0.11 + random() * 0.24
    const rate2 = 0.07 + random() * 0.19
    const phase = random() * Math.PI * 2
    const phase2 = random() * Math.PI * 2
    const gain = 0.03 + random() * 0.04
    for (let i = 0; i < length; i += 1) {
      const t = i / SAMPLE_RATE
      const envelope =
        0.25 +
        0.75 *
          Math.abs(
            Math.sin(t * Math.PI * 2 * rate + phase) *
              Math.sin(t * Math.PI * 2 * rate2 + phase2),
          )
      const noise = random() * 2 - 1
      samples[i] += (band(noise) * 0.7 + band2(noise) * 0.3) * envelope * gain
    }
  }

  // 3. Grinder: tiga kali selama 45 detik.
  const grinders = [
    { start: 8.2, duration: 3.4 },
    { start: 24.5, duration: 2.9 },
    { start: 38.0, duration: 3.1 },
  ]
  const grindBand = biquad('bandpass', 900, 1.1)
  const grindLow = biquad('lowpass', 1800, 0.8)
  for (const grinder of grinders) {
    const start = Math.floor(grinder.start * SAMPLE_RATE)
    const count = Math.floor(grinder.duration * SAMPLE_RATE)
    for (let j = 0; j < count; j += 1) {
      const t = j / SAMPLE_RATE
      const envelope = smoothEnvelope(t, grinder.duration, 0.18, 0.45)
      const motor =
        Math.sin(2 * Math.PI * 94 * t) * 0.45 +
        Math.sin(2 * Math.PI * 188 * t + 0.4) * 0.2 +
        Math.sin(2 * Math.PI * 282 * t) * 0.1
      const noise = grindBand(random() * 2 - 1)
      const value = (motor + noise * 0.55) * envelope * 0.13
      const index = start + j
      if (index < length) samples[index] += grindLow(value)
    }
  }

  // 4. Cangkir / sendok berdenting.
  const clinks = [3.6, 11.4, 15.2, 20.7, 31.8, 36.4, 42.1]
  for (const time of clinks) {
    const start = Math.floor(time * SAMPLE_RATE + random() * 1200)
    const f1 = 1900 + random() * 900
    const f2 = f1 * (1.51 + random() * 0.2)
    for (let j = 0; j < SAMPLE_RATE * 0.28; j += 1) {
      const t = j / SAMPLE_RATE
      const envelope = Math.exp(-t * 22)
      const value =
        (Math.sin(2 * Math.PI * f1 * t) * 0.5 +
          Math.sin(2 * Math.PI * f2 * t) * 0.2 +
          (random() * 2 - 1) * 0.03) *
        envelope *
        0.09
      const index = start + j
      if (index < length) samples[index] += value
    }
  }

  // 5. Kursi bergesek (jarang, pelan).
  const scrapes = [6.1, 17.8, 28.9, 40.2]
  for (const time of scrapes) {
    const start = Math.floor(time * SAMPLE_RATE)
    const scrapeFilter = biquad('bandpass', 1200 + random() * 500, 1.4)
    const duration = 0.5 + random() * 0.35
    for (let j = 0; j < duration * SAMPLE_RATE; j += 1) {
      const t = j / SAMPLE_RATE
      const envelope = smoothEnvelope(t, duration, 0.08, 0.25)
      const value = scrapeFilter(random() * 2 - 1) * envelope * 0.035
      const index = start + j
      if (index < length) samples[index] += value
    }
  }

  // 6. Fade 1 detik di awal/akhir + normalisasi lembut.
  let peak = 0
  for (let i = 0; i < length; i += 1) peak = Math.max(peak, Math.abs(samples[i]))
  const normalize = peak > 0 ? 0.82 / peak : 1
  const fade = SAMPLE_RATE * 1.2
  for (let i = 0; i < length; i += 1) {
    let gain = normalize
    if (i < fade) gain *= i / fade
    if (i > length - fade) gain *= (length - i) / fade
    samples[i] *= gain
  }

  // 7. Encode MP3 mono 96 kbps.
  const pcm = new Int16Array(length)
  for (let i = 0; i < length; i += 1) {
    pcm[i] = Math.round(clamp(samples[i], -1, 1) * 32767)
  }
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, 96)
  const chunks = []
  const blockSize = 1152
  for (let i = 0; i < pcm.length; i += blockSize) {
    const block = pcm.subarray(i, Math.min(i + blockSize, pcm.length))
    const encoded = encoder.encodeBuffer(block)
    if (encoded.length > 0) chunks.push(Buffer.from(encoded))
  }
  const tail = encoder.flush()
  if (tail.length > 0) chunks.push(Buffer.from(tail))
  const audio = Buffer.concat(chunks)
  const file = path.join(OUT, 'cafe_ambience.mp3')
  await fs.writeFile(file, audio)

  await fs.writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(
      {
        track: 'cafe_ambience.mp3',
        durationSeconds: DURATION,
        sampleRate: SAMPLE_RATE,
        channels: 1,
        bitrateKbps: 96,
        bytes: audio.length,
        generatedFrom: 'scripts/build-audio.mjs',
        license: 'original procedural synthesis — no third-party samples',
      },
      null,
      2,
    ),
  )

  console.log(
    `cafe_ambience.mp3  ${DURATION}s  ${(audio.length / 1024).toFixed(1)} KB  (${SAMPLE_RATE} Hz mono 96k)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
