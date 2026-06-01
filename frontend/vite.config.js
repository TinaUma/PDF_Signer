import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single source of truth for the app version: read it from package.json at build
// time and expose it as a compile-time constant (__APP_VERSION__). The About
// dialog reads it, so the version UI never drifts from the real package version.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  // Dev-only: proxy API calls to the backend so `npm run dev` works standalone
  // (production/Docker serves /api same-origin via nginx).
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
