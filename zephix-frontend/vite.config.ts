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
        // Ensure cookies are forwarded correctly
        cookieDomainRewrite: '',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies from browser to backend
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Forward Set-Cookie headers from backend to browser
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              // Ensure cookies work with proxy by removing domain restrictions
              const modifiedCookies = setCookieHeaders.map((cookie: string) => {
                // Remove domain=... if present (cookies should work for current origin)
                return cookie.replace(/;\s*domain=[^;]+/gi, '');
              });
              res.setHeader('Set-Cookie', modifiedCookies);
            }
          });
        },
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
