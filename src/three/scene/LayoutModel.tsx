import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneObject } from '../../data/sceneLayout'
import {
  applyCafeMaterial,
  type CafeTextureSets,
} from './cafeMaterials'

// Decoder Draco lokal (disalin dari three ke public/draco oleh build-assets).
useGLTF.setDecoderPath('/draco/')

interface MeshPart {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  matrix: THREE.Matrix4
}

function collectParts(scene: THREE.Object3D, textures: CafeTextureSets): MeshPart[] {
  scene.updateMatrixWorld(true)
  const parts: MeshPart[] = []

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    if (Array.isArray(object.material)) return
    applyCafeMaterial(object.material, textures)
    object.castShadow = true
    object.receiveShadow = true
    parts.push({
      geometry: object.geometry,
      material: object.material,
      matrix: object.matrixWorld.clone(),
    })
  })

  return parts
}

const tmpMatrix = new THREE.Matrix4()
const tmpQuaternion = new THREE.Quaternion()
const tmpPosition = new THREE.Vector3()
const tmpScale = new THREE.Vector3(1, 1, 1)

function InstancedPart({
  geometry,
  material,
  localMatrix,
  objects,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  localMatrix: THREE.Matrix4
  objects: SceneObject[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    objects.forEach((object, index) => {
      tmpPosition.set(...object.position)
      tmpQuaternion.setFromEuler(
        new THREE.Euler(object.rotation[0], object.rotation[1], object.rotation[2]),
      )
      tmpMatrix.compose(tmpPosition, tmpQuaternion, tmpScale)
      tmpMatrix.multiply(localMatrix)
      mesh.setMatrixAt(index, tmpMatrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [objects, localMatrix])

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, objects.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  )
}

/** Satu file GLB, dirender sebagai instanced mesh untuk semua kemunculannya. */
function InstancedModel({
  file,
  objects,
  textures,
}: {
  file: string
  objects: SceneObject[]
  textures: CafeTextureSets
}) {
  const { scene } = useGLTF(`/models/${file}`)
  const parts = useMemo(() => collectParts(scene, textures), [scene, textures])

  return (
    <group>
      {parts.map((part, index) => (
        <InstancedPart
          key={index}
          geometry={part.geometry}
          material={part.material}
          localMatrix={part.matrix}
          objects={objects}
        />
      ))}
    </group>
  )
}

/** Barista beranimasi Idle (satu-satunya model ber-skeleton/animasi). */
export function BaristaModel({
  object,
  textures,
}: {
  object: SceneObject
  textures: CafeTextureSets
}) {
  const { scene, animations } = useGLTF('/models/barista.glb')
  const root = useRef<THREE.Group>(null)
  const prepared = useMemo(() => {
    collectParts(scene, textures)
    return scene
  }, [scene, textures])
  const { actions } = useAnimations(animations, root)

  useEffect(() => {
    const action = actions.Idle ?? actions.idle
    if (!action) return
    action.reset().fadeIn(0.4).play()
    return () => {
      action.fadeOut(0.3)
    }
  }, [actions])

  return (
    <group ref={root} position={object.position} rotation={object.rotation}>
      <primitive object={prepared} />
    </group>
  )
}

interface LayoutModelsProps {
  objects: SceneObject[]
  textures: CafeTextureSets
}

/**
 * Render seluruh objek layout. Objek dengan model sama digabung menjadi
 * satu InstancedMesh per primitive, sehingga 38 kursi tetap ±3 draw call.
 */
export function LayoutModels({ objects, textures }: LayoutModelsProps) {
  const { groups, characters } = useMemo(() => {
    const groups = new Map<string, SceneObject[]>()
    const characters: SceneObject[] = []
    for (const object of objects) {
      if (object.type === 'character') {
        characters.push(object)
        continue
      }
      const list = groups.get(object.model) ?? []
      list.push(object)
      groups.set(object.model, list)
    }
    return { groups, characters }
  }, [objects])

  return (
    <>
      {[...groups.entries()].map(([file, list]) => (
        <InstancedModel key={file} file={file} objects={list} textures={textures} />
      ))}
      {characters.map((object) => (
        <BaristaModel key={object.id} object={object} textures={textures} />
      ))}
    </>
  )
}
