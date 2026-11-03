import fs from 'node:fs/promises'
import path from 'node:path'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Document, NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { MATERIALS, linearColor, linearRgb } from './materials.mjs'

const encoderModule = await draco3d.createEncoderModule()
const decoderModule = await draco3d.createDecoderModule()

export const dracoIO = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.encoder': encoderModule,
    'draco3d.decoder': decoderModule,
  })

export const registry = []

/** Matriks compose cepat: posisi, rotasi Euler, skala. */
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const matrix = new THREE.Matrix4()
  matrix.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  )
  return matrix
}

export const geo = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, seg = 12, open = false) =>
    new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sphere: (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h),
  torus: (r, tube, radial = 6, tubular = 18) =>
    new THREE.TorusGeometry(r, tube, radial, tubular),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
}

export function cleanGeometry(source, matrix) {
  const geometry = source.clone()
  if (matrix) geometry.applyMatrix4(matrix)
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  // Hanya atribut yang dibutuhkan runtime; hindari atribut eksotis dari geometri three.
  for (const name of Object.keys(nonIndexed.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) nonIndexed.deleteAttribute(name)
  }
  if (!nonIndexed.getAttribute('normal')) nonIndexed.computeVertexNormals()
  if (!nonIndexed.getAttribute('uv')) {
    const count = nonIndexed.getAttribute('position').count
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
  }
  nonIndexed.clearGroups()
  return nonIndexed
}

/**
 * Kumpulan bagian (geometri + material) yang digabung per material
 * supaya satu GLB hanya memakai sedikit primitive/draw call.
 */
export class ModelBuilder {
  constructor(name) {
    this.name = name
    this.parts = []
  }

  add(geometry, material, matrix) {
    if (!MATERIALS[material]) throw new Error(`Material tidak dikenal: ${material}`)
    this.parts.push({ geometry: cleanGeometry(geometry, matrix), material })
    return this
  }

  /** Segitiga = vertex/3 karena seluruh geometri sudah non-indexed. */
  triangleCount() {
    return this.parts.reduce(
      (sum, part) => sum + part.geometry.getAttribute('position').count / 3,
      0,
    )
  }

  close() {
    if (this.parts.length === 0) throw new Error(`${this.name}: tidak ada geometri`)
    return this
  }
}

function writeAccessor(doc, buffer, type, array) {
  return doc.createAccessor(type.toLowerCase(), buffer).setType(type).setArray(array)
}

export function addPrimitive(doc, buffer, mesh, geometry, material) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = geometry.getAttribute('uv')

  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', writeAccessor(doc, buffer, 'VEC3', new Float32Array(position.array)))
    .setAttribute('NORMAL', writeAccessor(doc, buffer, 'VEC3', new Float32Array(normal.array)))
    .setAttribute('TEXCOORD_0', writeAccessor(doc, buffer, 'VEC2', new Float32Array(uv.array)))

  const index = new Uint32Array(position.count)
  for (let i = 0; i < position.count; i += 1) index[i] = i
  primitive.setIndices(writeAccessor(doc, buffer, 'SCALAR', index))
  primitive.setMaterial(material)

  mesh.addPrimitive(primitive)
}

export function makeMaterial(doc, name) {
  const definition = MATERIALS[name]
  const material = doc
    .createMaterial(name)
    .setBaseColorFactor(linearColor(definition.color))
    .setRoughnessFactor(definition.roughness)
    .setMetallicFactor(definition.metallic)

  if (definition.opacity !== undefined && definition.opacity < 1) {
    material
      .setAlphaMode('BLEND')
      .setBaseColorFactor([...linearRgb(definition.color), definition.opacity])
    material.setDoubleSided(true)
  }
  if (definition.doubleSided) material.setDoubleSided(true)
  if (definition.emissive) {
    material.setEmissiveFactor(linearRgb(definition.emissive))
  }
  return material
}

