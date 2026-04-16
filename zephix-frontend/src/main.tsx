import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeAnalytics } from './lib/analytics'
import { QueryProvider } from './lib/providers/QueryProvider'
import { cleanupLegacyAuthStorage } from './auth/cleanupAuthStorage'

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT WIRING SAFETY GUARD
// Prevents test/staging frontends from silently calling production API.
// Vite bakes VITE_* vars at build time, so this check runs once on boot.
//
// IMPORTANT: VITE_API_URL is the *backend* host (e.g. …production.up.railway.app),
// not the marketing site. Do not require "getzephix.com" inside VITE_API_URL —
// that would false-positive and block the real production app on getzephix.com.
// ═══════════════════════════════════════════════════════════════════════════
const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const PRODUCTION_FRONTEND_HOSTS = new Set(['getzephix.com', 'www.getzephix.com']);
const PRODUCTION_API_MARKERS = [
  'zephix-backend-production.up.railway.app',
  'api.getzephix.com',
];

if (typeof window !== 'undefined' && VITE_API_URL && import.meta.env.MODE !== 'development') {
  const host = window.location.hostname;
  const isProductionSite = PRODUCTION_FRONTEND_HOSTS.has(host);
  const apiLooksProduction = PRODUCTION_API_MARKERS.some((m) => VITE_API_URL.includes(m));

  // Block staging/dev/preview hosts from calling production API; allow getzephix.com.
  if (apiLooksProduction && !isProductionSite) {
    const msg =
      `[ENVIRONMENT GUARD] This frontend (${host}) must not use the production API (VITE_API_URL). ` +
      `Fix VITE_API_URL on the staging service, or open the app at https://getzephix.com for production.`;
    console.error(msg);
    throw new Error(msg);
  }
}

// Cleanup legacy auth tokens on app startup
cleanupLegacyAuthStorage();

// Initialize analytics
// initializeAnalytics(); // Temporarily disabled for debugging

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)
// Force redeploy Sun Aug 17 12:17:27 CDT 2025 - reload test
