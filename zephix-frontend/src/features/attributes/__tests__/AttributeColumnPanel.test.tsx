import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, type ComponentProps } from 'react';

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

function PanelHarness(props: Omit<ComponentProps<typeof AttributeColumnPanel>, 'anchorRef' | 'onClose'>) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef} type="button">
        Open panel
      </button>
      <AttributeColumnPanel {...props} anchorRef={anchorRef} onClose={vi.fn()} />
    </>
  );
}

describe('AttributeColumnPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 100,
      width: 24,
      height: 24,
      top: 100,
      left: 100,
      right: 124,
      bottom: 124,
      toJSON: () => ({}),
    }));
  });

  it('renders locked items without remove/toggle control', () => {
    render(
      <PanelHarness
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

  it('shows full scope labels without truncating workspace/org text', () => {
    render(
      <PanelHarness
        available={[LOCKED, UNLOCKED]}
        visibleIds={new Set()}
        onToggleColumn={vi.fn()}
        onCreated={vi.fn()}
        workspaceId="ws-1"
      />,
    );

    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });

  it('Create new tab renders the form for non-admin members', async () => {
    const user = userEvent.setup();
    render(
      <PanelHarness
        available={[UNLOCKED]}
        visibleIds={new Set()}
        onToggleColumn={vi.fn()}
        onCreated={vi.fn()}
        workspaceId="ws-1"
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Create new' }));
    expect(screen.getByTestId('create-attribute-form')).toBeInTheDocument();
    expect(screen.queryByTestId('attr-create-scope')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attr-create-locked')).not.toBeInTheDocument();
  });
});
