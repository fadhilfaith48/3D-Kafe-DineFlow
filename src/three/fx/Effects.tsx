import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing'

interface EffectsProps {
  bloom: boolean
  depthOfField: boolean
}

/**
 * Post-processing ringan. Tone mapping TIDAK dipasang di sini
 * (sudah diatur ACES Filmic pada renderer) agar tidak dobel.
 */
export function Effects({ bloom, depthOfField }: EffectsProps) {
  if (!bloom && !depthOfField) return null

  return (
    <EffectComposer multisampling={0}>
      {bloom ? (
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.25}
          mipmapBlur
        />
      ) : null}
      {depthOfField ? (
        <DepthOfField focusDistance={0.015} focalLength={0.045} bokehScale={2.6} />
      ) : null}
      <Vignette offset={0.32} darkness={0.55} eskil={false} />
    </EffectComposer>
  )
}
