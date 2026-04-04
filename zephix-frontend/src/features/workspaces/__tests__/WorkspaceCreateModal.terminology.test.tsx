/**
 * Create Workspace modal uses Zephix workspace role labels only.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceCreateModal } from '../WorkspaceCreateModal';

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({ setActiveWorkspace: vi.fn() })),
}));

vi.mock('@/lib/telemetry', () => ({
  telemetry: { track: vi.fn() },
}));

import { useAuth } from '@/state/AuthContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const ORG_ADMIN = {
  id: '1',
  organizationId: 'org-1',
  platformRole: 'ADMIN',
  role: 'admin',
  email: 'a@test.com',
};

describe('WorkspaceCreateModal terminology', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: ORG_ADMIN });
  });

  it('uses Create Workspace title and Zephix role names in copy', () => {
    render(
      <MemoryRouter>
        <WorkspaceCreateModal open onClose={() => {}} onCreated={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Create Workspace/i })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-name-input')).toBeInTheDocument();
    const roles = screen.getByTestId('workspace-create-roles-copy');
    expect(roles.textContent).toMatch(/Workspace Owner/);
    expect(roles.textContent).toMatch(/Workspace Member/);
    expect(roles.textContent).toMatch(/Workspace Viewer/);
    expect(screen.queryByText(/Full Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/View Only/i)).not.toBeInTheDocument();
  });
});
