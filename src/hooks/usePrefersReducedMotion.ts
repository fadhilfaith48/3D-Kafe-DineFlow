import { useEffect, useState } from 'react'
import { useHeroStore } from '../store/useHeroStore'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Menghormati pengaturan "kurangi gerakan" dari sistem operasi. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )
  const setReducedMotion = useHeroStore((state) => state.setReducedMotion)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    setReducedMotion(reduced)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [reduced, setReducedMotion])

  return reduced
}
