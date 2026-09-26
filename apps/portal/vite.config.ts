import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:4000', '/health': 'http://127.0.0.1:4000' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@fluentui/react-icons')) return 'icons';
          if (id.includes('node_modules/@fluentui') || id.includes('node_modules/@griffel')) return 'fluent';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler/')) return 'react';
        },
      },
    },
  },
});
