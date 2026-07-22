/**
 * SESSION-FRONTEND-1 Item 4 — ProjectRisksPage uses route param projectId.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectRisksPage from '@/features/projects/risks/ProjectRisksPage';

const getProjectRisks = vi.fn();

vi.mock('@/features/projects/projects.api', () => ({
  projectsApi: {
    getProjectRisks: (...args: unknown[]) => getProjectRisks(...args),
  },
}));

describe('ProjectRisksPage — projectId param', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectRisks.mockResolvedValue([
      {
        id: 'r1',
        projectId: 'proj-abc',
        organizationId: 'org-1',
        type: 'schedule',
        title: 'Schedule slip',
        description: 'Behind baseline',
        severity: 'high',
        status: 'open',
        detectedAt: '2026-07-01T00:00:00.000Z',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ]);
  });

  it('loads risks using params.projectId (not params.id)', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-abc/risks']}>
        <Routes>
          <Route path="/projects/:projectId/risks" element={<ProjectRisksPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getProjectRisks).toHaveBeenCalledWith('proj-abc');
    });
    expect(await screen.findByText('Schedule slip')).toBeInTheDocument();
    expect(screen.queryByText(/Loading risks/i)).not.toBeInTheDocument();
  });
});
