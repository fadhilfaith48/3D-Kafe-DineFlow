import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { CAMERA, INTRO, LIGHTING, PALETTE, SHADOW } from '../../config/scene'
import { CAFE_LAYOUT } from '../../data/sceneLayout'
import { clamp, smoothstep } from '../../lib/math'
import { TIERS } from '../../lib/quality'
import { heroMotion } from '../../lib/scroll'
import { useHeroStore } from '../../store/useHeroStore'
import { useSceneStore } from '../../store/useSceneStore'
import { CameraRig } from '../camera/CameraRig'
import { ZoneLabels } from '../../components/ZoneLabels'
import { DustLight } from '../fx/DustLight'
import { Effects } from '../fx/Effects'
import { LightShafts } from '../fx/LightShafts'
import { Steam } from '../fx/Steam'
import { Cafe } from '../scene/Cafe'
import { WalkControls } from '../walk/WalkControls'
import { AdaptiveQuality } from './AdaptiveQuality'

/** Uap dari cangkir yang ada di layout. */
const STEAM_POSITIONS = CAFE_LAYOUT.objects
  .filter((object) => object.model === 'cup.glb')
  .map((object) => [
    object.position[0],
    object.position[1] + 0.12,
    object.position[2],
  ] as [number, number, number])

/**
 * Linimasa intro BERBASIS WAKTU NYATA (bukan frame):
 * kamera turun dari ketinggian ke tampak penuh, lampu gantung menyala
 * satu per satu, lalu teks hero muncul.
 */
function IntroDirector() {
  const reducedMotion = useHeroStore((state) => state.reducedMotion)

  useEffect(() => {
    const store = useHeroStore.getState()

    if (reducedMotion) {
      heroMotion.intro = 1
      heroMotion.lampPower = 1
      store.setPhase('idle')
      return
    }

    store.setPhase('intro')
    heroMotion.intro = 0
    heroMotion.lampPower = 0

    const started = performance.now()
    let settled = false

    const timer = window.setInterval(() => {
      const seconds = (performance.now() - started) / 1000
      heroMotion.intro = Math.min(1, seconds / INTRO.duration)
      heroMotion.lampPower = smoothstep(clamp(seconds / INTRO.lampsOnAt, 0, 1))

      if (!settled && seconds >= INTRO.overlayAt) {
        settled = true
        heroMotion.lampPower = 1
        store.setPhase('idle')
      }
    }, 50)

    return () => window.clearInterval(timer)
  }, [reducedMotion])

  return null
}

/** Penyesuaian exposure saat mode siang/malam berganti. */
function Exposure() {
  const day = useSceneStore((state) => state.dayMode === 'day')
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    gl.toneMappingExposure = day ? LIGHTING.exposure : LIGHTING.night.exposure
  }, [day, gl])

  return null
}

