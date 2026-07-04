/**
 * Phase 1 field-panel unification — CI gating tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, type ComponentProps } from 'react';

import type { AttributeDefinition } from '@/features/attributes/attributes.types';
import { DEFAULT_COLUMNS, WATERFALL_DATA_COLUMN_ORDER } from '@/features/projects/columns';
import { UnifiedWorkFieldsPanel } from '../UnifiedWorkFieldsPanel';

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: { platformRole: 'MEMBER' } }),
}));

vi.mock('@/features/attributes/attributes.api', () => ({
  createAttributeDefinition: vi.fn(),
}));

const UNLOCKED_ATTR: AttributeDefinition = {
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

const TABLE_COLUMNS = [
  { id: 'title', label: 'Title', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'priority', label: 'Priority', visible: false },
];

function PanelHarness(
  props: Omit<ComponentProps<typeof UnifiedWorkFieldsPanel>, 'anchorRef' | 'onClose'>,
) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef} type="button">
        Open panel
      </button>
      <UnifiedWorkFieldsPanel {...props} anchorRef={anchorRef} onClose={vi.fn()} />
    </>
  );
}

describe('UnifiedWorkFieldsPanel (Phase 1 gating)', () => {
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

  it('renders Properties and Custom fields groups (registry + attributes)', () => {
    render(
      <PanelHarness
        properties={{
          mode: 'registry',
          dataColumnOrder: WATERFALL_DATA_COLUMN_ORDER,
          hiddenColumns: new Set(),
          onToggleColumn: vi.fn(),
          governanceActive: true,
        }}
        customFields={{
          available: [UNLOCKED_ATTR],
          visibleIds: new Set(),
          onToggleColumn: vi.fn(),
          onCreated: vi.fn(),
          workspaceId: 'ws-1',
        }}
      />,
    );

    expect(screen.getByTestId('unified-work-fields-panel')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Custom fields')).toBeInTheDocument();
    expect(screen.getByTestId('properties-fields-section')).toBeInTheDocument();
    expect(screen.getByTestId('custom-fields-section')).toBeInTheDocument();
  });

  it('renders table-mode Properties alongside custom fields', () => {
    render(
      <PanelHarness
        properties={{
          mode: 'table',
          columns: TABLE_COLUMNS,
          onToggleColumn: vi.fn(),
        }}
        customFields={{
          available: [UNLOCKED_ATTR],
          visibleIds: new Set(),
          onToggleColumn: vi.fn(),
          onCreated: vi.fn(),
          workspaceId: 'ws-1',
        }}
      />,
    );

    expect(screen.getByTestId('table-properties-section')).toBeInTheDocument();
    expect(screen.getByTestId('custom-fields-section')).toBeInTheDocument();
  });

  it('badges every disabled optional property row in More fields', () => {
    render(
      <PanelHarness
        properties={{
          mode: 'registry',
          dataColumnOrder: DEFAULT_COLUMNS.agile,
          hiddenColumns: new Set(),
          onToggleColumn: vi.fn(),
          governanceActive: true,
          showOptionalPool: true,
        }}
      />,
    );

    const moreFieldsHeading = screen.getByText('More fields');
    const moreFieldsSection = moreFieldsHeading.closest('section');
    expect(moreFieldsSection).toBeTruthy();
    const disabledInMore = moreFieldsSection!.querySelectorAll('input[type="checkbox"]:disabled');
    expect(disabledInMore.length).toBeGreaterThan(0);
    for (const input of disabledInMore) {
      const row = input.closest('label');
      expect(row?.querySelector('[data-testid="fields-coming-soon-badge"]')).toBeTruthy();
    }
  });

  it('property toggle hides a registry column', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <PanelHarness
        properties={{
          mode: 'registry',
          dataColumnOrder: DEFAULT_COLUMNS.agile,
          hiddenColumns: new Set(),
          onToggleColumn: onToggle,
          showOptionalPool: false,
        }}
      />,
    );

    const assigneeToggle = screen.getByTestId('customize-view-toggle-assignee');
    await user.click(assigneeToggle);
    expect(onToggle).toHaveBeenCalledWith('assignee');
  });

  it('waterfall mount disables custom-field toggles with Coming soon badge', () => {
    render(
      <PanelHarness
        properties={{
          mode: 'registry',
          dataColumnOrder: WATERFALL_DATA_COLUMN_ORDER,
          hiddenColumns: new Set(),
          onToggleColumn: vi.fn(),
          governanceActive: true,
        }}
        customFields={{
          available: [UNLOCKED_ATTR],
          visibleIds: new Set(),
          onToggleColumn: vi.fn(),
          onCreated: vi.fn(),
          workspaceId: 'ws-1',
          columnsSurfaceReady: false,
        }}
      />,
    );

    const toggle = screen.getByTestId('attr-toggle-attr-open');
    expect(toggle).toBeDisabled();
    const pendingRow = screen.getByTestId('attr-toggle-pending-attr-open');
    expect(pendingRow).toHaveAttribute(
      'title',
      'Custom field columns arrive on waterfall views shortly.',
    );
    expect(pendingRow.querySelector('[data-testid="fields-coming-soon-badge"]')).toBeTruthy();
  });

  it('custom-field toggle adds a column when surface is ready', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <PanelHarness
        customFields={{
          available: [UNLOCKED_ATTR],
          visibleIds: new Set(),
          onToggleColumn: onToggle,
          onCreated: vi.fn(),
          workspaceId: 'ws-1',
        }}
      />,
    );

    await user.click(screen.getByTestId('attr-toggle-attr-open'));
    expect(onToggle).toHaveBeenCalledWith('attr-open', true);
  });
});