function boundsOf(parts) {
  const box = new THREE.Box3()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    box.union(part.geometry.boundingBox)
  }
  return {
    min: box.min.toArray().map((value) => Number(value.toFixed(3))),
    max: box.max.toArray().map((value) => Number(value.toFixed(3))),
  }
}

/** Tulis satu objek sebagai GLB Draco. */
export async function writeModel(builder, outDir) {
  builder.close()
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene(builder.name)
  const node = doc.createNode(builder.name)
  const mesh = doc.createMesh(builder.name)

  const grouped = new Map()
  for (const part of builder.parts) {
    const list = grouped.get(part.material) ?? []
    list.push(part.geometry)
    grouped.set(part.material, list)
  }

  for (const [materialName, geometries] of grouped) {
    const merged = mergeGeometries(geometries, false)
    if (!merged) throw new Error(`${builder.name}: gagal menggabung material ${materialName}`)
    addPrimitive(doc, buffer, mesh, merged, makeMaterial(doc, materialName))
  }

  node.setMesh(mesh)
  scene.addChild(node)
  doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
    encodeSpeed: 5,
    decodeSpeed: 5,
  })

  const file = path.join(outDir, `${builder.name}.glb`)
  await dracoIO.write(file, doc)
  const bytes = (await fs.stat(file)).size

  const info = {
    name: builder.name,
    file: path.basename(file),
    bytes,
    triangles: Math.round(builder.triangleCount()),
    materials: [...grouped.keys()],
    bounds: boundsOf(builder.parts),
  }
  registry.push(info)
  return info
}

/**
 * Tulis GLB dengan hierarki node + animasi (dipakai barista).
 * `parts` = { node, geometry, material } dan `nodes` = daftar node glTF.
 */
export async function writeAnimatedModel({ name, doc, buffer, parts, root, animations }, outDir) {
  const scene = doc.createScene(name)

  const materialCache = new Map()
  const byNode = new Map()
  for (const part of parts) {
    const list = byNode.get(part.node) ?? []
    list.push(part)
    byNode.set(part.node, list)
  }
  // Satu node bisa berisi beberapa bagian (mis. torso + celemek). Semua
  // bagian digabung menjadi satu mesh dengan beberapa primitive material.
  for (const [node, nodeParts] of byNode) {
    const mesh = doc.createMesh(node.getName())
    for (const part of nodeParts) {
      if (!materialCache.has(part.material)) {
        materialCache.set(part.material, makeMaterial(doc, part.material))
      }
      addPrimitive(doc, buffer, mesh, part.geometry, materialCache.get(part.material))
    }
    node.setMesh(mesh)
  }

  scene.addChild(root)

  for (const clip of animations) {
    const animation = doc.createAnimation(clip.name)
    for (const track of clip.tracks) {
      const input = writeAccessor(doc, buffer, 'SCALAR', new Float32Array(track.times))
      const output = writeAccessor(
        doc,
        buffer,
        'VEC4',
        new Float32Array(track.quaternions.flat()),
      )
      const sampler = doc.createAnimationSampler(track.node.getName())
      sampler.setInput(input).setOutput(output).setInterpolation('LINEAR')
      const channel = doc.createAnimationChannel(`${track.node.getName()}_rotation`)
      channel.setTargetNode(track.node).setTargetPath('rotation').setSampler(sampler)
      animation.addSampler(sampler).addChannel(channel)
    }
  }

  doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
  })

  const file = path.join(outDir, `${name}.glb`)
  await dracoIO.write(file, doc)
  const bytes = (await fs.stat(file)).size
  const triangles = parts.reduce(
    (sum, part) => sum + part.geometry.getAttribute('position').count / 3,
    0,
  )
  const info = {
    name,
    file: path.basename(file),
    bytes,
    triangles: Math.round(triangles),
    materials: [...materialCache.keys()],
    animations: animations.map((clip) => clip.name),
    bounds: boundsOf(parts.map((part) => ({ geometry: part.geometry }))),
  }
  registry.push(info)
  return info
}
