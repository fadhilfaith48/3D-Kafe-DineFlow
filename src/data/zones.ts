import type { Zone, ZoneId } from '../types/scene'

/**
 * SATU SUMBER KEBENARAN untuk seluruh informasi area kafe.
 *
 * Menambah area/petugas baru = tambahkan satu objek ke array `ZONES`
 * lalu (opsional) daftarkan di `TOUR_ORDER`. Pin, kartu info, tombol
 * "Jelajahi area", dan tur scroll akan mengikutinya otomatis.
 *
 * Denah ruang: lantai 20 × 12 satuan, pusat di (0,0),
 * dinding belakang z = -6, dinding kiri x = -10,
 * dinding depan & kanan dibuang setinggi plinth (cutaway).
 */
export const ZONES: Zone[] = [
  {
    id: 'kasir',
    nama: 'Pintu & Menu',
    ikon: '🧾',
    warna: '#C2603A',
    petugas: 'Dina',
    peran: 'Host & penerima pesanan',
    deskripsi:
      'Dina menyambut tamu di pintu timur, mencatat pesanan, lalu mengarahkan ke meja lewat lorong tengah yang lega.',
    jamKerja: '08.00 – 22.00',
    spesialisasi: 'Reservasi meja, pembayaran QRIS/kartu, dan pemesanan lewat QR di meja.',
    label: [8.8, 3.2, 0.6],
    focus: { position: [4.2, 4.4, 3.8], target: [9.2, 1.5, 0.4] },
    tour: 1,
  },
  {
    id: 'dapur',
    nama: 'Dapur Terbuka',
    ikon: '🍳',
    warna: '#B5652F',
    petugas: 'Chef Bima',
    peran: 'Kepala koki',
    deskripsi:
      'Chef Bima bekerja di dapur terbuka di sudut barat: grill, exhaust hood, dan rak panci tembaga terlihat langsung dari area makan.',
    jamKerja: '07.00 – 21.00',
    spesialisasi: 'Nasi goreng kampung, pasta, dan hidangan sarapan; pesanan berat ditutup 21.00.',
    label: [-8, 3.4, -4.2],
    focus: { position: [-1.8, 5.8, 2.6], target: [-8, 1.1, -4.3] },
    tour: 2,
  },
  {
    id: 'bar',
    nama: 'Bar Kopi',
    ikon: '☕',
    warna: '#8A5A3B',
    petugas: 'Rani',
    peran: 'Barista',
    deskripsi:
      'Rani berdiri di balik bar marmer 3 meter, bergantian mengisi portafilter dan menuang kopi sambil rak kaca di belakangnya tertata rapi.',
    jamKerja: '08.00 – 22.00',
    spesialisasi: 'Espresso, manual brew, dan Kopi Susu Senja (menu andalan).',
    label: [-1.5, 3.4, -4.4],
    focus: { position: [5.4, 5.2, 2.8], target: [-1.5, 1.3, -4.4] },
    tour: 3,
  },
  {
    id: 'makan',
    nama: 'Area Makan',
    ikon: '🍽️',
    warna: '#4E8D5B',
    petugas: 'Andi',
    peran: 'Pelayan',
    deskripsi:
      'Sembilan meja kayu tersusun di dua baris, masing-masing dengan kursi high-back. Lorong tengah 2 meter memudahkan pelayan mengantar pesanan.',
    jamKerja: '08.00 – 22.00',
    spesialisasi: 'Mengantar pesanan rata-rata 10 menit; mengosongkan meja & menukar taplak.',
    label: [0, 3.8, 2.75],
    focus: { position: [9.2, 7.6, 10.4], target: [0, 0.9, 2.75] },
    tour: 4,
  },
]

/** Urutan perhentian tur scroll (berdasarkan `Zone.tour`). */
export const TOUR_ORDER: ZoneId[] = ZONES.filter((zone) => zone.tour > 0)
  .sort((a, b) => a.tour - b.tour)
  .map((zone) => zone.id)

/** Semua id, urut tampil: dapur → bar → kasir → makan (utara ke selatan). */
export const ZONE_IDS: ZoneId[] = ['dapur', 'bar', 'kasir', 'makan']

export function getZone(id: ZoneId): Zone {
  const zone = ZONES.find((item) => item.id === id)
  if (!zone) throw new Error(`Zone tidak ditemukan: ${id}`)
  return zone
}

/** Cari zona dari urutan tur (0 = tidak sedang di zona mana pun). */
export function zoneByTourIndex(index: number): Zone | null {
  const id = TOUR_ORDER[index - 1]
  return id ? getZone(id) : null
}
