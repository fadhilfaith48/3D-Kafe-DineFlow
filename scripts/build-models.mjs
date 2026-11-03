import fs from 'node:fs/promises'
import path from 'node:path'
import * as THREE from 'three'
import { Document } from '@gltf-transform/core'
import {
  ModelBuilder,
  addPrimitive,
  cleanGeometry,
  geo,
  makeMaterial,
  mat,
  registry,
  writeAnimatedModel,
  writeModel,
} from './lib/model.mjs'

const OUT = path.resolve('public/models')

const trim = (value) => Number(value.toFixed(3))

function buildTable() {
  const b = new ModelBuilder('table')
  // Top oak 1,2 × 0,8 m, tebal 4 cm visual (spesifikasi pelat 4 mm + substruktur).
  b.add(geo.box(1.2, 0.04, 0.8), 'oak', mat(0, 0.73, 0))
  b.add(geo.box(1.04, 0.09, 0.64), 'oak_dark', mat(0, 0.665, 0))
  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.31, 0.31]) {
      b.add(geo.box(0.06, 0.71, 0.06), 'metal', mat(x, 0.355, z))
    }
  }
  b.add(geo.box(1.0, 0.035, 0.035), 'metal', mat(0, 0.12, -0.31))
  b.add(geo.box(1.0, 0.035, 0.035), 'metal', mat(0, 0.12, 0.31))
  b.add(geo.box(0.035, 0.035, 0.62), 'metal', mat(-0.5, 0.12, 0))
  b.add(geo.box(0.035, 0.035, 0.62), 'metal', mat(0.5, 0.12, 0))
  return b
}

function buildChair() {
  const b = new ModelBuilder('chair')
  // Dudukan empuk leather; tinggi permukaan duduk 0,45 m.
  b.add(geo.box(0.46, 0.09, 0.46), 'leather', mat(0, 0.425, 0))
  b.add(geo.box(0.44, 0.04, 0.44), 'metal', mat(0, 0.372, 0))
  // Sandaran tinggi (high-back) dengan sedikit recline.
  b.add(geo.box(0.44, 0.6, 0.08), 'leather', mat(0, 0.87, -0.2, -0.08, 0, 0))
  b.add(geo.box(0.045, 0.13, 0.045), 'leather_light', mat(-0.17, 1.03, -0.205, -0.08, 0, 0))
  b.add(geo.box(0.045, 0.13, 0.045), 'leather_light', mat(0.17, 1.03, -0.205, -0.08, 0, 0))
  // Rangka sandaran metal.
  for (const x of [-0.215, 0.215]) {
    b.add(geo.box(0.03, 0.74, 0.035), 'metal', mat(x, 0.78, -0.205, -0.08, 0, 0))
  }
  b.add(geo.box(0.46, 0.035, 0.04), 'metal', mat(0, 1.15, -0.232))
  // Kaki metal dengan sedikit splay.
  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.17, 0.17]) {
      b.add(geo.box(0.04, 0.37, 0.04), 'metal', mat(x, 0.185, z, 0, 0, x > 0 ? -0.05 : 0.05))
    }
  }
  b.add(geo.box(0.38, 0.03, 0.03), 'metal', mat(0, 0.17, -0.17))
  b.add(geo.box(0.38, 0.03, 0.03), 'metal', mat(0, 0.17, 0.17))
  // Armrest tipis.
  for (const x of [-0.235, 0.235]) {
    b.add(geo.box(0.028, 0.028, 0.36), 'metal', mat(x, 0.655, -0.02))
    b.add(geo.box(0.028, 0.18, 0.028), 'metal', mat(x, 0.56, 0.14))
  }
  return b
}

function buildPendantLamp() {
  const b = new ModelBuilder('pendant_lamp')
  b.add(geo.cyl(0.055, 0.075, 0.04, 12), 'brass', mat(0, -0.02, 0))
  b.add(geo.cyl(0.012, 0.012, 0.62, 6), 'metal', mat(0, -0.33, 0))
  // Kap lampu kerucut terbuka.
  b.add(geo.cyl(0.09, 0.34, 0.3, 18, true), 'brass', mat(0, -0.76, 0))
  b.add(geo.torus(0.34, 0.012, 6, 24), 'brass', mat(0, -0.91, 0, Math.PI / 2, 0, 0))
  // Cakram pemancar cahaya amber di dalam kap.
  b.add(geo.cyl(0.28, 0.28, 0.012, 20), 'amber_glow', mat(0, -0.9, 0))
  b.add(geo.sphere(0.075, 10, 8), 'amber_glow', mat(0, -0.82, 0))
  return b
}

