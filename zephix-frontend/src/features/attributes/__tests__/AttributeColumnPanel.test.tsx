import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AttributeDefinition } from '../attributes.types';
import { AttributeColumnPanel } from '../components/AttributeColumnPanel';

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: { platformRole: 'MEMBER' } }),
}));

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

describe('AttributeColumnPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders locked items without remove/toggle control', () => {
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
    expect(screen.getByTestId('attr-toggle-attr-open')).toBeInTheDocument();
  });
});
