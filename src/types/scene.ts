/** Tingkat kualitas grafis yang dipilih otomatis. */
export type QualityTier = 'low' | 'medium' | 'high'

/** Fase hidup hero: dari memuat aset sampai siap dijelajahi. */
export type HeroPhase = 'loading' | 'intro' | 'idle'

/** Vektor 3 komponen (koordinat dunia Three.js). */
export type Vec3 = [number, number, number]

/** Zona kafe yang punya petugas, label, dan kamera fokus sendiri. */
export type ZoneId = 'dapur' | 'bar' | 'kasir' | 'makan'

/** Petugas tetap yang muncul di kartu info. */
export type StaffId = 'bima' | 'rani' | 'dina' | 'andi'

/**
 * Satu dari empat keadaan kamera. Semua perpindahan (klik pin, tombol,
 * tur scroll) memakai daftar ini agar tidak ada dua sistem yang
 * berebut kendali atas kamera.
 *
 * - `intro`  : animasi 5 detik pertama, orbit belum aktif
 * - `free`   : pengguna bebas memutar/zoom (default)
 * - `focus`  : sedang mendekati satu zona setelah pin/tombol diklik
 * - `tour`   : kamera dijalankan oleh scroll (ScrollTrigger)
 */
export type CameraMode = 'intro' | 'free' | 'focus' | 'tour' | 'walk'

/** Gerakan tubuh yang dipilih prosedural oleh `Person.tsx`. */
export type PersonAnimation =
  | 'stir'
  | 'brew'
  | 'typing'
  | 'walkCarry'
  | 'sitEat'
  | 'sitPhone'
  | 'idle'

/** Model rambut / kepala. */
export type HairStyle = 'bun' | 'short' | 'long' | 'chefHat'

/** Aksesori wajah atau dada. */
export type Accessory = 'none' | 'mustache' | 'nametag' | 'glasses' | 'tie'

/** Data satu area kafe: dipakai oleh pin, kartu info, tombol, dan tur. */
export interface Zone {
  id: ZoneId
  /** Nama area, mis. "Bar Kopi" */
  nama: string
  /** Ikon kecil untuk pin & kartu (emoji). */
  ikon: string
  /** Warna aksen zona (pin, kartu, tombol navigasi). */
  warna: string
  /** Nama petugas yang bertugas di zona ini. */
  petugas: string
  peran: string
  deskripsi: string
  /** Mis. "08.00 – 22.00" */
  jamKerja: string
  spesialisasi: string
  /** Titik 3D tempat pin label melayang. */
  label: Vec3
  /** Posisi & titik pandang kamera saat zona ini dipilih. */
  focus: { position: Vec3; target: Vec3 }
  /** Urutan perhentian di tur scroll (1..n); 0 = tidak ikut tur. */
  tour: number
}

/** Pasangan posisi & titik pandang kamera. */
export interface CameraPreset {
  position: Vec3
  target: Vec3
}

export interface TierConfig {
  /** [min, max] device pixel ratio */
  dpr: [number, number]
  shadows: boolean
  depthOfField: boolean
  bloom: boolean
  steamPerCup: number
  dust: number
  lightShafts: boolean
  /** Karakter di luar fokus hanya diperbarui tiap N frame. */
  characterUpdateEvery: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  tag?: string
}

export interface DeviceHints {
  cores: number
  memory: number
  width: number
  touch: boolean
}
