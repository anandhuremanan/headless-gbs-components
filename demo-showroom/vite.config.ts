import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
// vitest/config re-exports Vite's defineConfig, with the `test` options typed.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@/components': fileURLToPath(new URL('./component-lib', import.meta.url)),
    },
  },
  test: {
    // Unit tests only. The browser tests in tests/e2e run under Playwright.
    include: ['component-lib/**/__tests__/**/*.test.ts'],
  },
})