function buildBarCounter() {
  const b = new ModelBuilder('bar_counter')
  // Badan bar 3 m; top marmer 3,1 m.
  b.add(geo.box(3.0, 0.92, 0.78), 'wood', mat(0, 0.46, 0))
  for (const x of [-1.1, -0.37, 0.37, 1.1]) {
    b.add(geo.box(0.62, 0.7, 0.035), 'wood_dark', mat(x, 0.48, 0.405))
  }
  b.add(geo.box(3.12, 0.075, 0.9), 'marble', mat(0, 1.0, 0))
  b.add(geo.box(3.18, 0.035, 0.95), 'marble', mat(0, 1.045, 0))
  b.add(geo.box(2.9, 0.07, 0.12), 'wood_dark', mat(0, 0.08, 0.42))
  b.add(geo.cyl(0.02, 0.02, 2.7, 8), 'brass', mat(0, 0.18, 0.5, 0, 0, Math.PI / 2))
  for (const x of [-1.3, 1.3]) {
    b.add(geo.cyl(0.025, 0.025, 0.35, 8), 'brass', mat(x, 0.33, 0.5))
  }
  return b
}

function buildSink() {
  const b = new ModelBuilder('sink')
  // Wastafel brass; origin di permukaan counter.
  b.add(geo.cyl(0.23, 0.19, 0.2, 18, true), 'brass', mat(0, -0.1, 0))
  b.add(geo.cyl(0.21, 0.21, 0.01, 18), 'brass', mat(0, -0.2, 0))
  b.add(geo.torus(0.225, 0.018, 6, 24), 'brass', mat(0, 0, 0, Math.PI / 2, 0, 0))
  // Keran melengkung.
  b.add(geo.cyl(0.025, 0.03, 0.3, 10), 'brass', mat(-0.32, 0.15, -0.12))
  b.add(geo.cyl(0.02, 0.02, 0.26, 8), 'brass', mat(-0.19, 0.3, -0.12, 0, 0, Math.PI / 2))
  b.add(geo.cyl(0.018, 0.018, 0.12, 8), 'brass', mat(-0.06, 0.24, -0.12))
  b.add(geo.sphere(0.035, 8, 6), 'brass', mat(-0.32, 0.02, -0.12))
  b.add(geo.box(0.07, 0.025, 0.07), 'brass', mat(-0.32, 0.31, -0.12))
  return b
}

function buildGlassShelf() {
  const b = new ModelBuilder('glass_shelf')
  // Rak kaca dinding (belakang bar) dengan rangka brass.
  for (const x of [-1.1, 1.1]) {
    b.add(geo.box(0.04, 1.72, 0.04), 'brass', mat(x, 0, 0))
  }
  for (const y of [-0.82, -0.28, 0.28, 0.82]) {
    b.add(geo.box(2.24, 0.022, 0.34), 'glass', mat(0, y, 0))
    b.add(geo.box(2.24, 0.025, 0.025), 'brass', mat(0, y - 0.02, 0.165))
    b.add(geo.box(2.24, 0.025, 0.025), 'brass', mat(0, y - 0.02, -0.165))
  }
  b.add(geo.box(2.24, 0.035, 0.34), 'brass', mat(0, 0.88, 0))
  b.add(geo.box(2.24, 0.03, 0.34), 'wood_dark', mat(0, -0.88, 0))
  return b
}

function buildJar() {
  const b = new ModelBuilder('jar')
  b.add(geo.cyl(0.12, 0.12, 0.32, 14, true), 'glass', mat(0, 0.16, 0))
  b.add(geo.cyl(0.12, 0.12, 0.012, 14), 'glass', mat(0, 0.008, 0))
  b.add(geo.cyl(0.125, 0.125, 0.035, 14), 'brass', mat(0, 0.338, 0))
  b.add(geo.cyl(0.04, 0.04, 0.04, 10), 'brass', mat(0, 0.375, 0))
  // Biji kopi di dalam toples.
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2
    b.add(
      geo.sphere(0.038, 7, 5),
      'coffee',
      mat(Math.cos(angle) * 0.055, 0.05 + (i % 3) * 0.03, Math.sin(angle) * 0.055),
    )
  }
  return b
}

