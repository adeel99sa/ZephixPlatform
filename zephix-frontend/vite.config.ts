import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'zephix-frontend-production.up.railway.app',
      'getzephix.com',
      'www.getzephix.com'
    ]
  }
})