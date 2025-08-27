import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeAnalytics } from './lib/analytics'

// Initialize analytics
initializeAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// Force redeploy Sun Aug 17 12:17:27 CDT 2025
