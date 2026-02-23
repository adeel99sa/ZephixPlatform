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
// ═══════════════════════════════════════════════════════════════════════════
const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const BLOCKED_PRODUCTION_DOMAINS = [
  'getzephix.com',
  'zephix-backend-production.up.railway.app',
];
const isProductionBuild =
  import.meta.env.MODE === 'production' &&
  VITE_API_URL.includes('getzephix.com');

if (!isProductionBuild && VITE_API_URL) {
  for (const domain of BLOCKED_PRODUCTION_DOMAINS) {
    if (VITE_API_URL.includes(domain)) {
      const msg = `[ENVIRONMENT GUARD] VITE_API_URL contains production domain "${domain}" but this is NOT a production build (MODE=${import.meta.env.MODE}). This would leak test/staging traffic to production. Fix VITE_API_URL in Railway env vars.`;
      console.error(msg);
      // In development, warn loudly. In CI/test builds, hard-throw.
      if (import.meta.env.MODE !== 'development') {
        throw new Error(msg);
      }
    }
  }
}

// Cleanup legacy auth tokens on app startup
cleanupLegacyAuthStorage();

const isStagingHost =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('staging.up.railway.app');
if (import.meta.env.MODE === 'production' && isStagingHost) {
  console.info('[ZEPHIX STAGING BUILD]', {
    gitSha:
      import.meta.env.VITE_GIT_SHA ||
      import.meta.env.VITE_GIT_HASH ||
      'unknown',
    buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
  });
}

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
