import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/trip-hoi-an-2026/',
  plugins: [react()],
})
