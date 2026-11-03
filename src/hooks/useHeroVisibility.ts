import { useEffect, type RefObject } from 'react'
import { useHeroStore } from '../store/useHeroStore'

/**
 * Memberi tahu store saat hero keluar dari viewport
 * supaya WebGL berhenti render (hemat baterai).
 */
export function useHeroVisibility<T extends HTMLElement>(
  ref: RefObject<T | null>,
): void {
  const setVisible = useHeroStore((state) => state.setVisible)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px 0px', threshold: 0 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, setVisible])
}
