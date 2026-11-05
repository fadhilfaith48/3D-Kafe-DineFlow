import { Suspense, lazy, useEffect, useRef } from 'react'
import { AmbienceAudio } from './components/AmbienceAudio'
import { DebugPanel } from './components/DebugPanel'
import { Fallback } from './components/Fallback'
import { HeroControls } from './components/HeroControls'
import { HeroOverlay } from './components/HeroOverlay'
import { InfoCard } from './components/InfoCard'
import { Loader } from './components/Loader'
import { MenuSection } from './components/MenuSection'
import { SceneBoundary } from './components/SceneBoundary'
import { WalkTouchControls } from './components/WalkTouchControls'
import { SCROLL } from './config/scene'
import { tableFromQuery } from './data/sceneLayout'
import { useHeroVisibility } from './hooks/useHeroVisibility'
import { usePerformanceTier } from './hooks/usePerformanceTier'
import { useReducedMotion } from './hooks/usePrefersReducedMotion'
import { useWebGLSupport } from './hooks/useWebGLSupport'
import { useHeroStore } from './store/useHeroStore'
import { useOrderStore } from './store/useOrderStore'

// three.js dimuat secara lazy agar bundle awal tetap ringan.
const HeroScene3D = lazy(() => import('./three/hero/HeroScene3D'))

export default function App() {
  // QR meja: ?table=03 atau ?table=03&token=...
  const setMode = useOrderStore((s) => s.setMode)
  const setTableInfo = useOrderStore((s) => s.setTableInfo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const table = tableFromQuery(params.get('table'))
    const token = params.get('token')
    if (!table) return
    setTableInfo(table, token)
    if (token) setMode('selfOrder')
  }, [setMode, setTableInfo])

  const heroRef = useRef<HTMLElement>(null)
  const webglSupported = useWebGLSupport()
  useReducedMotion()
  usePerformanceTier()
  useHeroVisibility(heroRef)

  const disable3D = useHeroStore((state) => state.disable3D)
  const setPhase = useHeroStore((state) => state.setPhase)
  const show3D = webglSupported && !disable3D

  // Saat 3D dimatikan/tidak didukung, fase langsung idle.
  useEffect(() => {
    if (!show3D) setPhase('idle')
  }, [show3D, setPhase])

  return (
    <main className="relative bg-ink">
      <section
        id="hero"
        ref={heroRef}
        className="relative w-full bg-ink"
        style={{ height: `${SCROLL.heroHeightVh}svh` }}
      >
        {/* Panggung sticky: canvas & UI tetap satu layar saat scroll tur. */}
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-ink">
          {show3D ? (
            <>
              <Suspense fallback={null}>
                <SceneBoundary fallback={<Fallback />}>
                  <HeroScene3D />
                </SceneBoundary>
              </Suspense>
              <Loader />
              <HeroOverlay />
              <HeroControls />
              <WalkTouchControls />
              <InfoCard />
            </>
          ) : (
            <Fallback />
          )}
          <AmbienceAudio />
          <DebugPanel />
        </div>
      </section>
      <MenuSection />
    </main>
  )
}
