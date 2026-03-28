import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectBudgetTab } from '../ProjectBudgetTab';

// Mock the Sprint 5 BudgetTab since it has its own API and internal logic
vi.mock('@/features/budget/BudgetTab', () => ({
  BudgetTab: ({ projectId }: { projectId: string }) => (
    <div data-testid="budget-tab-inner">
      <span data-testid="budget-project-id">{projectId}</span>
    </div>
  ),
}));

function renderTab() {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/budget']}>
      <Routes>
        <Route path="/projects/:projectId/budget" element={<ProjectBudgetTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderTabWithoutProject() {
  return render(
    <MemoryRouter initialEntries={['/budget']}>
      <Routes>
        <Route path="/budget" element={<ProjectBudgetTab />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectBudgetTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders BudgetTab with correct projectId', async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByTestId('budget-tab-inner')).toBeInTheDocument();
    });

    expect(screen.getByTestId('budget-project-id')).toHaveTextContent('proj-1');
  });

  it('renders loading state when no projectId', () => {
    renderTabWithoutProject();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
