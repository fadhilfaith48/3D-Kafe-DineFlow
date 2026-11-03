# Kopi Senja — 3D Hero Section

Hero section 3D interaktif untuk website kafe, dibangun dengan React 19, React Three Fiber 9, Three.js, Drei, GSAP, Tailwind CSS 4, dan Vite 8. Seluruh aset kafe (24 GLB Draco, 28 tekstur PBR WebP, dan ambience MP3) dibuat **prosedural lewat skrip Node** — tanpa aset eksternal — lalu dirender dari satu file layout JSON 20 × 12 m.

## Prasyarat

- Node.js 20+ (diuji dengan Node 24)
- npm 10+

## Menjalankan

```powershell
cd kafe-3d-hero
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (biasanya http://localhost:5173).

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Type-check + build produksi |
| `npm run preview` | Menjalankan hasil build |
| `npm run typecheck` | Cek TypeScript saja |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | E2E test (Playwright, perlu `npx playwright install chromium`) |
| `npm run lint` | oxlint |
| `npm run assets` | Build ulang tekstur, GLB, audio, lalu verifikasi |
| `npm run assets:verify` | Verifikasi aset tanpa rebuild |
| `npm run layout:sync` | Tulis ulang `cafe_hero.json` dari generator layout |
| `npm run layout:preview` | Sinkronkan layout + render denah ke `shots/` |

## Layout kafe (20 × 12 m)

Layout adalah data, bukan kode scene. Sumber kebenarannya ada di
`scripts/generate-layout.mjs`, yang menulis dua file identik:

- `src/data/cafe_hero.json` — dipakai aplikasi dan unit test
- `public/scene/cafe_hero.json` — untuk diunduh/diimpor tool lain

Jangan mengedit JSON langsung; ubah generator lalu jalankan `npm run layout:sync`.
`npm run layout:preview` juga menghasilkan `shots/cafe-layout.svg` dan
`shots/cafe-layout.png` (denah tampak atas).

### Denah

- Ruang **20 × 12 m**, tinggi 4,2 m; x −10…+10, z −6…+6.
- **Lorong utama 2 m** di z −1…+1, bebas furniture dari pintu timur ke bar.
- **9 meja** 1,2 × 0,8 m: 5 di baris selatan (z = 2,75) dan 4 di baris utara (z = −2,55).
- **38 kursi** high-back: 4 kursi untuk 7 meja, 5 kursi untuk `table_01` dan `table_09`.
- **Bar 3 m** di dinding utara, dapur terbuka di barat, 4 jendela di selatan, pintu di timur.
- **5 lampu gantung** dengan intensity 22 (mode malam), plus lightformer `rect` & `circle` yang bisa di-toggle.
- **Siang**: ambient 0.85, cahaya jendela hangat, lampu gantung redup (intensitas 5).
- **Malam**: lampu gantung penuh (22), ambient 0.24, exposure 1.2; lightformer
  malam memakai bentuk lingkaran lampu + bidang biru redup.

### Objek & ID

Setiap objek punya `id`, `type`, `model`, `position`, `rotation`, lalu atribut
opsional `zone`, `tableId`, `seat`, `animation`, `lightformer`, dan `intensity`.

```json
{
  "id": "chair_01a",
  "type": "chair",
  "model": "chair.glb",
  "position": [-7.91, 0, 1.89],
  "rotation": [0, 0, 0],
  "tableId": "table_01",
  "seat": "a"
}
```

- Meja: `table_01` … `table_09`.
- Kursi: `chair_<nomor meja><huruf>` mis. `chair_01a`.
- Lampu: `lamp_01` … `lamp_05`.
- Karakter: `barista` dengan klip `idle`.

### Menambah / memindah meja

1. Ubah array `TABLES` di `scripts/generate-layout.mjs` (tambah entri dengan `chairs: 4` atau `5`).
2. Jalankan `npm run layout:sync` lalu `npm test`.
3. Validator akan menolak layout jika ada meja yang menghalangi lorong, kursi
   terlalu jauh dari mejanya, ID duplikat, atau model tidak ada di katalog.

### Validator & QR meja

`src/data/sceneLayout.ts` mengekspor `CAFE_LAYOUT`, `validateLayout()`,
`assertLayout()`, `objectsInAisle()`, `getTableChairs()`, `getTableById()`, dan
`tableFromQuery()`. Validator mengecek ukuran ruangan, jumlah meja/kursi/lampu,
lorong, batas ruangan, rotasi, katalog model, pencahayaan, dan audio.

QR di meja memakai `?table=03` (juga menerima `3`, `table_3`, `table_03`).
`tableFromQuery('03')` mengembalikan `table_03`, atau `null` untuk meja yang
tidak ada. Saat parameter itu ada, scene menampilkan cincin cahaya berdenyut,
point light, dan label **“Meja 03 · QR aktif”** di atas meja tersebut.

### Render scene dari layout

`src/three/scene/Cafe.tsx` membangun shell ruangan 20 × 12 m (dinding utara &
barat penuh, dinding selatan & timur dipotong rendah agar interior terlihat),
lalu merender seluruh objek layout. `LayoutModel.tsx` memuat setiap GLB sekali
dan menggabungkan objek dengan model sama menjadi satu `InstancedMesh` per
primitive — 38 kursi tetap murah. Material GLB diberi nama (`oak`, `leather`,
`marble`, `brass`, `steel`, `plaster`, `ceramic`) lalu ditimpa tekstur WebP
bersama di `cafeMaterials.ts`. Barista adalah satu-satunya model beranimasi
(`Idle`).

## 5 parameter yang paling mudah diubah

Semua ada di `src/config/scene.ts`:

1. **Warna** — `PALETTE` (dinding, kayu, lantai, lampu, karamel).
2. **Intensitas cahaya** — `LIGHTING` (`sunIntensity`, `ambientIntensity`, `lampIntensity`, `exposure`).
3. **Durasi intro** — `INTRO.duration` (detik), plus `overlayAt` & `lampsOnAt`.
4. **Jumlah partikel** — `PARTICLES.steamPerCup`, `PARTICLES.dust`, `PARTICLES.steamSpeed`.
5. **Batas FPS adaptif** — `PERFORMANCE.downgradeFps`, `downgradeMs`, `cooldownMs`.

Tinggi area scroll hero diatur oleh `SCROLL.heroHeightVh` (480 = sekitar lima layar; makin besar, makin panjang perjalanan tur).

## Aset 3D, tekstur, dan audio

Semua aset di `public/` dihasilkan oleh skrip, bukan file eksternal:

```powershell
npm run assets          # tekstur + GLB + audio + verifikasi
npm run assets:models   # 24 GLB Draco (maks. 2.000 tri per model)
npm run assets:textures # 28 WebP PBR 512×512 (albedo/normal/roughness/metallic)
npm run assets:audio    # cafe_ambience.mp3 orisinal
npm run assets:verify   # cek Draco, animasi Idle, jumlah file, dan budget ukuran
```

- Model dibangun di `scripts/build-models.mjs` dengan `@gltf-transform` dan
  dikompresi Draco. Decoder lokal ada di `public/draco/`.
- Tekstur dibuat di `scripts/build-textures.mjs`; normal map dihaluskan agar
  dinding tidak terlihat seperti noise.
- Audio ambience disintesis di `scripts/build-audio.mjs` dari noise + nada
  lembut kafe, lalu di-encode MP3 memakai `@breezystack/lamejs`.
- Budget verifikasi: 2.000 tri/model, total GLB 3 MB, tekstur 4 MB, audio 1,5 MB.

Jika menambah/mengubah model, tambahkan entri di `src/data/modelCatalog.json`
(melalui generator model) agar validator layout mengenali `model` baru.

## Fallback gambar

`src/components/Fallback.tsx` punya konstanta:

```ts
const FALLBACK_IMAGE: string | null = null
```

- `null` → poster CSS gradient krem → cokelat dengan judul & CTA yang sama.
- Isi dengan `'/fallback-hero.webp'` → memakai gambar tersebut (otomatis kembali ke poster CSS bila gambar gagal dimuat).

Fallback tampil jika WebGL tidak tersedia, tombol **Matikan 3D** ditekan, atau renderer gagal (Error Boundary).

## Kontrol & aksesibilitas

| Aksi | Cara |
| --- | --- |
| Putar / zoom tampak penuh | Seret & scroll pada adegan (orbit) |
| Tur 4 area | Gulir halaman, tombol **Tur 4 area**, atau `1`–`4` |
| Kembali ke tampak penuh | Tombol **Kembali ke tampak penuh** atau `0` |
| Mode jalan kaki (first person) | Tombol **🚶 Jelajahi Kafe** / **Jelajah kaki**, atau `F` |
| Gerak saat walk | `WASD` / panah; `Shift` untuk lari |
| Lihat sekitar saat walk | Klik adegan untuk mengunci pointer, gerakkan mouse |
| Keluar walk | `Esc` atau tombol **Keluar** |
| Siang / malam | Tombol ☀️/🌙 atau `N` |
| Musik ambience on/off | Tombol 🔊, atau `M` |
| Jeda / lanjut animasi | Tombol atau `P` |
| Matikan / nyalakan 3D | Tombol atau `3` (diingat di localStorage) |
| Gyroscope | Tombol (hanya perangkat sentuh) atau `G` |
| Buka QR meja | `?table=03` pada URL |

- Teks hero adalah HTML asli (bukan di dalam canvas), dengan scrim gradient untuk kontras.
- Tur scroll memakai hero setinggi **480svh** dengan panggung `sticky`; kamera
  berpindah antarzona, lalu kembali ke tampak penuh di akhir.
- Walk mode memakai `PointerLockControls` + collision AABB murni
  (`src/three/walk/collision.ts`): pemain tidak bisa menembus meja, kursi, bar,
  atau dapur, dan dibatasi di dalam ruangan.
- `prefers-reduced-motion`: intro dilewati, transisi kamera dipercepat,
  parallax & partikel dikurangi, kualitas diturunkan.
- Canvas punya `role="img"` + `aria-label`; kontrol punya `aria-pressed` dan `aria-keyshortcuts`.
- Render berhenti saat hero keluar viewport (`IntersectionObserver` + `frameloop='never'`).

## Performa

- `three` dimuat lewat `React.lazy`, jadi tidak masuk bundle awal.
- Objek layout yang berulang dirender sebagai `InstancedMesh` per primitive;
  barista saja yang memakai skinned mesh beranimasi.
- Semua GLB memakai Draco dan tanpa tekstur tertanam; 28 tekstur WebP dipakai
  bersama oleh seluruh objek.
- Device pixel ratio maksimal 2 (1 di tier low).
- Tiga tier kualitas otomatis: `low` / `medium` / `high` (`src/lib/quality.ts`), turun bila FPS < 40 selama 2 detik, naik bila FPS > 57 selama 12 detik (dengan cooldown 5 detik).
- Tanpa CDN/HDRI eksternal: environment memakai `Lightformer`, font di-self-host via `@fontsource`.
- Target: JS awal < 300 KB gzip; scene 3D dimuat terpisah.
- Panel debug: tambahkan `?debug` pada URL untuk melihat FPS, tier, dan draw call.

## Struktur folder

```
src/
├─ components/     UI DOM (overlay, loader, fallback, kontrol, info, menu, audio, debug)
├─ config/         scene.ts — semua konstanta & teks yang mudah diubah
├─ data/           menu, cafe_hero.json (layout), sceneLayout.ts, katalog model, zona
├─ hooks/          WebGL, reduced-motion, tier, visibility, gyro
├─ lib/            fps, quality, math, scroll state, gsap
├─ store/          Zustand (fase, tier, flag UI, kamera, QR meja)
├─ three/
│  ├─ hero/        HeroScene3D + AdaptiveQuality
│  ├─ camera/      CameraRig + jalur kamera/intro/tur
│  ├─ scene/       Cafe, LayoutModel (instancing), cafeMaterials (PBR)
│  ├─ walk/        WalkControls + collision AABB
│  └─ fx/          Steam, DustLight, LightShafts, Effects
├─ styles/         Tailwind 4 + token desain
├─ types/          tipe bersama
├─ App.tsx
└─ main.tsx
```

Aset hasil generate (jangan diedit manual):

```
public/
├─ models/     24 GLB Draco + manifest.json
├─ textures/   28 WebP PBR + manifest.json
├─ audio/      cafe_ambience.mp3 + manifest.json
├─ draco/      decoder lokal
└─ scene/      cafe_hero.json (salinan layout)
```

## Deploy

Front-end statis: `npm run build` lalu unggah `dist/` ke Vercel, Netlify, atau hosting statis lain. Pastikan header cache panjang untuk `/assets/*` dan `immutable` untuk file ber-hash.
