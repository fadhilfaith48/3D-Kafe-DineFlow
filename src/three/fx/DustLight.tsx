import { Sparkles } from '@react-three/drei'
import { PALETTE } from '../../config/scene'
import { useSceneStore } from '../../store/useSceneStore'

/**
 * Debu cahaya yang melayang di berkas sinar jendela selatan.
 * Memakai drei Sparkles (instanced points, murah di GPU).
 */
export function DustLight({ count }: { count: number }) {
  const day = useSceneStore((state) => state.dayMode === 'day')

  return (
    <Sparkles
      count={count}
      scale={[13, 3.4, 4.2]}
      position={[0, 2.7, 4.0]}
      size={2.6}
      speed={0.22}
      opacity={day ? 0.45 : 0.12}
      color={PALETTE.lamp}
      noise={0.35}
    />
  )
}
