/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/cash-before-you-bid/',
  plugins: [react()],
  build: {
    // scripts/prerender.mjs needs to know which emitted stylesheet belongs to
    // the default skin, so it can put a <link> to it in the served HTML — the
    // skin's chunk is lazy, and without that link the prerendered shell paints
    // unstyled. The manifest is the supported way to ask; the prerender reads
    // it and deletes it, so it is not part of the deploy.
    manifest: true,
  },
  test: {
    environment: 'node',
    // Stubs the browser APIs jsdom omits; a no-op under the node environment.
    setupFiles: ['./src/test-setup.ts'],
  },
})
