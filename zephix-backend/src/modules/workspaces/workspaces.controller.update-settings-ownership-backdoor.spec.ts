import { WorkspacesController } from './workspaces.controller';

/**
 * Regression guard for the PATCH /:id/settings ownership-write backdoor.
 *
 * Background: the handler used to accept ownerId in its inline body type and
 * forward it through svc.update(), allowing any caller with the
 * edit_workspace_settings permission to reassign workspace ownership. The
 * canonical path is POST /:id/change-owner (RequireOrgRole(PlatformRole.ADMIN)).
 *
 * This test calls the handler with a body that still carries ownerId (as a
 * stale or malicious client might) and asserts that the value never reaches
 * the service layer. tsc rejects the field at compile time inside our own
 * code; this test covers the runtime path for clients we don't control.
 */
describe('WorkspacesController.updateSettings — ownership backdoor regression', () => {
  function buildController(overrides: { update?: jest.Mock } = {}) {
    const update = overrides.update ?? jest.fn().mockResolvedValue({
      id: 'ws-1',
      name: 'WS',
      ownerId: 'original-owner',
    });
    const svc = { update } as any;
    return {
      ctrl: new WorkspacesController(
        svc,
        {} as any, // members
        {} as any, // policy
        {} as any, // accessService
        {} as any, // riskScoreService
        {} as any, // responseService
        {} as any, // inviteService
        {} as any, // workspaceHealthService
        {} as any, // tenantContextService
        {} as any, // notificationDispatch
        {} as any, // auditService
      ),
      update,
    };
  }

  it('drops ownerId from the body and never forwards it to svc.update', async () => {
    const { ctrl, update } = buildController();
    const dtoWithOwnerIdBackdoor = {
      name: 'New name',
      description: 'd',
      visibility: 'public',
      defaultMethodology: 'agile',
      // Stale client still sending ownerId. The handler must ignore it.
      ownerId: 'attacker-target-user-id',
    } as any;

    await ctrl.updateSettings(
      'ws-1',
      dtoWithOwnerIdBackdoor,
      { id: 'u1', organizationId: 'o1' } as any,
    );

    expect(update).toHaveBeenCalledTimes(1);
    const [, , updates] = update.mock.calls[0];
    expect(updates).not.toHaveProperty('ownerId');
    // Sibling fields still flow as expected.
    expect(updates.name).toBe('New name');
    expect(updates.description).toBe('d');
    expect(updates.isPrivate).toBe(false);
    expect(updates.defaultMethodology).toBe('agile');
  });

  it('still forwards permitted settings fields when ownerId is absent', async () => {
    const { ctrl, update } = buildController();

    await ctrl.updateSettings(
      'ws-1',
      {
        name: 'WS Renamed',
        visibility: 'private',
        permissionsConfig: { manage_workspace_members: ['workspace_owner'] },
      } as any,
      { id: 'u1', organizationId: 'o1' } as any,
    );

    expect(update).toHaveBeenCalledTimes(1);
    const [, , updates] = update.mock.calls[0];
    expect(updates).not.toHaveProperty('ownerId');
    expect(updates.name).toBe('WS Renamed');
    expect(updates.isPrivate).toBe(true);
    expect(updates.permissionsConfig).toEqual({
      manage_workspace_members: ['workspace_owner'],
    });
  });
});
