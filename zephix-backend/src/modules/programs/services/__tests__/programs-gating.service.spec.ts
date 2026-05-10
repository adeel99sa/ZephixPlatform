import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgramsGatingService } from '../programs-gating.service';
import { WorkspaceComplexityMode } from '../../../workspaces/entities/workspace.entity';

/**
 * B2 PR1 — ADR-B2-003 unit coverage for the Programs availability gate.
 *
 * The service is dormant in PR1 (no production caller yet); these tests
 * lock the contract before PR2 wires it into ProgramsService.create().
 */
describe('ProgramsGatingService', () => {
  const ORG = 'org-1';

  /**
   * The repo mock's findOne now matches by both id AND organizationId,
   * mirroring the production tenant-scoped query (PR2 / item 4 from
   * PR1 self-audit).
   */
  function buildService(
    rows: Array<{ id: string; organizationId: string; complexityMode: WorkspaceComplexityMode }>,
  ) {
    const repo = {
      findOne: jest.fn(async (opts: any) => {
        const { id, organizationId } = opts.where;
        return rows.find((r) => r.id === id && r.organizationId === organizationId) ?? null;
      }),
    };
    const service = new ProgramsGatingService(repo as any);
    return { service, repo };
  }

  describe('isProgramsAvailable', () => {
    it('returns true for governed-tier workspaces', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.GOVERNED },
      ]);

      await expect(service.isProgramsAvailable(ORG, 'ws-1')).resolves.toBe(true);
    });

    it('returns false for lean-tier workspaces', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.LEAN },
      ]);

      await expect(service.isProgramsAvailable(ORG, 'ws-1')).resolves.toBe(false);
    });

    it('returns false for standard-tier workspaces', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.STANDARD },
      ]);

      await expect(service.isProgramsAvailable(ORG, 'ws-1')).resolves.toBe(false);
    });

    it('returns false for legacy ADVANCED workspaces (Stage 2 backfill required)', async () => {
      // ADR-B2-003: legacy enum values are NOT auto-promoted; PR2 backfills.
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.ADVANCED },
      ]);

      await expect(service.isProgramsAvailable(ORG, 'ws-1')).resolves.toBe(false);
    });

    it('throws NotFoundException for missing workspace', async () => {
      const { service } = buildService([]);
      await expect(service.isProgramsAvailable(ORG, 'ws-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    // PR2 / item 4 from PR1 self-audit
    it('throws NotFoundException when workspace exists but in a different org (tenant scoping)', async () => {
      const { service } = buildService([
        // Row exists, but in org-2 — query from org-1 must not see it.
        { id: 'ws-cross', organizationId: 'org-2', complexityMode: WorkspaceComplexityMode.GOVERNED },
      ]);
      await expect(service.isProgramsAvailable('org-1', 'ws-cross')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertProgramsAvailable', () => {
    it('resolves silently for governed-tier workspaces', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.GOVERNED },
      ]);

      await expect(
        service.assertProgramsAvailable(ORG, 'ws-1'),
      ).resolves.toBeUndefined();
    });

    it('throws Forbidden(PROGRAMS_NOT_AVAILABLE_FOR_TIER) for lean tier', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.LEAN },
      ]);

      await expect(service.assertProgramsAvailable(ORG, 'ws-1')).rejects.toMatchObject(
        {
          response: expect.objectContaining({
            code: 'PROGRAMS_NOT_AVAILABLE_FOR_TIER',
            currentMode: WorkspaceComplexityMode.LEAN,
            requiredMode: WorkspaceComplexityMode.GOVERNED,
          }),
        },
      );
    });

    it('throws Forbidden for standard tier', async () => {
      const { service } = buildService([
        { id: 'ws-1', organizationId: ORG, complexityMode: WorkspaceComplexityMode.STANDARD },
      ]);

      await expect(service.assertProgramsAvailable(ORG, 'ws-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for missing workspace', async () => {
      const { service } = buildService([]);
      await expect(
        service.assertProgramsAvailable(ORG, 'ws-missing'),
      ).rejects.toThrow(NotFoundException);
    });

    // PR2 / item 4 from PR1 self-audit
    it('throws NotFoundException for cross-tenant workspace probe', async () => {
      const { service } = buildService([
        { id: 'ws-cross', organizationId: 'org-2', complexityMode: WorkspaceComplexityMode.GOVERNED },
      ]);
      await expect(
        service.assertProgramsAvailable('org-1', 'ws-cross'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
