/**
 * Semua angka "ajaib" proyek ada di sini agar mudah diubah.
 * 5 kelompok yang paling sering diubah: CAMERA, PALETTE, LIGHTING, INTRO, PERFORMANCE.
 */

/** Ganti ke true setelah file .glb di `MODEL_PATHS` benar-benar tersedia. */
export const USE_GLB_MODEL = false

/** Jalur model glTF per petugas (di dalam /public). */
export const MODEL_PATHS = {
  bima: '/models/chef.glb',
  rani: '/models/barista.glb',
  dina: '/models/cashier.glb',
  andi: '/models/waiter.glb',
} as const

export const PALETTE = {
  wall: '#E6D2B8',
  wood: '#7A4A2B',
  floor: '#8A6244',
  caramel: '#B5652F',
  lamp: '#FFB066',
  daylight: '#A9D6F5',
  leaf: '#3F8A4F',
  chalk: '#23302A',
  ceiling: '#F1E4D2',
  metal: '#3B3B40',
  ceramic: '#F3E9DC',
  coffee: '#3A2116',
} as const

export const LIGHTING = {
  sunIntensity: 3.4,
  sunColor: '#FFE7C4',
  sunPosition: [-10, 11, 8] as [number, number, number],
  ambientIntensity: 0.85,
  ambientColor: '#FFD9B0',
  /** Satu-satunya sumber bayangan. */
  lampIntensity: 22,
  lampDistance: 11,
  exposure: 1.12,
  /** Nilai mode malam (siang memakai nilai utama di atas). */
  night: {
    sunIntensity: 0.22,
    ambientIntensity: 0.24,
    hemisphereIntensity: 0.18,
    surfaceIntensity: 3,
    exposure: 1.2,
  },
  /** Nyala lampu gantung: lebih redup saat siang, penuh saat malam. */
  lampDayIntensity: 5,
  lampNightIntensity: 22,
}

/** Kamera hero (dipakai `cameraPath.ts` & `CameraRig.tsx`). */
export const CAMERA = {
  fov: 35,
  near: 0.1,
  far: 110,
  /** Tampak penuh: seluruh denah cutaway 20 × 12 terlihat. */
  fullPosition: [13.4, 10.2, 15.6] as [number, number, number],
  fullTarget: [0, 1.0, 0] as [number, number, number],
  /** Awal intro: lebih tinggi & jauh, lalu turun ke tampak penuh. */
  introPosition: [21, 18, 24] as [number, number, number],
  introTarget: [0, 1.4, -0.8] as [number, number, number],
  /** Geser komposisi adegan ke kanan di desktop (0 = adegan tepat di tengah). */
  viewShift: 0,
  /** Orbit dibatasi agar kamera tidak masuk lantai / dinding. */
  azimuthLimitDeg: 50,
  minPolar: 0.25,
  maxPolar: 1.42,
  minDistance: 5,
  maxDistance: 42,
  /** Kamera boleh mundur maksimal sekian kali di layar sempit. */
  maxBackOff: 1.7,
}

/** Bayangan: satu directional light, satu peta 2048. */
export const SHADOW = {
  mapSize: 2048,
  bias: -0.0004,
  camera: { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 45 },
}

export const INTRO = {
  /** durasi total intro (detik) */
  duration: 5,
  /** detik ke berapa teks hero mulai muncul */
  overlayAt: 3.4,
  /** detik ke berapa seluruh lampu sudah menyala */
  lampsOnAt: 3.2,
}

export const TOUR = {
  /** Jumlah perhentian tur: 4 zona + kembali ke tampak penuh. */
  stops: 5,
  /** Fraksi awal segmen yang dipakai "hold" (kamera diam dulu sejenak). */
  hold: 0.15,
  /** Progress minimal sebelum tur mulai (di bawah ini masih tampak penuh). */
  startAt: 0.03,
}

export const PARTICLES = {
  steamPerCup: 9,
  dust: 55,
  steamSpeed: 0.32,
}

export const PERFORMANCE = {
  /** FPS di bawah angka ini selama downgradeMs => turun tier */
  downgradeFps: 40,
  downgradeMs: 2000,
  /** FPS di atas angka ini selama upgradeMs => naik tier (hati-hati) */
  upgradeFps: 57,
  upgradeMs: 12000,
  /** jeda minimum setelah perubahan tier */
  cooldownMs: 5000,
  /** interval pembaruan angka FPS di store/debug (ms) */
  sampleMs: 500,
}

export const SCROLL = {
  /** Tinggi hero dalam kelipatan viewport (100svh = satu layar penuh).
   *  480svh memberi ruang untuk tur 4 area + kembali ke tampak penuh. */
  heroHeightVh: 480,
}