function buildPastry() {
  const b = new ModelBuilder('pastry')
  b.add(geo.cyl(0.2, 0.2, 0.018, 18), 'ceramic', mat(0, 0.009, 0))
  // Croissant dari torus sebagian.
  const croissant = new THREE.TorusGeometry(0.11, 0.045, 6, 12, Math.PI * 1.35)
  b.add(croissant, 'pastry', mat(-0.05, 0.075, 0, -Math.PI / 2, 0, 0.3))
  // Kue kecil di samping.
  b.add(geo.cyl(0.075, 0.085, 0.1, 12), 'art_cream', mat(0.11, 0.06, 0.03))
  b.add(geo.cyl(0.078, 0.078, 0.02, 12), 'pastry', mat(0.11, 0.12, 0.03))
  b.add(geo.sphere(0.022, 8, 6), 'art_terracotta', mat(0.11, 0.145, 0.03))
  return b
}

function buildEspressoMachine() {
  const b = new ModelBuilder('espresso_machine')
  b.add(geo.box(0.95, 0.5, 0.52), 'steel', mat(0, 0.25, 0))
  b.add(geo.box(1.0, 0.06, 0.57), 'steel_dark', mat(0, 0.53, 0))
  b.add(geo.box(0.86, 0.32, 0.035), 'metal', mat(0, 0.26, 0.275))
  b.add(geo.box(0.7, 0.07, 0.03), 'brass', mat(0, 0.46, 0.287))
  for (const x of [-0.2, 0.2]) {
    b.add(geo.cyl(0.065, 0.065, 0.09, 12), 'steel_dark', mat(x, 0.09, 0.3, Math.PI / 2, 0, 0))
    b.add(geo.cyl(0.018, 0.018, 0.24, 8), 'metal', mat(x + 0.12, 0.06, 0.34, 0, 0, Math.PI / 2))
    b.add(geo.box(0.1, 0.04, 0.04), 'metal', mat(x + 0.12, 0.06, 0.34))
    b.add(geo.cyl(0.045, 0.035, 0.075, 12), 'ceramic', mat(x, 0.035, 0.3))
  }
  b.add(geo.box(0.78, 0.035, 0.24), 'steel_dark', mat(0, 0.018, 0.3))
  for (let i = 0; i < 7; i += 1) {
    b.add(geo.box(0.7, 0.012, 0.018), 'metal', mat(0, 0.04, 0.2 + i * 0.032))
  }
  b.add(geo.cyl(0.014, 0.011, 0.33, 8), 'steel', mat(0.47, 0.23, 0.24, 0, 0, -0.2))
  for (const x of [-0.22, 0, 0.22]) {
    b.add(geo.cyl(0.024, 0.024, 0.02, 10), 'amber_glow', mat(x, 0.41, 0.295, Math.PI / 2, 0, 0))
  }
  for (const x of [-0.2, 0.2]) {
    b.add(geo.cyl(0.055, 0.045, 0.075, 12), 'ceramic', mat(x, 0.6, 0.08))
  }
  return b
}

function buildKitchenIsland() {
  const b = new ModelBuilder('kitchen_island')
  b.add(geo.box(2.0, 0.82, 0.92), 'steel', mat(0, 0.41, 0))
  b.add(geo.box(2.08, 0.06, 1.02), 'steel_dark', mat(0, 0.85, 0))
  // Area grill.
  b.add(geo.box(0.9, 0.025, 0.66), 'metal', mat(-0.3, 0.893, 0))
  for (let i = 0; i < 8; i += 1) {
    b.add(geo.box(0.06, 0.02, 0.62), 'steel_dark', mat(-0.65 + i * 0.1, 0.91, 0))
  }
  // Oven + kenop.
  b.add(geo.box(0.78, 0.44, 0.03), 'metal', mat(0.45, 0.48, 0.465))
  b.add(geo.box(0.62, 0.3, 0.015), 'steel_dark', mat(0.45, 0.48, 0.485))
  b.add(geo.box(0.5, 0.025, 0.03), 'brass', mat(0.45, 0.69, 0.49))
  for (let i = 0; i < 4; i += 1) {
    b.add(geo.cyl(0.028, 0.028, 0.04, 10), 'metal', mat(0.2 + i * 0.17, 0.75, 0.485, Math.PI / 2, 0, 0))
  }
  // Rak bawah + kaki.
  b.add(geo.box(1.8, 0.03, 0.8), 'steel_dark', mat(0, 0.18, 0))
  for (const x of [-0.88, 0.88]) {
    for (const z of [-0.38, 0.38]) {
      b.add(geo.cyl(0.035, 0.04, 0.12, 8), 'metal', mat(x, 0.06, z))
    }
  }
  return b
}

