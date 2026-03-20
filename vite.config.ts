import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ipad-grid-tracing/', // リポジトリ名と一致
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
