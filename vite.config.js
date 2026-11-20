import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://athanmaxxing.github.io/DashMaxx/
export default defineConfig({
  base: '/DashMaxx/',
  plugins: [
    react(),
    // Makes the site installable as a phone/desktop app ("Add to Home Screen").
    VitePWA({
      registerType: 'autoUpdate', // new deploys update the installed app automatically
      includeAssets: ['favicon.ico', 'logo.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DashMaxx',
        short_name: 'DashMaxx',
        description: "The squad's command center: Overwatch & Fortnite stats, ready checks, events and more.",
        theme_color: '#090b10',
        background_color: '#090b10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/DashMaxx/',
        scope: '/DashMaxx/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell so it opens instantly; live data always comes from Supabase.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Push notification handling (public/push-handler.js).
        importScripts: ['push-handler.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