function Scene() {
  const tier = useHeroStore((state) => state.tier)
  const day = useSceneStore((state) => state.dayMode === 'day')
  const rectOn = useSceneStore((state) => state.lightformers.rect)
  const circleOn = useSceneStore((state) => state.lightformers.circle)
  const tierConfig = TIERS[tier]
  const night = LIGHTING.night

  const background = day ? '#22160F' : '#0B0704'
  const fogNear = day ? 25 : 18
  const fogFar = day ? 78 : 58

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, fogNear, fogFar]} />

      <ambientLight
        intensity={day ? LIGHTING.ambientIntensity : night.ambientIntensity}
        color={day ? LIGHTING.ambientColor : '#FFC48A'}
      />
      <hemisphereLight
        args={[
          day ? '#FFE2BE' : '#7C8FB0',
          day ? '#2A1A10' : '#05070C',
          day ? 0.7 : night.hemisphereIntensity,
        ]}
      />

      {/* SATU-satunya sumber bayangan: matahari dari jendela selatan. */}
      <directionalLight
        position={LIGHTING.sunPosition}
        intensity={day ? LIGHTING.sunIntensity : night.sunIntensity}
        color={day ? LIGHTING.sunColor : '#8FA6C8'}
        castShadow={tierConfig.shadows}
        shadow-mapSize-width={SHADOW.mapSize}
        shadow-mapSize-height={SHADOW.mapSize}
        shadow-camera-left={SHADOW.camera.left}
        shadow-camera-right={SHADOW.camera.right}
        shadow-camera-top={SHADOW.camera.top}
        shadow-camera-bottom={SHADOW.camera.bottom}
        shadow-camera-near={SHADOW.camera.near}
        shadow-camera-far={SHADOW.camera.far}
        shadow-bias={SHADOW.bias}
      />

      {/* Cahaya pantul jendela & lorong (tanpa bayangan). */}
      {day ? (
        <>
          <pointLight position={[-6.4, 3.2, 2.6]} intensity={38} distance={18} decay={2} color="#BFDFF5" />
          <pointLight position={[4.2, 3.0, 3.2]} intensity={20} distance={16} decay={2} color="#FFC48A" />
        </>
      ) : (
        <pointLight position={[0, 2.2, 0]} intensity={night.surfaceIntensity} distance={16} decay={2} color="#FFC48A" />
      )}

      {/* Environment lokal (Lightformer) — tanpa HDRI eksternal.
          Rect & circle bisa dinyalakan/dimatikan terpisah dari panel Cahaya. */}
      <Environment
        key={`${day ? 'day' : 'night'}-${rectOn ? 'rect' : 'no-rect'}-${circleOn ? 'circle' : 'no-circle'}`}
        resolution={64}
        frames={1}
      >
        {rectOn ? (
          <>
            <Lightformer
              form="rect"
              intensity={day ? 1.6 : 0.35}
              color={day ? '#FFE3C0' : '#7C8FB0'}
              position={day ? [-4, 3.2, 4] : [0, 3.4, 5]}
              scale={day ? [9, 6, 1] : [8, 5, 1]}
            />
            {day ? (
              <Lightformer
                form="rect"
                intensity={0.9}
                color={PALETTE.daylight}
                position={[5, 3, -2]}
                scale={[7, 5, 1]}
              />
            ) : null}
          </>
        ) : null}
        {circleOn ? (
          <Lightformer
            form="circle"
            intensity={day ? 0.9 : 1.1}
            color={day ? PALETTE.daylight : PALETTE.lamp}
            position={[0, 5, 0]}
            scale={[5, 5, 1]}
          />
        ) : null}
      </Environment>

      {/* Seluruh kafe dari layout JSON + barista GLB. */}
      <Suspense fallback={null}>
        <Cafe />
      </Suspense>
      <ZoneLabels />

      <Steam positions={STEAM_POSITIONS} perCup={tierConfig.steamPerCup} />
      <DustLight count={tierConfig.dust} />
      {tierConfig.lightShafts ? <LightShafts /> : null}

      <Effects bloom={tierConfig.bloom} depthOfField={tierConfig.depthOfField} />

      <CameraRig />
      <WalkControls />
      <AdaptiveQuality />
      <Exposure />
      <IntroDirector />
    </>
  )
}

/**
 * Canvas WebGL utama. Dimuat lewat React.lazy dari App,
 * sehingga three.js tidak masuk bundle awal.
 */
export default function HeroScene3D() {
  const tier = useHeroStore((state) => state.tier)
  const paused = useHeroStore((state) => state.paused)
  const visible = useHeroStore((state) => state.visible)
  const config = TIERS[tier]
  const frozen = paused || !visible

  const ariaLabel = useMemo(
    () =>
      'Adegan 3D kafe Kopi Senja seluas 20 kali 12 meter: bar kopi, dapur terbuka, sembilan meja, tiga puluh delapan kursi, dan barista yang beranimasi. Bisa diputar, dijelajahi per area, atau dijelajahi dengan mode jalan.',
    [],
  )

  return (
    <div className="absolute inset-0" role="img" aria-label={ariaLabel}>
      <Canvas
        shadows={config.shadows}
        dpr={config.dpr}
        frameloop={frozen ? 'never' : 'always'}
        camera={{
          position: CAMERA.introPosition,
          fov: CAMERA.fov,
          near: CAMERA.near,
          far: CAMERA.far,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          logarithmicDepthBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = LIGHTING.exposure
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
