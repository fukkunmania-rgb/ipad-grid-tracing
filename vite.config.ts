import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access from iPad on same network
    host: true,
    port: 5173,
    // HMR for mobile testing
    hmr: {
      clientPort: 5173,
    },
  },
  build: {
    // Optimize for production
    target: 'esnext',
  },
})
