import * as THREE from 'three'

/**
 * Palet material bersama untuk seluruh aset GLB.
 * Warna ditulis sRGB lalu dikonversi ke linear saat ditulis ke glTF.
 * Nama material dipakai ulang di runtime untuk menempelkan tekstur WebP.
 */
export const MATERIALS = {
  oak: { color: '#A9713F', roughness: 0.62, metallic: 0 },
  oak_dark: { color: '#6E4326', roughness: 0.72, metallic: 0 },
  wood: { color: '#7A4A2B', roughness: 0.68, metallic: 0 },
  wood_dark: { color: '#4A2C18', roughness: 0.8, metallic: 0 },
  leather: { color: '#3D2419', roughness: 0.56, metallic: 0.02 },
  leather_light: { color: '#5A3524', roughness: 0.58, metallic: 0.02 },
  metal: { color: '#24242A', roughness: 0.42, metallic: 0.75 },
  steel: { color: '#B9BEC4', roughness: 0.33, metallic: 0.88 },
  steel_dark: { color: '#7D858C', roughness: 0.4, metallic: 0.8 },
  brass: { color: '#B08D57', roughness: 0.3, metallic: 0.92 },
  copper: { color: '#B87333', roughness: 0.32, metallic: 0.9 },
  marble: { color: '#EDE7DD', roughness: 0.24, metallic: 0.02 },
  ceramic: { color: '#F3E9DC', roughness: 0.36, metallic: 0 },
  glass: {
    color: '#D7EAF7',
    roughness: 0.1,
    metallic: 0.05,
    opacity: 0.3,
    doubleSided: true,
  },
  plaster: { color: '#E6D2B8', roughness: 0.94, metallic: 0 },
  plaster_light: { color: '#F1E4D2', roughness: 0.94, metallic: 0 },
  chalk: { color: '#23302A', roughness: 0.96, metallic: 0 },
  coffee: { color: '#3A2116', roughness: 0.7, metallic: 0 },
  pastry: { color: '#D79A54', roughness: 0.62, metallic: 0 },
  leaf: { color: '#3F8A4F', roughness: 0.82, metallic: 0 },
  leaf_dark: { color: '#2F6B3C', roughness: 0.84, metallic: 0 },
  fabric: { color: '#7C4326', roughness: 0.95, metallic: 0 },
  fabric_cream: { color: '#D7C3A7', roughness: 0.95, metallic: 0 },
  amber_glow: {
    color: '#FFB066',
    roughness: 0.35,
    metallic: 0,
    emissive: '#FF9A3C',
    emissiveIntensity: 2.2,
  },
  screen: {
    color: '#7FD8B0',
    roughness: 0.4,
    metallic: 0,
    emissive: '#7FD8B0',
    emissiveIntensity: 0.8,
  },
  art_terracotta: { color: '#B5652F', roughness: 0.85, metallic: 0 },
  art_teal: { color: '#3C6E71', roughness: 0.85, metallic: 0 },
  art_cream: { color: '#EAD8B8', roughness: 0.9, metallic: 0 },
  skin: { color: '#D9A47E', roughness: 0.64, metallic: 0 },
  hair: { color: '#2A1A12', roughness: 0.72, metallic: 0 },
  shirt: { color: '#F0E3CE', roughness: 0.85, metallic: 0 },
  apron: { color: '#6B3E26', roughness: 0.78, metallic: 0 },
  pants: { color: '#33302F', roughness: 0.86, metallic: 0 },
  shoe: { color: '#1E1B1A', roughness: 0.6, metallic: 0.05 },
}

export function linearColor(hex) {
  const color = new THREE.Color(hex).convertSRGBToLinear()
  return [color.r, color.g, color.b, 1]
}

export function linearRgb(hex) {
  const color = new THREE.Color(hex).convertSRGBToLinear()
  return [color.r, color.g, color.b]
}
