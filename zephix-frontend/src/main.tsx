import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeAnalytics } from './lib/analytics'
import { QueryProvider } from './lib/providers/QueryProvider'

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
