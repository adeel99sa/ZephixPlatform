/**
 * PROMPT 9 C2: Frontend Tests for Admin Invite Page
 *
 * Tests:
 * - Multi email input parses correctly
 * - Assignment UI renders and submits
 * - Results render
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminInvitePage from '../AdminInvitePage';
import { adminApi } from '@/services/adminApi';
import { listWorkspaces } from '@/features/workspaces/api';

// Mock dependencies
vi.mock('@/services/adminApi');
vi.mock('@/features/workspaces/api');

const mockWorkspaces = [
  { id: 'ws-1', name: 'Workspace 1', slug: 'workspace-1' },
  { id: 'ws-2', name: 'Workspace 2', slug: 'workspace-2' },
];

describe('AdminInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWorkspaces).mockResolvedValue(mockWorkspaces);
  });

  it('multi email input parses correctly', async () => {
    vi.mocked(adminApi.inviteUsers).mockResolvedValue({
      data: {
        results: [
          { email: 'user1@test.com', status: 'success' },
          { email: 'user2@test.com', status: 'success' },
        ],
      },
    });

    render(
      <BrowserRouter>
        <AdminInvitePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/enter email/i);

    // Add first email
    fireEvent.change(emailInput, { target: { value: 'user1@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /plus/i }));

    // Add second email via comma-separated
    fireEvent.change(emailInput, { target: { value: 'user2@test.com, user3@test.com' } });
    fireEvent.keyPress(emailInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    });
  });

  it('assignment UI renders and submits', async () => {
    vi.mocked(adminApi.inviteUsers).mockResolvedValue({
      data: {
        results: [{ email: 'user@test.com', status: 'success' }],
      },
    });

    render(
      <BrowserRouter>
        <AdminInvitePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workspace 1')).toBeInTheDocument();
    });

    // Select workspace assignment
    const workspace1Checkbox = screen.getByLabelText(/workspace 1/i);
    fireEvent.click(workspace1Checkbox);

    // Verify access level selector appears
    await waitFor(() => {
      const accessSelect = screen.getByDisplayValue('Member');
      expect(accessSelect).toBeInTheDocument();
    });

    // Add email and submit
    const emailInput = screen.getByPlaceholderText(/enter email/i);
    fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /plus/i }));

    const submitButton = screen.getByRole('button', { name: /send.*invitation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(adminApi.inviteUsers).toHaveBeenCalledWith({
        emails: ['user@test.com'],
        platformRole: 'Member',
        workspaceAssignments: [
          { workspaceId: 'ws-1', accessLevel: 'Member' },
        ],
      });
    });
  });

  it('results render correctly', async () => {
    vi.mocked(adminApi.inviteUsers).mockResolvedValue({
      data: {
        results: [
          { email: 'user1@test.com', status: 'success', message: 'Invitation sent' },
          { email: 'user2@test.com', status: 'error', message: 'User already in organization' },
        ],
      },
    });

    render(
      <BrowserRouter>
        <AdminInvitePage />
      </BrowserRouter>
    );

    // Add emails and submit
    const emailInput = screen.getByPlaceholderText(/enter email/i);
    fireEvent.change(emailInput, { target: { value: 'user1@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /plus/i }));

    fireEvent.change(emailInput, { target: { value: 'user2@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /plus/i }));

    const submitButton = screen.getByRole('button', { name: /send.*invitation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/user1@test.com.*success/i)).toBeInTheDocument();
      expect(screen.getByText(/user2@test.com.*error/i)).toBeInTheDocument();
    });
  });
});
