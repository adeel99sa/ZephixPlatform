import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavigation } from './TopNavigation';
import { Sidebar } from './Sidebar';
import { ContextPanel } from './ContextPanel';

interface AdminLayoutProps {
  showContextPanel?: boolean;
  contextPanelContent?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  showContextPanel = false, 
  contextPanelContent 
}) => {
  return (
    <div className="min-h-screen bg-neutral-100">
      <TopNavigation />
      
      <div className="flex">
        <Sidebar />
        
        <main className={`flex-1 transition-all duration-300 ${
          showContextPanel ? 'mr-[360px]' : ''
        }`}>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
        
        {showContextPanel && (
          <ContextPanel>
            {contextPanelContent}
          </ContextPanel>
        )}
      </div>
    </div>
  );
};

