import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ipad-grid-tracing/',
  server: { host: true, port: 5173 },
  build: {
    target: ['safari16.4', 'chrome111', 'firefox114'],
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
