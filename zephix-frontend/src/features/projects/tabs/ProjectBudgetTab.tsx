/**
 * ProjectBudgetTab
 *
 * Wrapper that delegates to the Sprint 5 BudgetTab component.
 * The BudgetTab supports baselines, actuals, EV metrics, and policy thresholds.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { BudgetTab } from '@/features/budget/BudgetTab';

export const ProjectBudgetTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <p className="text-sm text-gray-500 p-4">Loading...</p>;
  }

  return <BudgetTab projectId={projectId} />;
};

export default ProjectBudgetTab;
