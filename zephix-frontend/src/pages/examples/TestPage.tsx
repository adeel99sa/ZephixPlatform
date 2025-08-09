import React from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';

const TestPage: React.FC = () => {
  return (
    <div>
      <PageHeader 
        title="Test Page"
        subtitle="Example page showing back navigation and header functionality"
        showBackButton
        backTo="/dashboard"
      >
        <Button variant="primary" size="sm">
          Action Button
        </Button>
      </PageHeader>
      
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Page Content</h2>
          <p className="text-slate-300 mb-4">
            This is an example page showing how the new layout system works:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Global header with navigation and breadcrumbs</li>
            <li>PageHeader component with back navigation</li>
            <li>Floating AI assistant (bottom right)</li>
            <li>Mobile-responsive design</li>
            <li>Organization switcher in header</li>
          </ul>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">AI Assistant Features</h3>
          <p className="text-slate-300">
            The floating AI assistant provides context-aware responses based on the current page. 
            It knows you're on the "{window.location.pathname}" page and can provide relevant assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
