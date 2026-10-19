import { defineConfig } from 'vitest/config'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'

// Canonicalize the existing temporary root only for unit-test worker processes.
// macOS /var and /tmp aliases must not weaken application symlink protections.
const canonicalTestTemp = realpathSync(tmpdir())

export default defineConfig({
  test: {
    env: {
      TMPDIR: canonicalTestTemp,
      TMP: canonicalTestTemp,
      TEMP: canonicalTestTemp,
    },
    exclude: [
      'tests/integration/**',
      'tests/java/**',
      'tests/git/**',
      'node_modules/**',
      'dist/**',
    ],
  },
})
