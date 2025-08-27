import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      'zephix-frontend-production.up.railway.app',
      'getzephix.com',
      'www.getzephix.com'
    ]
  }
})