function buildRangeHood() {
  const b = new ModelBuilder('range_hood')
  b.add(geo.box(0.5, 0.55, 0.42), 'steel', mat(0, -0.28, 0))
  b.add(geo.box(0.72, 0.16, 0.52), 'steel', mat(0, -0.62, 0))
  b.add(geo.box(0.98, 0.16, 0.64), 'steel', mat(0, -0.78, 0))
  b.add(geo.box(1.02, 0.04, 0.68), 'steel_dark', mat(0, -0.87, 0))
  b.add(geo.box(0.62, 0.03, 0.56), 'metal', mat(0, -0.63, 0))
  return b
}

function buildFridge() {
  const b = new ModelBuilder('fridge')
  b.add(geo.box(1.2, 2.1, 0.76), 'steel', mat(0, 1.05, 0))
  b.add(geo.box(0.58, 2.02, 0.03), 'steel_dark', mat(-0.3, 1.05, 0.39))
  b.add(geo.box(0.58, 2.02, 0.03), 'steel_dark', mat(0.3, 1.05, 0.39))
  for (const x of [-0.53, 0.53]) {
    b.add(geo.cyl(0.018, 0.018, 1.2, 8), 'metal', mat(x, 1.25, 0.43))
    b.add(geo.cyl(0.025, 0.025, 0.08, 8), 'metal', mat(x, 1.25, 0.42, Math.PI / 2, 0, 0))
  }
  b.add(geo.box(0.9, 0.06, 0.035), 'steel_dark', mat(0, 0.06, 0.39))
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.28, 0.28]) {
      b.add(geo.cyl(0.04, 0.05, 0.1, 8), 'metal', mat(x, 0.05, z))
    }
  }
  return b
}

function buildPotRack() {
  const b = new ModelBuilder('pot_rack')
  b.add(geo.box(1.8, 0.06, 0.06), 'metal', mat(0, 0, 0))
  b.add(geo.box(1.8, 0.04, 0.04), 'metal', mat(0, 0, 0.42))
  b.add(geo.box(1.8, 0.04, 0.04), 'metal', mat(0, 0, -0.42))
  for (const x of [-0.85, 0.85]) {
    b.add(geo.box(0.04, 0.04, 0.84), 'metal', mat(x, 0, 0))
  }
  for (let i = 0; i < 7; i += 1) {
    const x = -0.72 + i * 0.24
    b.add(geo.cyl(0.012, 0.012, 0.22, 6), 'metal', mat(x, -0.11, 0))
    b.add(geo.torus(0.025, 0.008, 5, 10), 'metal', mat(x, -0.22, 0, Math.PI / 2, 0, 0))
  }
  return b
}

function buildCopperPot() {
  const b = new ModelBuilder('copper_pot')
  b.add(geo.cyl(0.18, 0.16, 0.24, 14, true), 'copper', mat(0, -0.12, 0))
  b.add(geo.cyl(0.16, 0.16, 0.012, 14), 'copper', mat(0, -0.24, 0))
  b.add(geo.torus(0.18, 0.015, 6, 18), 'copper', mat(0, 0, 0, Math.PI / 2, 0, 0))
  b.add(geo.cyl(0.018, 0.018, 0.42, 8), 'metal', mat(0.02, 0.2, 0))
  b.add(geo.box(0.04, 0.04, 0.16), 'metal', mat(0.02, 0.4, 0))
  b.add(geo.torus(0.045, 0.012, 5, 12), 'metal', mat(0.02, 0.43, 0, Math.PI / 2, 0, 0))
  return b
}

