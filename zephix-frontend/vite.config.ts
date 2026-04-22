import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

/**
 * Dev server: explicit host list (DNS rebinding guard). Leading dot = suffix match.
 * Preview (Railway `vite preview`): use `true` so Vite skips host middleware — public Railway URLs vary.
 */
const serverAllowedHosts = [
  "localhost",
  ".localhost",
  "127.0.0.1",
  "zephix-frontend-staging.up.railway.app",
  ".up.railway.app",
  ".railway.app",
];

/** Where Vite forwards `/api` in dev. If you see `ECONNREFUSED` in the Vite terminal, nothing is listening here — start the Nest app (default PORT=3000). Override: `VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:3001`. */
const devApiProxyTarget =
  process.env.VITE_DEV_API_PROXY_TARGET ?? "http://127.0.0.1:3000";

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
    allowedHosts: serverAllowedHosts,
    proxy: {
      "/api": {
        target: devApiProxyTarget,
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
    host: "0.0.0.0",
    // Required for Railway (and any public preview URL): `true` disables host-header validation for preview.
    // See vite `preview()`: host middleware is skipped only when allowedHosts === true.
    allowedHosts: true,
  },
  define: {
    // Inject build-time environment variables
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(process.env.VITE_GIT_HASH || 'unknown'),
    'import.meta.env.VITE_BUILD_TAG': JSON.stringify(process.env.VITE_BUILD_TAG || 'dev'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(process.env.VITE_BUILD_TIME || new Date().toISOString()),
  },
})
