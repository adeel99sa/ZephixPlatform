import React, { Suspense, useEffect, lazy } from 'react';
import { motion } from 'framer-motion';
import { trackEvent } from '../lib/analytics';
import { LANDING_CONTENT } from '../lib/constants';

// Lazy load components for better performance
const Hero = lazy(() => import('../components/landing/Hero'));
const ProblemSection = lazy(() => import('../components/landing/ProblemSection'));
const SolutionCards = lazy(() => import('../components/landing/SolutionCards'));
const TechValidation = lazy(() => import('../components/landing/TechValidation'));
const ComparisonTable = lazy(() => import('../components/landing/ComparisonTable'));
const Timeline = lazy(() => import('../components/landing/Timeline'));
const FAQ = lazy(() => import('../components/landing/FAQ'));
const CTASection = lazy(() => import('../components/landing/CTASection'));
import ErrorBoundary from '../components/ErrorBoundary';

// Loading component for sections
const SectionLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-zephix-purple/20 border-t-zephix-purple"></div>
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-zephix-blue animate-ping"></div>
    </div>
    <div className="ml-4 text-zephix-purple font-medium">Loading...</div>
  </div>
);

// Error fallback component
const SectionError: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
    <p className="text-gray-400 mb-4 max-w-md">
      We encountered an error loading this section. Please try refreshing the page.
    </p>
    <button
      onClick={retry}
      className="px-6 py-2 bg-zephix-purple text-white rounded-lg hover:bg-zephix-purple/80 transition-colors"
    >
      Try Again
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 text-left">
        <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
        <pre className="mt-2 text-xs text-red-400 bg-red-900/20 p-3 rounded overflow-auto max-w-md">
          {error.message}
        </pre>
      </details>
    )}
  </div>
);

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Track landing page view
    trackEvent('landing_view', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    });

    // Track scroll depth
    let scrollDepth = 0;
    const handleScroll = () => {
      const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      
      if (scrollPercent >= 25 && scrollDepth < 25) {
        trackEvent('scroll_depth', { depth: 25 });
        scrollDepth = 25;
      } else if (scrollPercent >= 50 && scrollDepth < 50) {
        trackEvent('scroll_depth', { depth: 50 });
        scrollDepth = 50;
      } else if (scrollPercent >= 75 && scrollDepth < 75) {
        trackEvent('scroll_depth', { depth: 75 });
        scrollDepth = 75;
      } else if (scrollPercent >= 100 && scrollDepth < 100) {
        trackEvent('scroll_depth', { depth: 100 });
        scrollDepth = 100;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zephix-dark text-white overflow-hidden">
      {/* Hero Section */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <Hero />
        </Suspense>
      </ErrorBoundary>

      {/* Problem Section */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <ProblemSection />
        </Suspense>
      </ErrorBoundary>

      {/* Solution Cards */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <SolutionCards />
        </Suspense>
      </ErrorBoundary>

      {/* Tech Validation */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <TechValidation />
        </Suspense>
      </ErrorBoundary>

      {/* Comparison Table */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <ComparisonTable />
        </Suspense>
      </ErrorBoundary>

      {/* Timeline/Roadmap */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <Timeline />
        </Suspense>
      </ErrorBoundary>

      {/* FAQ Section */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <FAQ />
        </Suspense>
      </ErrorBoundary>

      {/* CTA Section */}
      <ErrorBoundary fallback={({ error, retry }) => <SectionError error={error} retry={retry} />}>
        <Suspense fallback={<SectionLoader />}>
          <CTASection />
        </Suspense>
      </ErrorBoundary>

      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent animate-grid-flow" />
      </div>
    </div>
  );
};

export default LandingPage;