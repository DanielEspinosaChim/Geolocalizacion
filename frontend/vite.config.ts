import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Alias de capa — deben coincidir con tsconfig.app.json "paths"
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
    },
  },
  server: {
    // En dev, /api se reenvía al backend FastAPI (mismo origen en prod).
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Separa dependencias pesadas en chunks propios: mejor caché y menor
    // bloqueo del hilo principal (Lighthouse). Cada feature ya va lazy aparte.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-map': ['leaflet', 'react-leaflet', 'leaflet.markercluster'],
          'vendor-query': ['@tanstack/react-query', 'axios', 'zod'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Necesario para el auto-cleanup de @testing-library/react entre tests
    globals: true,
  },
});
