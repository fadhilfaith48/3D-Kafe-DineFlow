import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Konfigurasi Vite: React 19 + Tailwind 4.
// three.js tidak di-bundle di awal karena HeroScene3D dimuat dengan React.lazy().
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Peringatan ukuran chunk dinaikkan sedikit: chunk "three" memang besar
    // tetapi dimuat terpisah (lazy) setelah halaman pertama tampil.
    chunkSizeWarningLimit: 900,
  },
})
