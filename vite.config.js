import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://athanmaxxing.github.io/DashMaxx/
export default defineConfig({
  base: '/DashMaxx/',
  plugins: [react()],
})
