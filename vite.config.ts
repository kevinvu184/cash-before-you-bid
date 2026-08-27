/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/cash-before-you-bid/',
  plugins: [react()],
  test: {
    environment: 'node',
    // Stubs the browser APIs jsdom omits; a no-op under the node environment.
    setupFiles: ['./src/test-setup.ts'],
  },
})
