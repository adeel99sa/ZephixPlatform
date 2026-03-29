import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneralTab from '../GeneralTab';

const patchMock = vi.fn();
const getUsersMock = vi.fn();
const listTemplatesMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    patch: (...args: any[]) => patchMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', organizationId: 'org-1' },
  }),
}));

vi.mock('@/features/admin/users/users.api', () => ({
  usersApi: {
    getUsers: (...args: any[]) => getUsersMock(...args),
  },
}));

vi.mock('@/features/templates/api', () => ({
  listTemplates: (...args: any[]) => listTemplatesMock(...args),
}));

describe('GeneralTab template inheritance settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsersMock.mockResolvedValue({
      users: [{ id: 'owner-1', firstName: 'Owner', lastName: 'One', email: 'owner@zephix.ai' }],
    });
    listTemplatesMock.mockResolvedValue([
      { id: 'tpl-1', name: 'Agile Delivery' },
      { id: 'tpl-2', name: 'Task Management' },
    ]);
    patchMock.mockResolvedValue({});
  });

  it('saves default template and allowlist inheritance fields', async () => {
    render(
      <GeneralTab
        workspaceId="ws-1"
        workspace={{
          name: 'Engineering',
          description: 'Workspace',
          ownerId: 'owner-1',
          visibility: 'public',
          defaultMethodology: 'agile',
          defaultTemplateId: null,
          inheritOrgDefaultTemplate: true,
          governanceInheritanceMode: 'ORG_DEFAULT',
          allowedTemplateIds: null,
        }}
        onUpdate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ws-settings-default-template-select')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('ws-settings-default-template-select'), {
      target: { value: 'tpl-2' },
    });
    fireEvent.click(screen.getByTestId('ws-settings-inherit-org-default-checkbox'));
    fireEvent.change(screen.getByTestId('ws-settings-governance-inheritance-select'), {
      target: { value: 'WORKSPACE_OVERRIDE' },
    });
    fireEvent.click(screen.getByTestId('ws-settings-allowed-template-tpl-1'));
    fireEvent.click(screen.getByTestId('ws-settings-general-save'));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalled();
    });

    expect(patchMock).toHaveBeenCalledWith('/workspaces/ws-1/settings', expect.objectContaining({
      defaultTemplateId: 'tpl-2',
      inheritOrgDefaultTemplate: false,
      governanceInheritanceMode: 'WORKSPACE_OVERRIDE',
      allowedTemplateIds: ['tpl-1'],
    }));
  });
});
