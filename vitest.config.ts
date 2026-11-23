import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{mjs,js,ts,tsx}'],
    environment: 'node',
  },
});
