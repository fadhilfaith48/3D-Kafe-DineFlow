import type { MenuItem } from '../types/scene'

/** Enam menu andalan Kopi Senja. */
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'senja-latte',
    name: 'Senja Latte',
    description: 'Espresso ganda, susu steamed, dan sirup karamel rumahan. Manisnya pas.',
    price: 32000,
    tag: 'Signature',
  },
  {
    id: 'es-kopi-susu',
    name: 'Es Kopi Susu Gula Aren',
    description: 'Kopi robusta-arabika, susu segar, gula aren cair. Pilihan paling laris.',
    price: 26000,
    tag: 'Favorit',
  },
  {
    id: 'manual-brew',
    name: 'Manual Brew V60',
    description: 'Single origin Gayo, diseduh manual di depan Anda. Notes jeruk dan cokelat.',
    price: 38000,
  },
  {
    id: 'matcha-senja',
    name: 'Matcha Senja',
    description: 'Matcha upacara, susu oat, sedikit madu. Untuk yang ingin tanpa kopi.',
    price: 35000,
  },
  {
    id: 'croissant',
    name: 'Croissant Mentega',
    description: 'Dipanggang tiap pagi, berlapis mentega Prancis. Renyah di luar, lembut di dalam.',
    price: 24000,
  },
  {
    id: 'kopi-tubruk',
    name: 'Kopi Tubruk Warisan',
    description: 'Robusta lampung digiling kasar, diseduh tubruk. Pahit jujur, aroma kuat.',
    price: 18000,
  },
]

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
