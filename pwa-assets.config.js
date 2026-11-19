import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the app icons (PNG sizes, Apple touch icon, maskable icon) from public/icon.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#090b10' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#090b10' } },
  },
  images: ['public/icon.svg'],
})
