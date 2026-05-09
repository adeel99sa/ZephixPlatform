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
  function buildService(
    workspace: { id: string; complexityMode: WorkspaceComplexityMode } | null,
  ) {
    const repo = {
      findOne: jest.fn(async () => workspace),
    };
    const service = new ProgramsGatingService(repo as any);
    return { service, repo };
  }

  describe('isProgramsAvailable', () => {
    it('returns true for governed-tier workspaces', async () => {
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.GOVERNED,
      });

      await expect(service.isProgramsAvailable('ws-1')).resolves.toBe(true);
    });

    it('returns false for lean-tier workspaces', async () => {
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.LEAN,
      });

      await expect(service.isProgramsAvailable('ws-1')).resolves.toBe(false);
    });

    it('returns false for standard-tier workspaces', async () => {
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.STANDARD,
      });

      await expect(service.isProgramsAvailable('ws-1')).resolves.toBe(false);
    });

    it('returns false for legacy ADVANCED workspaces (Stage 2 backfill required)', async () => {
      // ADR-B2-003: legacy enum values are NOT auto-promoted; PR2 backfills.
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.ADVANCED,
      });

      await expect(service.isProgramsAvailable('ws-1')).resolves.toBe(false);
    });

    it('throws NotFoundException for missing workspace', async () => {
      const { service } = buildService(null);
      await expect(service.isProgramsAvailable('ws-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertProgramsAvailable', () => {
    it('resolves silently for governed-tier workspaces', async () => {
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.GOVERNED,
      });

      await expect(
        service.assertProgramsAvailable('ws-1'),
      ).resolves.toBeUndefined();
    });

    it('throws Forbidden(PROGRAMS_NOT_AVAILABLE_FOR_TIER) for lean tier', async () => {
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.LEAN,
      });

      await expect(service.assertProgramsAvailable('ws-1')).rejects.toMatchObject(
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
      const { service } = buildService({
        id: 'ws-1',
        complexityMode: WorkspaceComplexityMode.STANDARD,
      });

      await expect(service.assertProgramsAvailable('ws-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for missing workspace', async () => {
      const { service } = buildService(null);
      await expect(
        service.assertProgramsAvailable('ws-missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
