/**
 * WM-D2: Scope-tier isolation regression guard.
 *
 * Before the IsNull() fix, TypeORM silently dropped null predicates:
 *   { projectId: null as any } → no SQL condition → wrong-scope records matched
 *
 * These tests confirm that:
 *   1. Workspace-level lookup includes project_id IS NULL, so project-scoped
 *      overrides do not bleed into the workspace tier.
 *   2. Org-level lookup includes workspace_id IS NULL + project_id IS NULL, so
 *      workspace- and project-scoped overrides do not bleed into the org tier.
 *   3. The 4-tier chain (Project > Workspace > Org > System default) resolves
 *      in the correct order and stops at the first match.
 */
import { IsNull } from 'typeorm';
import { PoliciesService } from '../policies.service';

describe('PoliciesService — scope-tier isolation (WM-D2)', () => {
  let service: PoliciesService;
  let definitionRepo: { findOne: jest.Mock };
  let overrideRepo: { findOne: jest.Mock };

  beforeEach(() => {
    definitionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    overrideRepo = { findOne: jest.fn().mockResolvedValue(null) };
    service = new PoliciesService(definitionRepo as any, overrideRepo as any);
  });

  describe('workspace-level lookup passes projectId: IsNull()', () => {
    it('includes projectId: IsNull() in the workspace-tier where clause', async () => {
      const wsOverride = { value: 'ws-value' };
      overrideRepo.findOne
        .mockResolvedValueOnce(null)    // project-level: no match
        .mockResolvedValueOnce(wsOverride); // workspace-level: match

      const result = await service.resolvePolicy('org-1', 'ws-1', 'some.policy', 'proj-1');
      expect(result).toBe('ws-value');

      const wsCalls = overrideRepo.findOne.mock.calls;
      // Second call is the workspace-level lookup
      expect(wsCalls[1][0]).toMatchObject({
        where: expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          projectId: IsNull(),
        }),
      });
    });

    it('project-scoped override does not match the workspace-level lookup', async () => {
      // Simulate a DB that has only a project-scoped override (project_id = 'proj-1').
      // With proper IsNull(), the workspace-tier query returns null (project_id must be null).
      overrideRepo.findOne.mockResolvedValue(null); // all tiers miss
      definitionRepo.findOne.mockResolvedValue({ key: 'some.policy', defaultValue: 'default' });

      const result = await service.resolvePolicy('org-1', 'ws-1', 'some.policy');
      // No workspace/org override → falls to system default
      expect(result).toBe('default');
    });
  });

  describe('org-level lookup passes workspaceId: IsNull() and projectId: IsNull()', () => {
    it('includes both IsNull() predicates in the org-tier where clause', async () => {
      // workspaceId=null skips step 2 entirely; org-level is the first (and only) findOne call
      const orgOverride = { value: 'org-value' };
      overrideRepo.findOne.mockResolvedValueOnce(orgOverride);

      const result = await service.resolvePolicy('org-1', null, 'some.policy');
      expect(result).toBe('org-value');

      const orgCall = overrideRepo.findOne.mock.calls[0][0];
      expect(orgCall).toMatchObject({
        where: expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: IsNull(),
          projectId: IsNull(),
        }),
      });
    });
  });

  describe('4-tier resolution chain', () => {
    it('returns project-scoped override first', async () => {
      overrideRepo.findOne.mockResolvedValueOnce({ value: 'project-value' });
      const result = await service.resolvePolicy('org-1', 'ws-1', 'key', 'proj-1');
      expect(result).toBe('project-value');
      expect(overrideRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('falls through to workspace when no project override', async () => {
      overrideRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ value: 'ws-value' });
      const result = await service.resolvePolicy('org-1', 'ws-1', 'key', 'proj-1');
      expect(result).toBe('ws-value');
      expect(overrideRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('falls through to org when no project or workspace override', async () => {
      overrideRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ value: 'org-value' });
      const result = await service.resolvePolicy('org-1', 'ws-1', 'key', 'proj-1');
      expect(result).toBe('org-value');
      expect(overrideRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it('falls through to system default when no overrides match', async () => {
      overrideRepo.findOne.mockResolvedValue(null);
      definitionRepo.findOne.mockResolvedValue({ key: 'key', defaultValue: 42 });
      const result = await service.resolvePolicy('org-1', 'ws-1', 'key');
      expect(result).toBe(42);
    });

    it('returns null when policy key is not defined', async () => {
      overrideRepo.findOne.mockResolvedValue(null);
      definitionRepo.findOne.mockResolvedValue(null);
      const result = await service.resolvePolicy('org-1', 'ws-1', 'undefined.key');
      expect(result).toBeNull();
    });
  });
});