function buildPlant() {
  const b = new ModelBuilder('plant')
  b.add(geo.cyl(0.3, 0.24, 0.46, 16), 'art_terracotta', mat(0, 0.23, 0))
  b.add(geo.cyl(0.31, 0.31, 0.05, 16), 'art_terracotta', mat(0, 0.47, 0))
  b.add(geo.cyl(0.27, 0.27, 0.02, 16), 'coffee', mat(0, 0.47, 0))
  const stems = [
    [0, 0.72, 0, 0.02, 0.5],
    [-0.12, 0.78, 0.06, 0.022, 0.42],
    [0.14, 0.75, -0.04, 0.018, 0.45],
  ]
  for (const [x, y, z, r, h] of stems) {
    b.add(geo.cyl(r, r, h, 6), 'leaf_dark', mat(x, y, z))
  }
  const leaves = [
    [0, 1.02, 0, 0.28, 10, 7],
    [-0.24, 0.94, 0.08, 0.22, 9, 6],
    [0.25, 0.97, -0.06, 0.24, 9, 6],
    [-0.05, 1.18, 0.02, 0.2, 9, 6],
    [0.12, 1.1, 0.15, 0.18, 8, 6],
    [-0.16, 1.08, -0.14, 0.17, 8, 6],
  ]
  for (const [x, y, z, r, w, h] of leaves) {
    b.add(geo.sphere(r, w, h), 'leaf', mat(x, y, z))
  }
  return b
}

function buildArtFrame() {
  const b = new ModelBuilder('art_frame')
  // Bingkai kayu dengan kanvas abstrak bergaya vintage.
  b.add(geo.box(0.92, 1.18, 0.045), 'wood_dark', mat(0, 0, 0))
  b.add(geo.box(0.82, 1.08, 0.012), 'art_cream', mat(0, 0, 0.028))
  b.add(geo.box(0.56, 0.42, 0.006), 'art_terracotta', mat(-0.06, 0.14, 0.036))
  b.add(geo.box(0.34, 0.52, 0.006), 'art_teal', mat(0.16, -0.16, 0.036))
  b.add(geo.box(0.22, 0.22, 0.006), 'art_cream', mat(-0.18, -0.26, 0.043))
  b.add(geo.cyl(0.18, 0.18, 0.008, 16), 'wood', mat(0.1, 0.26, 0.04))
  return b
}

function buildBookshelf() {
  const b = new ModelBuilder('bookshelf')
  b.add(geo.box(0.05, 2.0, 0.34), 'wood', mat(-0.79, 1.0, 0))
  b.add(geo.box(0.05, 2.0, 0.34), 'wood', mat(0.79, 1.0, 0))
  b.add(geo.box(1.62, 0.05, 0.36), 'wood', mat(0, 2.0, 0))
  b.add(geo.box(1.62, 0.06, 0.36), 'wood', mat(0, 0.06, 0))
  b.add(geo.box(1.58, 1.9, 0.02), 'wood_dark', mat(0, 1.0, -0.16))
  for (const y of [0.52, 1.0, 1.48, 1.94]) {
    b.add(geo.box(1.58, 0.035, 0.33), 'wood', mat(0, y, 0))
  }
  const bookColors = ['fabric', 'art_teal', 'art_terracotta', 'fabric_cream', 'leather', 'art_cream']
  for (let shelf = 0; shelf < 3; shelf += 1) {
    const y = 0.55 + shelf * 0.48
    for (let i = 0; i < 7; i += 1) {
      const height = 0.24 + ((i * 7 + shelf) % 3) * 0.035
      b.add(
        geo.box(0.06 + (i % 2) * 0.015, height, 0.22),
        bookColors[(i + shelf) % bookColors.length],
        mat(-0.6 + i * 0.13, y + height / 2, 0.02, 0, 0, i === 5 ? -0.08 : 0),
      )
    }
  }
  // Beberapa buku ditumpuk mendatar.
  for (let i = 0; i < 3; i += 1) {
    b.add(geo.box(0.34, 0.05, 0.24), bookColors[i], mat(0.35, 1.06 + i * 0.055, 0.02, 0, 0.1, 0))
  }
  return b
}

function buildMenuBoard() {
  const b = new ModelBuilder('menu_board')
  b.add(geo.box(2.2, 1.2, 0.07), 'wood_dark', mat(0, 0, 0))
  b.add(geo.box(2.06, 1.06, 0.015), 'chalk', mat(0, 0, 0.043))
  for (let i = 0; i < 5; i += 1) {
    b.add(geo.box(1.35 - (i % 3) * 0.18, 0.02, 0.005), 'fabric_cream', mat(-0.2, 0.32 - i * 0.14, 0.052))
    b.add(geo.box(0.26, 0.02, 0.005), 'amber_glow', mat(0.78, 0.32 - i * 0.14, 0.052))
  }
  b.add(geo.box(0.55, 0.035, 0.005), 'amber_glow', mat(0, 0.45, 0.052))
  return b
}

