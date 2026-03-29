import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { ProjectShareModal } from '../components/ProjectShareModal';

const listOrgUsersMock = vi.fn();
const listWorkspaceMembersMock = vi.fn();
const shareProjectMock = vi.fn();
const unshareProjectMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/features/workspaces/workspace.api', () => ({
  listOrgUsers: () => listOrgUsersMock(),
  listWorkspaceMembers: (...args: unknown[]) => listWorkspaceMembersMock(...args),
}));

vi.mock('../projects.api', () => ({
  projectsApi: {
    shareProject: (...args: unknown[]) => shareProjectMock(...args),
    unshareProject: (...args: unknown[]) => unshareProjectMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('project share ui contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrgUsersMock.mockResolvedValue([
      {
        id: 'u-shared',
        email: 'shared@zephix.dev',
        firstName: 'Shared',
        lastName: 'User',
      },
      {
        id: 'u-member',
        email: 'member@zephix.dev',
        firstName: 'Workspace',
        lastName: 'Member',
      },
      {
        id: 'u-candidate',
        email: 'candidate@zephix.dev',
        firstName: 'Project',
        lastName: 'Candidate',
      },
    ]);
    listWorkspaceMembersMock.mockResolvedValue([
      { userId: 'u-member' },
      { userId: 'u-workspace-owner' },
    ]);
    shareProjectMock.mockResolvedValue({});
    unshareProjectMock.mockResolvedValue({});
  });

  function renderModal(overrides?: Partial<ComponentProps<typeof ProjectShareModal>>) {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ProjectShareModal
        open
        projectId="proj-1"
        workspaceId="ws-1"
        projectName="Project One"
        project={{
          id: 'proj-1',
          name: 'Project One',
          workspaceId: 'ws-1',
          methodology: 'agile',
          status: 'active',
          phasesCount: 0,
          tasksCount: 0,
          risksCount: 0,
          kpisCount: 0,
          progress: 0,
          riskScore: 0,
          priority: 'medium' as any,
          riskLevel: 'medium' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectManagerId: null,
          deliveryOwnerUserId: null,
        }}
        onClose={onClose}
        onChanged={onChanged}
        {...overrides}
      />,
    );
    return { onChanged, onClose };
  }

  it('allows only existing org users as selectable targets', async () => {
    renderModal();

    const selector = await screen.findByTestId('project-share-user-selector');
    expect(selector).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /shared user/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /workspace member/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /project candidate/i })).toBeInTheDocument();
    expect(screen.queryByText(/invite user/i)).not.toBeInTheDocument();
  });

  it('adds project-only user and refreshes state', async () => {
    const { onChanged } = renderModal();

    const selector = await screen.findByTestId('project-share-user-selector');
    fireEvent.change(selector, { target: { value: 'u-candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Project' }));

    await waitFor(() => {
      expect(shareProjectMock).toHaveBeenCalledWith('proj-1', {
        userId: 'u-candidate',
        accessLevel: 'delivery_owner',
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('uses project_manager slot when delivery_owner is occupied', async () => {
    const { onChanged } = renderModal({
      project: {
        id: 'proj-1',
        name: 'Project One',
        workspaceId: 'ws-1',
        methodology: 'agile',
        status: 'active',
        phasesCount: 0,
        tasksCount: 0,
        risksCount: 0,
        kpisCount: 0,
        progress: 0,
        riskScore: 0,
        priority: 'medium' as any,
        riskLevel: 'medium' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectManagerId: null,
        deliveryOwnerUserId: 'u-shared',
      },
    });
    const selector = await screen.findByTestId('project-share-user-selector');
    fireEvent.change(selector, { target: { value: 'u-candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Project' }));

    await waitFor(() => {
      expect(shareProjectMock).toHaveBeenCalledWith('proj-1', {
        userId: 'u-candidate',
        accessLevel: 'project_manager',
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it('uses delivery_owner slot when project_manager is occupied', async () => {
    const { onChanged } = renderModal({
      project: {
        id: 'proj-1',
        name: 'Project One',
        workspaceId: 'ws-1',
        methodology: 'agile',
        status: 'active',
        phasesCount: 0,
        tasksCount: 0,
        risksCount: 0,
        kpisCount: 0,
        progress: 0,
        riskScore: 0,
        priority: 'medium' as any,
        riskLevel: 'medium' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectManagerId: 'u-shared',
        deliveryOwnerUserId: null,
      },
    });
    const selector = await screen.findByTestId('project-share-user-selector');
    fireEvent.change(selector, { target: { value: 'u-candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Project' }));

    await waitFor(() => {
      expect(shareProjectMock).toHaveBeenCalledWith('proj-1', {
        userId: 'u-candidate',
        accessLevel: 'delivery_owner',
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks add when both share slots are occupied', async () => {
    renderModal({
      project: {
        id: 'proj-1',
        name: 'Project One',
        workspaceId: 'ws-1',
        methodology: 'agile',
        status: 'active',
        phasesCount: 0,
        tasksCount: 0,
        risksCount: 0,
        kpisCount: 0,
        progress: 0,
        riskScore: 0,
        priority: 'medium' as any,
        riskLevel: 'medium' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectManagerId: 'u-shared',
        deliveryOwnerUserId: 'u-member',
      },
    });

    expect(
      await screen.findByText('No project share slots are available for this project.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Project' })).toBeDisabled();
  });

  it('blocks workspace member from project-share target', async () => {
    renderModal();

    const selector = await screen.findByTestId('project-share-user-selector');
    fireEvent.change(selector, { target: { value: 'u-member' } });

    expect(
      await screen.findByText(/already has workspace access\. project sharing is not needed\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Project' })).toBeDisabled();
  });

  it('removes shared user and refreshes state', async () => {
    const { onChanged } = renderModal({
      project: {
        id: 'proj-1',
        name: 'Project One',
        workspaceId: 'ws-1',
        methodology: 'agile',
        status: 'active',
        phasesCount: 0,
        tasksCount: 0,
        risksCount: 0,
        kpisCount: 0,
        progress: 0,
        riskScore: 0,
        priority: 'medium' as any,
        riskLevel: 'medium' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectManagerId: 'u-shared',
        deliveryOwnerUserId: null,
      },
    });

    const removeButton = await screen.findByTestId('remove-shared-u-shared');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(unshareProjectMock).toHaveBeenCalledWith('proj-1', 'u-shared');
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it('shows explicit candidate fetch error and supports retry', async () => {
    listOrgUsersMock
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce([
        {
          id: 'u-candidate',
          email: 'candidate@zephix.dev',
          firstName: 'Project',
          lastName: 'Candidate',
        },
      ]);

    renderModal();

    expect(
      await screen.findByText('Could not load candidate users. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No matching organization users found.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /project candidate/i }),
      ).toBeInTheDocument();
    });
  });
});

