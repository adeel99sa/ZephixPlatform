import React from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalHeader } from '../components/layout/GlobalHeader';
import { FloatingAIAssistant } from '../components/ai/FloatingAIAssistant';
import { FeedbackWidget } from '../components/feedback/FeedbackWidget';

interface MainLayoutProps {
  currentPage?: string;
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  currentPage,
  children 
}) => {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Global Header */}
      <GlobalHeader currentPage={currentPage} />
      
      {/* Main Content */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      
      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
      
      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}; 