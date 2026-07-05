/**
 * WAVE 1 Track D — entity relations panel gating.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TaskRelationsSection } from '../components/TaskRelationsSection';
import type { EntityLink } from '../entityLinks.types';

vi.mock('../entityLinks.api', () => ({
  listEntityLinksForEntity: vi.fn(),
  loadProjectRelationPickerOptions: vi.fn(),
  createEntityLink: vi.fn(),
  deleteEntityLink: vi.fn(),
}));

import {
  listEntityLinksForEntity,
  loadProjectRelationPickerOptions,
  createEntityLink,
} from '../entityLinks.api';

const BASE_LINK: EntityLink = {
  id: 'link-1',
  organizationId: 'org-1',
  workspaceId: 'ws-1',
  sourceEntityType: 'TASK',
  sourceEntityId: 'task-1',
  targetEntityType: 'RISK',
  targetEntityId: 'risk-1',
  relationType: 'MITIGATES',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('TaskRelationsSection (Track D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadProjectRelationPickerOptions).mockResolvedValue([
      {
        entityType: 'RISK',
        entityId: 'risk-1',
        label: 'Supply chain delay',
        subtitle: 'HIGH · OPEN',
      },
      {
        entityType: 'RISK',
        entityId: 'risk-2',
        label: 'Budget overrun',
      },
    ]);
  });

  it('renders existing links with relation chip and directional label', async () => {
    vi.mocked(listEntityLinksForEntity).mockResolvedValue([BASE_LINK]);

    render(
      <TaskRelationsSection
        workspaceId="ws-1"
        projectId="proj-1"
        taskId="task-1"
        canEdit
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('task-relations-section')).toBeInTheDocument();
    });

    expect(screen.getByTestId('relation-row-link-1')).toBeInTheDocument();
    expect(screen.getByText('Mitigates')).toBeInTheDocument();
    expect(screen.getByText(/mitigates → Supply chain delay/i)).toBeInTheDocument();
  });

  it('add flow creates a link via POST contract', async () => {
    vi.mocked(listEntityLinksForEntity).mockResolvedValue([]);
    vi.mocked(createEntityLink).mockResolvedValue({
      ...BASE_LINK,
      id: 'link-new',
      targetEntityId: 'risk-2',
      relationType: 'RELATES_TO',
    });

    const user = userEvent.setup();
    render(
      <TaskRelationsSection
        workspaceId="ws-1"
        projectId="proj-1"
        taskId="task-1"
        canEdit
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('relations-add-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('relations-add-button'));
    await user.click(screen.getByTestId('relations-pick-risk'));
    await user.click(screen.getByTestId('relations-option-risk-2'));
    await user.click(screen.getByTestId('relations-create-link'));

    await waitFor(() => {
      expect(createEntityLink).toHaveBeenCalledWith('ws-1', {
        sourceEntityType: 'TASK',
        sourceEntityId: 'task-1',
        targetEntityType: 'RISK',
        targetEntityId: 'risk-2',
        relationType: 'RELATES_TO',
      });
    });

    expect(screen.getByTestId('relation-row-link-new')).toBeInTheDocument();
  });

  it('shows inline error when duplicate link is rejected', async () => {
    vi.mocked(listEntityLinksForEntity).mockResolvedValue([]);
    vi.mocked(createEntityLink).mockRejectedValue({
      response: { data: { code: 'LINK_ALREADY_EXISTS', message: 'exists' } },
    });

    const user = userEvent.setup();
    render(
      <TaskRelationsSection
        workspaceId="ws-1"
        projectId="proj-1"
        taskId="task-1"
        canEdit
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('relations-add-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('relations-add-button'));
    await user.click(screen.getByTestId('relations-pick-risk'));
    await user.click(screen.getByTestId('relations-option-risk-2'));
    await user.click(screen.getByTestId('relations-create-link'));

    await waitFor(() => {
      expect(screen.getByTestId('relations-inline-error')).toHaveTextContent(
        /already exists/i,
      );
    });
  });
});
