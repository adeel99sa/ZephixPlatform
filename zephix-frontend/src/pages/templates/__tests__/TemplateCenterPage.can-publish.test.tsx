/**
 * Regression: TemplateCenterPage canPublish parity (WS-AF-FE-D-P2 Batch 8 Capability 1).
 * Guards RESTORED behavior — ORG: user.role === 'admin'; WORKSPACE: !isReadOnly — not canonical helpers alone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TemplateDto } from '@/features/templates/templates.api';

function baseTemplate(scope: TemplateDto['templateScope'], overrides: Partial<TemplateDto> = {}): TemplateDto {
  const now = new Date().toISOString();
  return {
    id: 'tpl-1',
    name: 'Regression Template',
    kind: 'project',
    templateScope: scope,
    isDefault: false,
    isSystem: false,
    isActive: true,
    lockState: 'UNLOCKED',
    version: 1,
    createdAt: now,
    updatedAt: now,
    defaultEnabledKPIs: [],
    ...overrides,
  };
}

const listTemplatesFn = vi.fn();
const authState = vi.hoisted(() => ({
  user: { id: 'u1', role: 'admin' } as Record<string, unknown>,
}));
const workspaceRoleState = vi.hoisted(() => ({
  isReadOnly: true,
}));

vi.mock('@/features/templates/templates.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/templates/templates.api')>();
  return {
    ...actual,
    listTemplates: (...args: unknown[]) => listTemplatesFn(...args),
    updateTemplate: vi.fn(),
    publishTemplate: vi.fn(),
  };
});

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: () => ({
    role: null,
    canWrite: false,
    isReadOnly: workspaceRoleState.isReadOnly,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: 'ws-1',
  }),
}));

vi.mock('@/pages/templates/CreateTemplateModal', () => ({
  CreateTemplateModal: () => null,
}));

vi.mock('@/pages/templates/InstantiateTemplateModal', () => ({
  InstantiateTemplateModal: () => null,
}));

vi.mock('@/pages/templates/TemplateStructureEditor', () => ({
  TemplateStructureEditor: () => <div data-testid="structure-editor-stub" />,
}));

vi.mock('@/pages/templates/TemplateKpiSelector', () => ({
  TemplateKpiSelector: () => null,
}));

import TemplateCenterPage from '@/pages/templates/TemplateCenterPage';

describe('TemplateCenterPage canPublish (Batch 8 restoration parity)', () => {
  beforeEach(() => {
    listTemplatesFn.mockReset();
    authState.user = { id: 'u1', role: 'admin' };
    workspaceRoleState.isReadOnly = true;
  });

  async function selectTemplate(scope: TemplateDto['templateScope'], userRole: string): Promise<HTMLElement> {
    listTemplatesFn.mockResolvedValue([baseTemplate(scope)]);
    authState.user = { id: 'u1', role: userRole };
    render(<TemplateCenterPage />);
    await waitFor(() => expect(listTemplatesFn).toHaveBeenCalled());
    expect(await screen.findByText('Regression Template')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Regression Template'));
    return screen.getByRole('button', { name: 'Publish' });
  }

  it('ORG + user.role admin → Publish enabled', async () => {
    const publish = await selectTemplate('ORG', 'admin');
    expect(publish).not.toBeDisabled();
  });

  it('ORG + user.role member → Publish disabled', async () => {
    const publish = await selectTemplate('ORG', 'member');
    expect(publish).toBeDisabled();
  });

  it('WORKSPACE + isReadOnly false → Publish enabled (role string ignored for this branch)', async () => {
    workspaceRoleState.isReadOnly = false;
    const publish = await selectTemplate('WORKSPACE', 'member');
    expect(publish).not.toBeDisabled();
  });

  it('WORKSPACE + isReadOnly true → Publish disabled', async () => {
    workspaceRoleState.isReadOnly = true;
    const publish = await selectTemplate('WORKSPACE', 'admin');
    expect(publish).toBeDisabled();
  });

  it('SYSTEM scope → Publish disabled', async () => {
    const publish = await selectTemplate('SYSTEM', 'admin');
    expect(publish).toBeDisabled();
  });
});
