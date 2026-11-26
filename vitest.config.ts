import { defineConfig } from 'vitest/config';

// Kept apart from vite.config.ts so tests do not load the dev-server plugin.
export default defineConfig({
  test: {
    include: ['engine/tests/**/*.test.ts'],
  },
});