function buildWindow() {
  const b = new ModelBuilder('window')
  // Jendela besar 3,2 × 2,4 m; origin di tengah kusen.
  for (const x of [-1.6, 1.6]) {
    b.add(geo.box(0.1, 2.5, 0.14), 'wood_dark', mat(x, 0, 0))
  }
  for (const y of [-1.2, 1.2]) {
    b.add(geo.box(3.3, 0.1, 0.14), 'wood_dark', mat(0, y, 0))
  }
  for (const x of [-0.55, 0, 0.55]) {
    b.add(geo.box(0.05, 2.3, 0.1), 'wood', mat(x, 0, 0.02))
  }
  b.add(geo.box(3.15, 0.05, 0.1), 'wood', mat(0, 0, 0.02))
  b.add(geo.box(3.15, 2.3, 0.012), 'glass', mat(0, 0, 0.015))
  b.add(geo.box(3.5, 0.1, 0.45), 'wood_dark', mat(0, -1.29, 0.12))
  return b
}

function buildDoor() {
  const b = new ModelBuilder('door')
  for (const x of [-0.85, 0.85]) {
    b.add(geo.box(0.12, 2.7, 0.18), 'wood_dark', mat(x, 1.35, 0))
  }
  b.add(geo.box(1.82, 0.12, 0.2), 'wood_dark', mat(0, 2.7, 0))
  b.add(geo.box(1.5, 2.45, 0.045), 'glass', mat(0, 1.32, 0))
  b.add(geo.cyl(0.025, 0.025, 0.48, 8), 'brass', mat(0.56, 1.18, 0.09))
  b.add(geo.box(1.9, 0.05, 0.7), 'wood', mat(0, 0.025, 0.1))
  return b
}

function buildCup() {
  const b = new ModelBuilder('cup')
  b.add(geo.cyl(0.2, 0.2, 0.018, 18), 'ceramic', mat(0, 0.009, 0))
  b.add(geo.cyl(0.085, 0.06, 0.11, 14, true), 'ceramic', mat(0, 0.075, 0))
  b.add(geo.cyl(0.058, 0.058, 0.008, 14), 'ceramic', mat(0, 0.02, 0))
  b.add(geo.torus(0.04, 0.009, 5, 12), 'ceramic', mat(0.095, 0.08, 0, 0, 0, 0))
  b.add(geo.cyl(0.07, 0.07, 0.006, 14), 'coffee', mat(0, 0.128, 0))
  return b
}

function buildStool() {
  const b = new ModelBuilder('bar_stool')
  b.add(geo.cyl(0.19, 0.19, 0.05, 16), 'leather', mat(0, 0.72, 0))
  b.add(geo.cyl(0.18, 0.18, 0.03, 16), 'metal', mat(0, 0.69, 0))
  for (const x of [-0.13, 0.13]) {
    for (const z of [-0.13, 0.13]) {
      b.add(geo.cyl(0.02, 0.025, 0.7, 8), 'metal', mat(x, 0.35, z, z * 0.3, 0, x * -0.3))
    }
  }
  b.add(geo.torus(0.19, 0.012, 5, 18), 'brass', mat(0, 0.22, 0, Math.PI / 2, 0, 0))
  return b
}

function buildRug() {
  const b = new ModelBuilder('rug')
  b.add(geo.box(4.6, 0.014, 3.2), 'fabric', mat(0, 0.007, 0))
  b.add(geo.box(4.3, 0.006, 2.9), 'fabric_cream', mat(0, 0.017, 0))
  b.add(geo.box(4.1, 0.004, 2.7), 'fabric', mat(0, 0.021, 0))
  for (let i = 0; i < 4; i += 1) {
    b.add(geo.box(3.6, 0.003, 0.035), 'fabric_cream', mat(0, 0.024, -0.9 + i * 0.6))
  }
  return b
}

function partFor(node, geometry, material, matrix) {
  return { node, geometry: cleanGeometry(geometry, matrix), material }
}

