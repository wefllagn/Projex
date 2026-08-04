import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      'tests/integration/**',
      'tests/java/**',
      'tests/git/**',
      'node_modules/**',
      'dist/**',
    ],
  },
})
