import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SentryErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { initSentry, setSentryTags, setSentryContext } from './config/sentry';

// Lazy load page components for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const ProjectsDashboard = lazy(() => import('./pages/projects/ProjectsDashboard').then(module => ({ default: module.ProjectsDashboard })));
const AIDashboard = lazy(() => import('./pages/dashboard/AIDashboard').then(module => ({ default: module.AIDashboard })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(module => ({ default: module.SignupPage })));
const EmailVerificationPage = lazy(() => import('./pages/auth/EmailVerificationPage').then(module => ({ default: module.default })));
const PendingVerificationPage = lazy(() => import('./pages/auth/PendingVerificationPage').then(module => ({ default: module.default })));

// Document Intelligence
const DocumentIntelligencePage = lazy(() => import('./pages/intelligence/DocumentIntelligencePage').then(module => ({ default: module.default })));

// Organizations
const TeamManagement = lazy(() => import('./pages/organizations/TeamManagement').then(module => ({ default: module.default })));
const OrganizationSettings = lazy(() => import('./pages/organizations/OrganizationSettings').then(module => ({ default: module.default })));

// BRD
const BRDUpload = lazy(() => import('./pages/brd/BRDUpload').then(module => ({ default: module.default })));

// Project Management
const ProjectStatusPage = lazy(() => import('./pages/pm/project/[id]/status').then(module => ({ default: module.default })));

// Workflow Framework
const WorkflowTemplateList = lazy(() => import('./pages/WorkflowTemplateList').then(module => ({ default: module.WorkflowTemplateList })));
const WorkflowTemplateBuilder = lazy(() => import('./pages/WorkflowTemplateBuilder').then(module => ({ default: module.WorkflowTemplateBuilder })));
const IntakeFormList = lazy(() => import('./pages/IntakeFormList').then(module => ({ default: module.IntakeFormList })));
const IntakeFormBuilder = lazy(() => import('./pages/IntakeFormBuilder').then(module => ({ default: module.IntakeFormBuilder })));
const PublicIntakeForm = lazy(() => import('./pages/PublicIntakeForm').then(module => ({ default: module.PublicIntakeForm })));

// Additional pages
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then(module => ({ default: module.RoadmapPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then(module => ({ default: module.DocsPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.BlogPage })));
const CareersPage = lazy(() => import('./pages/CareersPage').then(module => ({ default: module.CareersPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage').then(module => ({ default: module.SecurityPage })));

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
            <Route path="/" element={<LandingPage />} />

            {/* Protected routes with new layout */}
            <Route path="/dashboard" element={
              <ProtectedLayout currentPage="Dashboard" noPadding>
                <AIDashboard />
              </ProtectedLayout>
            } />

            <Route path="/projects" element={
              <ProtectedLayout currentPage="Projects">
                <ProjectsDashboard />
              </ProtectedLayout>
            } />

            <Route path="/projects/:id/status" element={
              <ProtectedLayout currentPage="Project Status">
                <ProjectStatusPage />
              </ProtectedLayout>
            } />

            <Route path="/intelligence" element={
              <ProtectedLayout currentPage="Document Intelligence">
                <DocumentIntelligencePage />
              </ProtectedLayout>
            } />

            <Route path="/organizations/team" element={
              <ProtectedLayout currentPage="Team Management">
                <TeamManagement />
              </ProtectedLayout>
            } />

            <Route path="/organizations/settings" element={
              <ProtectedLayout currentPage="Organization Settings">
                <OrganizationSettings />
              </ProtectedLayout>
            } />

            <Route path="/brd/upload" element={
              <ProtectedLayout currentPage="BRD Upload">
                <BRDUpload />
              </ProtectedLayout>
            } />

            {/* Workflow Management */}
            <Route path="/workflow-templates" element={
              <ProtectedLayout currentPage="Workflow Templates">
                <WorkflowTemplateList />
              </ProtectedLayout>
            } />

            <Route path="/workflow-templates/builder" element={
              <ProtectedLayout currentPage="Template Builder" noPadding>
                <WorkflowTemplateBuilder />
              </ProtectedLayout>
            } />

            <Route path="/workflow-templates/:id/edit" element={
              <ProtectedLayout currentPage="Template Builder" noPadding>
                <WorkflowTemplateBuilder />
              </ProtectedLayout>
            } />

            <Route path="/intake-forms" element={
              <ProtectedLayout currentPage="Intake Forms">
                <IntakeFormList />
              </ProtectedLayout>
            } />

            <Route path="/intake-forms/builder" element={
              <ProtectedLayout currentPage="Form Builder" noPadding>
                <IntakeFormBuilder />
              </ProtectedLayout>
            } />

            <Route path="/intake-forms/:id/edit" element={
              <ProtectedLayout currentPage="Form Builder" noPadding>
                <IntakeFormBuilder />
              </ProtectedLayout>
            } />

            {/* Public Intake Forms (no authentication required) */}
            <Route path="/intake/:slug" element={<PublicIntakeForm />} />

            {/* Authentication */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
            <Route path="/auth/pending-verification" element={<PendingVerificationPage />} />

            {/* Additional pages */}
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/security" element={<SecurityPage />} />

            {/* 404 Not Found fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
}