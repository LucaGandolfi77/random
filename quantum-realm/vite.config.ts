import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'QBIT — Adventures in the Uncertainty',
        short_name: 'QBIT',
        description:
          'A hand-made puzzle-platformer set inside a quantum computer. Ride a wave, tunnel through walls, and learn the strange rules of the subatomic world.',
        theme_color: '#0a0616',
        background_color: '#0a0616',
        display: 'standalone',
        orientation: 'any',
        scope: './',
        start_url: './',
        categories: ['games', 'education', 'puzzle'],
        icons: [
          { src: 'icons/icon-64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
