import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'reports/frontend/bundle-stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'zephix-frontend-production.up.railway.app',
      'getzephix.com',
      'www.getzephix.com'
    ]
  },
  define: {
    // Inject build-time environment variables
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(process.env.VITE_GIT_HASH || 'unknown'),
    'import.meta.env.VITE_BUILD_TAG': JSON.stringify(process.env.VITE_BUILD_TAG || 'dev'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(process.env.VITE_BUILD_TIME || new Date().toISOString()),
  },
})
