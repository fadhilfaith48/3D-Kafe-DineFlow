import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Tekstur PBR bersama untuk seluruh GLB.
 *
 * GLB hasil generate tidak menyimpan tekstur (supaya kecil & bisa
 * dipakai ulang). Saat runtime, material diberi nama yang sama
 * (oak, leather, marble, …) lalu dipetakan ke WebP di sini.
 */

export const TEXTURE_BASES = [
  'oak',
  'marble',
  'leather',
  'brass',
  'steel',
  'plaster',
  'ceramic',
] as const

export type TextureBase = (typeof TEXTURE_BASES)[number]

export const TEXTURE_FILES = TEXTURE_BASES.flatMap((base) => [
  `/textures/${base}_albedo.webp`,
  `/textures/${base}_normal.webp`,
  `/textures/${base}_roughness.webp`,
  `/textures/${base}_metallic.webp`,
])

interface TextureSet {
  albedo: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
  metallic: THREE.Texture
}

export type CafeTextureSets = Record<TextureBase, TextureSet>

const REPEAT: Record<TextureBase, number> = {
  oak: 2.2,
  marble: 1,
  leather: 1.4,
  brass: 1,
  steel: 1,
  plaster: 2.6,
  ceramic: 1,
}

/** Material GLB → tekstur dasar. */
const BASE_BY_MATERIAL: Record<string, TextureBase> = {
  oak: 'oak',
  oak_dark: 'oak',
  wood: 'oak',
  wood_dark: 'oak',
  leather: 'leather',
  leather_light: 'leather',
  metal: 'steel',
  steel: 'steel',
  steel_dark: 'steel',
  brass: 'brass',
  copper: 'brass',
  marble: 'marble',
  ceramic: 'ceramic',
  plaster: 'plaster',
  plaster_light: 'plaster',
}

/**
 * Tint albedo per material. Tekstur albedo memberi pola, warna ini
 * membedakan varian terang/gelap tanpa membuat file tekstur baru.
 */
const TINT_BY_MATERIAL: Record<string, string> = {
  oak_dark: '#8A6A55',
  wood: '#D8B294',
  wood_dark: '#7D5A45',
  leather_light: '#C9A98E',
  metal: '#6E747C',
  steel_dark: '#B4BAC0',
  brass: '#D9B06A',
  copper: '#C98A5A',
  plaster_light: '#FDF3E6',
}

export function useCafeTextures(): CafeTextureSets {
  const loaded = useTexture(TEXTURE_FILES) as THREE.Texture[]

  return useMemo(() => {
    const sets = {} as CafeTextureSets
    TEXTURE_BASES.forEach((base, index) => {
      const offset = index * 4
      const [albedo, normal, roughness, metallic] = loaded.slice(offset, offset + 4)
      const repeat = REPEAT[base]

      const prepare = (texture: THREE.Texture, srgb: boolean) => {
        const clone = texture.clone()
        clone.wrapS = THREE.RepeatWrapping
        clone.wrapT = THREE.RepeatWrapping
        clone.repeat.set(repeat, repeat)
        clone.anisotropy = 4
        clone.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
        clone.needsUpdate = true
        return clone
      }

      sets[base] = {
        albedo: prepare(albedo, true),
        normal: prepare(normal, false),
        roughness: prepare(roughness, false),
        metallic: prepare(metallic, false),
      }
    })
    return sets
  }, [loaded])
}

/** Tempelkan tekstur PBR ke material GLB (idempoten). */
export function applyCafeMaterial(
  material: THREE.Material,
  textures: CafeTextureSets,
): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return
  const base = BASE_BY_MATERIAL[material.name]
  if (!base) return

  const set = textures[base]
  material.map = set.albedo
  material.normalMap = set.normal
  material.roughnessMap = set.roughness
  material.metalnessMap = set.metallic
  material.color.set(TINT_BY_MATERIAL[material.name] ?? '#FFFFFF')
  material.roughness = 1
  material.metalness = 1
  material.normalScale.set(0.35, 0.35)
  material.envMapIntensity = 0.7
  material.needsUpdate = true
}
