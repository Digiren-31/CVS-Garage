import react from '@vitejs/plugin-react';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      '../../services/*/src/**/*.test.{ts,tsx}',
      '../../packages/*/src/**/*.test.{ts,tsx}'
    ]
  },
  server: {
    port: 3000,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173
  }
});
