import React from 'react';
import { ENABLE_TEMPLATES } from '@/features/templates/flags';
import { PageHeader } from '@/app/layout/PageHeader';
import { EmptyState } from '@/app/ui/EmptyState';

export const TemplateHubPage = () => {
  if (!ENABLE_TEMPLATES) {
    return (
      <div className="p-6">
        <PageHeader title="Template Hub" />
        <EmptyState
          title="Templates are temporarily disabled"
          description="This feature is behind a flag while we complete backend wiring. Track status in Settings → About or contact support."
        />
      </div>
    );
  }

  // …render actual templates list when enabled
  return (
    <div className="p-6">
      <PageHeader
        title="Template Hub"
        description="Start faster with pre-built project templates."
      />
      {/* TODO: Add actual template functionality when enabled */}
      <EmptyState
        title="Templates coming soon"
        description="We're building a library of project templates to help you get started faster."
      />
    </div>
  );
};