function buildBarista() {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const parts = []
  const nodes = new Map()

  const node = (name, parent = null, position = [0, 0, 0]) => {
    const n = doc.createNode(name)
    n.setTranslation(position)
    if (parent) parent.addChild(n)
    nodes.set(name, n)
    return n
  }

  const root = node('Barista')
  const hips = node('Hips', root, [0, 0.92, 0])
  const torso = node('Torso', hips, [0, 0.12, 0])
  const head = node('Head', torso, [0, 0.42, 0])
  const shoulderL = node('ShoulderL', torso, [-0.235, 0.33, 0])
  const shoulderR = node('ShoulderR', torso, [0.235, 0.33, 0])
  const elbowL = node('ElbowL', shoulderL, [0, -0.3, 0])
  const elbowR = node('ElbowR', shoulderR, [0, -0.3, 0])
  const hipL = node('HipL', hips, [-0.11, 0, 0])
  const hipR = node('HipR', hips, [0.11, 0, 0])
  const kneeL = node('KneeL', hipL, [0, -0.4, 0])
  const kneeR = node('KneeR', hipR, [0, -0.4, 0])

  // Panggul & kaki.
  parts.push(partFor(hips, geo.box(0.3, 0.16, 0.22), 'pants', mat(0, 0, 0)))
  for (const [hip, knee, side] of [
    [hipL, kneeL, -1],
    [hipR, kneeR, 1],
  ]) {
    parts.push(partFor(hip, geo.cyl(0.075, 0.065, 0.4, 10), 'pants', mat(0, -0.2, 0)))
    parts.push(partFor(knee, geo.cyl(0.062, 0.05, 0.4, 10), 'pants', mat(0, -0.2, 0)))
    parts.push(partFor(knee, geo.box(0.11, 0.09, 0.25), 'shoe', mat(0, -0.41, 0.05 + side * 0.005)))
  }

  // Torso + celemek.
  parts.push(partFor(torso, geo.box(0.36, 0.5, 0.22), 'shirt', mat(0, 0.25, 0)))
  parts.push(partFor(torso, geo.box(0.3, 0.4, 0.025), 'apron', mat(0, 0.22, 0.12)))
  parts.push(partFor(torso, geo.box(0.06, 0.24, 0.02), 'apron', mat(-0.09, 0.48, 0.1)))
  parts.push(partFor(torso, geo.box(0.06, 0.24, 0.02), 'apron', mat(0.09, 0.48, 0.1)))
  parts.push(partFor(torso, geo.box(0.32, 0.045, 0.035), 'apron', mat(0, 0.02, 0.125)))
  parts.push(partFor(torso, geo.cyl(0.055, 0.06, 0.1, 8), 'skin', mat(0, 0.53, 0)))

  // Kepala, rambut, wajah.
  parts.push(partFor(head, geo.sphere(0.115, 12, 9), 'skin', mat(0, 0.1, 0)))
  parts.push(partFor(head, geo.sphere(0.122, 12, 8), 'hair', mat(0, 0.145, -0.015, 0, 0, 0, 1, 0.72, 1)))
  parts.push(partFor(head, geo.sphere(0.06, 9, 7), 'hair', mat(0, 0.13, -0.115)))
  parts.push(partFor(head, geo.box(0.035, 0.025, 0.012), 'hair', mat(-0.042, 0.105, 0.108)))
  parts.push(partFor(head, geo.box(0.035, 0.025, 0.012), 'hair', mat(0.042, 0.105, 0.108)))
  parts.push(partFor(head, geo.box(0.05, 0.012, 0.012), 'art_terracotta', mat(0, 0.045, 0.11)))
  parts.push(partFor(head, geo.sphere(0.02, 6, 5), 'skin', mat(0, 0.075, 0.115)))
  // Topi barista tipis.
  parts.push(partFor(head, geo.cyl(0.1, 0.112, 0.06, 12), 'apron', mat(0, 0.205, -0.01)))
  parts.push(partFor(head, geo.cyl(0.115, 0.115, 0.012, 12), 'apron', mat(0, 0.238, -0.01)))

  // Lengan dan tangan.
  for (const [shoulder, elbow, side] of [
    [shoulderL, elbowL, -1],
    [shoulderR, elbowR, 1],
  ]) {
    parts.push(partFor(shoulder, geo.cyl(0.062, 0.052, 0.3, 10), 'shirt', mat(0, -0.15, 0)))
    parts.push(partFor(elbow, geo.cyl(0.05, 0.042, 0.27, 10), 'skin', mat(0, -0.135, 0)))
    parts.push(partFor(elbow, geo.sphere(0.052, 8, 6), 'skin', mat(0, -0.29, 0)))
    // Saku celemek kecil di sisi.
    parts.push(partFor(shoulder, geo.box(0.02, 0.07, 0.07), 'apron', mat(side * 0.055, -0.1, 0.02)))
  }

  const times = [0, 1.5, 3, 4.5, 6]
  const wave = (time, phase = 0) => Math.sin((time / 6) * Math.PI * 2 + phase)
  const motion = {
    Hips: (t) => [0, 0, wave(t) * 0.012],
    Torso: (t) => [wave(t, 0.4) * 0.012, 0, wave(t) * 0.018],
    Head: (t) => [wave(t, 0.8) * 0.018, wave(t, 1.1) * 0.07, wave(t, 0.3) * 0.02],
    ShoulderL: (t) => [wave(t, 0.2) * 0.035, 0, -0.03 + wave(t, 0.6) * 0.015],
    ShoulderR: (t) => [wave(t, 1.2) * 0.035, 0, 0.03 - wave(t, 0.6) * 0.015],
    ElbowL: (t) => [-0.08 + wave(t, 0.5) * 0.025, 0, 0],
    ElbowR: (t) => [-0.08 + wave(t, 1.5) * 0.025, 0, 0],
  }

  const tracks = []
  for (const [name, sample] of Object.entries(motion)) {
    const animatedNode = nodes.get(name)
    const quaternions = times.map((time) => {
      const [rx, ry, rz] = sample(time)
      return new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(rx, ry, rz))
        .toArray()
    })
    tracks.push({ node: animatedNode, times, quaternions })
  }

  return { doc, buffer, parts, root, animations: [{ name: 'Idle', tracks }] }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  const builders = {
    table: buildTable,
    chair: buildChair,
    pendant_lamp: buildPendantLamp,
    bar_counter: buildBarCounter,
    sink: buildSink,
    glass_shelf: buildGlassShelf,
    jar: buildJar,
    pastry: buildPastry,
    espresso_machine: buildEspressoMachine,
    kitchen_island: buildKitchenIsland,
    range_hood: buildRangeHood,
    fridge: buildFridge,
    pot_rack: buildPotRack,
    copper_pot: buildCopperPot,
    plant: buildPlant,
    art_frame: buildArtFrame,
    bookshelf: buildBookshelf,
    menu_board: buildMenuBoard,
    window: buildWindow,
    door: buildDoor,
    cup: buildCup,
    bar_stool: buildStool,
    rug: buildRug,
  }

  for (const [name, builder] of Object.entries(builders)) {
    const info = await writeModel(builder(), OUT)
    console.log(
      `${name.padEnd(16)} ${String(info.triangles).padStart(5)} tri  ${(info.bytes / 1024).toFixed(1).padStart(7)} KB`,
    )
  }

  const barista = await writeAnimatedModel({ name: 'barista', ...buildBarista() }, OUT)
  console.log(
    `${'barista'.padEnd(16)} ${String(barista.triangles).padStart(5)} tri  ${(barista.bytes / 1024).toFixed(1).padStart(7)} KB  clip: ${barista.animations.join(', ')}`,
  )

  const manifest = {
    schema: 'kopi-senja/assets@1',
    units: 'meters',
    generatedFrom: 'scripts/build-models.mjs',
    models: registry,
    totals: {
      files: registry.length,
      bytes: registry.reduce((sum, item) => sum + item.bytes, 0),
      triangles: registry.reduce((sum, item) => sum + item.triangles, 0),
    },
  }
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // Katalog ringkas untuk validasi layout di sisi aplikasi (tanpa filesystem).
  const catalog = {
    schema: 'kopi-senja/model-catalog@1',
    models: Object.fromEntries(
      registry.map((item) => [
        item.name,
        {
          file: item.file,
          triangles: item.triangles,
          bounds: item.bounds,
        },
      ]),
    ),
    totals: manifest.totals,
  }
  await fs.mkdir(path.resolve('src/data'), { recursive: true })
  await fs.writeFile(
    path.resolve('src/data/modelCatalog.json'),
    JSON.stringify(catalog, null, 2),
  )

  console.log(
    `\nSelesai: ${registry.length} GLB, ${manifest.totals.triangles} tri, ${(manifest.totals.bytes / 1024 / 1024).toFixed(2)} MB.`,
  )

  const tooHeavy = registry.filter((item) => item.triangles > 2000)
  if (tooHeavy.length) {
    console.error('Melebihi 2.000 tri:', tooHeavy.map((item) => `${item.name} (${item.triangles})`).join(', '))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
