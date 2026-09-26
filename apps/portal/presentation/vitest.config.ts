import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@cvs-garage/ui/presentation': fileURLToPath(new URL('../../../packages/ui/src/presentation/index.ts', import.meta.url)) },
    dedupe: ['react', 'react-dom', '@fluentui/react-components'],
  },
  test: { include: ['tests/**/*.test.ts'] },
});
