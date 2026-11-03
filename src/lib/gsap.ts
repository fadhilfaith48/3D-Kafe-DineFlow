import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Didaftarkan sekali di modul agar semua komponen memakai instance yang sama.
gsap.registerPlugin(ScrollTrigger)

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches


export { gsap, ScrollTrigger }
