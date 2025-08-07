import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SentryErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { initSentry, setSentryTags, setSentryContext } from './config/sentry';

// Lazy load page components for code splitting
const ZephixLandingPage = lazy(() => import('./pages/ZephixLandingPage').then(module => ({ default: module.default })));
const ProjectsDashboard = lazy(() => import('./pages/projects/ProjectsDashboard').then(module => ({ default: module.ProjectsDashboard })));
const AIDashboard = lazy(() => import('./pages/dashboard/AIDashboard').then(module => ({ default: module.AIDashboard })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));

// Loading component for Suspense fallback
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-400">Loading page...</p>
    </div>
  </div>
);

// Optionally create this for a nicer user experience
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
    <h1 className="text-4xl font-bold mb-4">404</h1>
    <p className="text-lg">Sorry, the page you requested was not found.</p>
    <a href="/" className="mt-6 px-4 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors">Go Home</a>
  </div>
);

export default function App() {
  useEffect(() => {
    // Initialize Sentry
    initSentry();
    
    // Set global tags and context
    setSentryTags({
      app: 'zephix-frontend',
      version: '1.0.0',
    });
    
    setSentryContext('app', {
      environment: import.meta.env.MODE,
      userAgent: navigator.userAgent,
      language: navigator.language,
    });
  }, []);

  return (
    <SentryErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<ZephixLandingPage />} />

            {/* Project management dashboard */}
            <Route path="/projects" element={<ProjectsDashboard />} />

            {/* AI co-pilot dashboard */}
            <Route path="/dashboard" element={<AIDashboard />} />

            {/* Authentication */}
            <Route path="/auth/login" element={<LoginPage />} />

            {/* 404 Not Found fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
}
