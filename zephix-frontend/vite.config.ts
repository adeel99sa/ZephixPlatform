import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "reports/frontend/bundle-stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const cookie = req.headers.cookie;
            if (cookie) proxyReq.setHeader("cookie", cookie);
          });

          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"];
            if (!setCookie) return;

            const normalized = Array.isArray(setCookie) ? setCookie : [setCookie];
            proxyRes.headers["set-cookie"] = normalized.map((c) => {
              return String(c)
                .replace(/;\s*domain=[^;]+/i, "")
                .replace(/;\s*secure/gi, "")
                .replace(/;\s*samesite=none/gi, "; SameSite=Lax");
            });
          });
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [
      '.up.railway.app',
      'getzephix.com',
      'www.getzephix.com',
    ],
  },
  define: {
    // Inject build-time environment variables
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(process.env.VITE_GIT_HASH || 'unknown'),
    'import.meta.env.VITE_BUILD_TAG': JSON.stringify(process.env.VITE_BUILD_TAG || 'dev'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(process.env.VITE_BUILD_TIME || new Date().toISOString()),
  },
})
