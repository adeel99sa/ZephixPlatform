import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditOrgMemberDialog } from '../EditOrgMemberDialog';

describe('EditOrgMemberDialog — last admin deactivate', () => {
  it('disables deactivate button and does not call handler when blocked', async () => {
    const onDeactivate = vi.fn();
    const user = userEvent.setup();

    render(
      <EditOrgMemberDialog
        member={{
          id: 'u1',
          name: 'Only Admin',
          email: 'a@b.com',
          status: 'active',
          role: 'admin',
          platformRole: 'admin',
          teams: [],
          workspaceAccess: [],
          isOwner: false,
        }}
        isOpen
        onClose={vi.fn()}
        dropdownRole="admin"
        roleDisabled
        roleDisabledReason="Cannot demote"
        deactivateBlocked
        deactivateBlockedReason="Cannot deactivate — last organization admin."
        onRoleChange={vi.fn()}
        onDeactivate={onDeactivate}
      />,
    );

    const deactivate = screen.getByRole('button', { name: /deactivate access/i });
    expect(deactivate).toBeDisabled();
    await user.click(deactivate);
    expect(onDeactivate).not.toHaveBeenCalled();
  });
});
