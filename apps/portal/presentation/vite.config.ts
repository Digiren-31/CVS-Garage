import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { appearanceScript } from '../../../packages/ui/src/presentation/appearance';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'appearance-before-paint',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [{ tag: 'script', children: appearanceScript, injectTo: 'head-prepend' }],
      },
    },
  ],
  resolve: {
    alias: {
      '@cvs-garage/ui/presentation/styles.css': fileURLToPath(new URL('../../../packages/ui/src/presentation/styles.css', import.meta.url)),
      '@cvs-garage/ui/presentation': fileURLToPath(new URL('../../../packages/ui/src/presentation/index.ts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', '@fluentui/react-components'],
  },
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
