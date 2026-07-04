/**
 * WAVE 1 Track A — CI gating tests for attribute UI.
 * Covers: locked affordance, create-form validation, type-mismatch inline error.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AttributeDefinition } from '../attributes.types';
import { AttributeColumnPanel } from '../components/AttributeColumnPanel';
import { CreateAttributeForm } from '../components/CreateAttributeForm';
import { AttributeCell } from '../components/AttributeCell';

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: { platformRole: 'MEMBER' } }),
}));

vi.mock('../attributes.api', () => ({
  createAttributeDefinition: vi.fn(),
}));

import { createAttributeDefinition } from '../attributes.api';

const LOCKED: AttributeDefinition = {
  id: 'attr-locked',
  organizationId: 'org-1',
  scope: 'ORG',
  workspaceId: null,
  key: 'sla',
  label: 'SLA Tier',
  dataType: 'single_select',
  locked: true,
  required: true,
  isActive: true,
  defaultValue: null,
  options: ['Standard', 'Premium'],
};

const UNLOCKED: AttributeDefinition = {
  id: 'attr-open',
  organizationId: 'org-1',
  scope: 'WORKSPACE',
  workspaceId: 'ws-1',
  key: 'notes',
  label: 'Notes',
  dataType: 'text',
  locked: false,
  required: false,
  isActive: true,
  defaultValue: null,
  options: null,
};

const numberDef: AttributeDefinition = {
  id: 'attr-num',
  organizationId: null,
  scope: 'WORKSPACE',
  workspaceId: 'ws-1',
  key: 'hours',
  label: 'Hours',
  dataType: 'number',
  locked: false,
  required: false,
  isActive: true,
  defaultValue: null,
  options: null,
};

describe('attributes gating (WAVE 1 Track A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('locked items render without remove/toggle control', () => {
    render(
      <AttributeColumnPanel
        available={[LOCKED, UNLOCKED]}
        visibleIds={new Set()}
        onToggleColumn={vi.fn()}
        onCreated={vi.fn()}
        workspaceId="ws-1"
      />,
    );
    expect(screen.getByTestId('attr-locked-attr-locked')).toBeInTheDocument();
    expect(screen.queryByTestId('attr-toggle-attr-locked')).not.toBeInTheDocument();
  });

  it('create form validates key, label, and select options', async () => {
    const user = userEvent.setup();
    render(
      <CreateAttributeForm workspaceId="ws-1" isAdmin={false} onCreated={vi.fn()} />,
    );

    await user.click(screen.getByTestId('attr-create-submit'));
    expect(await screen.findByText('Label is required.')).toBeInTheDocument();
    expect(screen.getByText('Key is required.')).toBeInTheDocument();

    await user.type(screen.getByTestId('attr-create-label'), 'Severity');
    await user.selectOptions(screen.getByTestId('attr-create-data-type'), 'single_select');
    await user.click(screen.getByTestId('attr-create-submit'));
    expect(
      await screen.findByText('At least one option is required for select fields.'),
    ).toBeInTheDocument();
    expect(createAttributeDefinition).not.toHaveBeenCalled();
  });

  it('type-mismatch surfaces inline on attribute cell', () => {
    render(
      <AttributeCell
        definition={numberDef}
        value={8}
        canEdit
        isEditing={false}
        error="Value does not match the attribute type."
        onStartEdit={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('attr-cell-inline-error')).toHaveTextContent(
      'Value does not match the attribute type.',
    );
  });
});
