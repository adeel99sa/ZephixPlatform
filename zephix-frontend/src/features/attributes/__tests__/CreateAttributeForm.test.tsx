import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateAttributeForm } from '../components/CreateAttributeForm';

vi.mock('../attributes.api', () => ({
  createAttributeDefinition: vi.fn(),
}));

import { createAttributeDefinition } from '../attributes.api';

describe('CreateAttributeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires label and key', async () => {
    const user = userEvent.setup();
    render(
      <CreateAttributeForm workspaceId="ws-1" isAdmin={false} onCreated={vi.fn()} />,
    );

    await user.click(screen.getByTestId('attr-create-submit'));

    expect(await screen.findByText('Label is required.')).toBeInTheDocument();
    expect(screen.getByText('Key is required.')).toBeInTheDocument();
    expect(createAttributeDefinition).not.toHaveBeenCalled();
  });

  it('requires options for single_select', async () => {
    const user = userEvent.setup();
    render(
      <CreateAttributeForm workspaceId="ws-1" isAdmin={false} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByTestId('attr-create-label'), 'Severity');
    await user.click(screen.getByTestId('attr-type-single_select'));
    await user.click(screen.getByTestId('attr-create-submit'));

    expect(
      await screen.findByText('At least one option is required for select fields.'),
    ).toBeInTheDocument();
    expect(createAttributeDefinition).not.toHaveBeenCalled();
  });

  it('submits valid workspace-scoped field', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    vi.mocked(createAttributeDefinition).mockResolvedValue({
      id: 'new-1',
      organizationId: 'org-1',
      scope: 'WORKSPACE',
      workspaceId: 'ws-1',
      key: 'severity',
      label: 'Severity',
      dataType: 'text',
      locked: false,
      required: false,
      isActive: true,
      defaultValue: null,
      options: null,
    });

    render(
      <CreateAttributeForm workspaceId="ws-1" isAdmin={false} onCreated={onCreated} />,
    );

    await user.type(screen.getByTestId('attr-create-label'), 'Severity');
    await user.click(screen.getByTestId('attr-create-submit'));

    await waitFor(() => expect(createAttributeDefinition).toHaveBeenCalled());
    expect(onCreated).toHaveBeenCalled();
  });
});
