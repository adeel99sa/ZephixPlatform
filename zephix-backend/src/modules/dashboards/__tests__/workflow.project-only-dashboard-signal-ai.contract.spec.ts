import { ProjectHealth } from '../../projects/entities/project.entity';
import { DashboardCardResolverService } from '../services/dashboard-card-resolver.service';
import { SignalsService } from '../../signals/services/signals.service';
import {
  SignalSeverity,
  SignalType,
} from '../../signals/entities/signal.entity';
import { AIContextBuilderService } from '../../ai/services/ai-context-builder.service';
import { AIExplanationEngineService } from '../../ai/services/ai-explanation-engine.service';
import { AIAdvisoryService } from '../../ai/services/ai-advisory.service';

describe('Project-only workflow contract (dashboard + signals + advisory)', () => {
  it('keeps project-only visibility coherent across all three layers', async () => {
    const visibleProjectId = 'project-visible';
    const hiddenProjectId = 'project-hidden';

    const workspaceAccessService = {
      getUserWorkspaceRole: jest.fn().mockResolvedValue(null),
      getProjectOnlyVisibleProjectIdsInWorkspace: jest
        .fn()
        .mockResolvedValue([visibleProjectId]),
      hasWorkspaceRoleAtLeast: jest.fn(),
    };

    const dashboardResolver = new DashboardCardResolverService(
      {} as any,
      {
        find: jest.fn().mockResolvedValue([
          {
            id: visibleProjectId,
            health: ProjectHealth.AT_RISK,
            updatedAt: new Date('2026-03-11T00:00:00.000Z'),
          },
        ]),
      } as any,
      {} as any,
      {} as any,
      workspaceAccessService as any,
    );

    const signalsService = new SignalsService(
      {
        find: jest.fn().mockResolvedValue([
          {
            id: 'sig-visible-task',
            organizationId: 'org-1',
            workspaceId: 'ws-1',
            signalType: SignalType.TASK_OVERDUE,
            severity: SignalSeverity.MEDIUM,
            message: 'visible task overdue',
            projectId: visibleProjectId,
            programId: null,
            portfolioId: null,
            detectedAt: new Date('2026-03-11T00:00:00.000Z'),
            resolvedAt: null,
            metadata: { taskId: 'task-visible', daysOverdue: 2 },
          },
          {
            id: 'sig-hidden-task',
            organizationId: 'org-1',
            workspaceId: 'ws-1',
            signalType: SignalType.TASK_OVERDUE,
            severity: SignalSeverity.MEDIUM,
            message: 'hidden task overdue',
            projectId: hiddenProjectId,
            programId: null,
            portfolioId: null,
            detectedAt: new Date('2026-03-11T00:00:00.000Z'),
            resolvedAt: null,
            metadata: { taskId: 'task-hidden', daysOverdue: 2 },
          },
          {
            id: 'sig-program-mixed',
            organizationId: 'org-1',
            workspaceId: 'ws-1',
            signalType: SignalType.PROGRAM_DELAY_RISK,
            severity: SignalSeverity.HIGH,
            message: 'Program has 2 delayed projects.',
            projectId: null,
            programId: 'program-1',
            portfolioId: null,
            detectedAt: new Date('2026-03-11T00:00:00.000Z'),
            resolvedAt: null,
            metadata: {
              projectIds: [visibleProjectId, hiddenProjectId],
              delayedProjectCount: 2,
            },
          },
        ]),
        create: jest.fn(),
        save: jest.fn(),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      workspaceAccessService as any,
    );

    const contextBuilder = new AIContextBuilderService(
      signalsService,
      workspaceAccessService as any,
      {
        find: jest.fn().mockResolvedValue([
          { id: visibleProjectId, name: 'Visible Project' },
        ]),
      } as any,
      {
        find: jest.fn().mockResolvedValue([{ id: 'program-1', name: 'Program 1' }]),
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
    );
    const advisoryService = new AIAdvisoryService(
      contextBuilder,
      new AIExplanationEngineService(),
    );

    const dashboardCard = await dashboardResolver.resolveCardData({
      cardKey: 'projects_at_risk',
      organizationId: 'org-1',
      userId: 'project-only-user',
      platformRole: 'MEMBER',
      scopeType: 'workspace',
      scopeId: 'ws-1',
    });
    const visibleSignals = await signalsService.listVisibleSignalsForWorkspace(
      'org-1',
      'ws-1',
      'project-only-user',
    );
    const advisory = await advisoryService.generateAdvisoryForWorkspace({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      userId: 'project-only-user',
      platformRole: 'MEMBER',
    });

    expect(dashboardCard.summary.primaryValue).toBe(1);
    expect((dashboardCard.displayData as any).projectIds).toEqual([visibleProjectId]);

    expect(visibleSignals.map((signal: any) => signal.id)).not.toContain('sig-hidden-task');
    const recomputedProgramSignal = visibleSignals.find(
      (signal: any) => signal.id === 'sig-program-mixed',
    ) as any;
    expect(recomputedProgramSignal.metadata.projectIds).toEqual([visibleProjectId]);
    expect(recomputedProgramSignal.metadata.delayedProjectCount).toBe(1);

    const advisoryPayload = JSON.stringify(advisory.advisories);
    expect(advisoryPayload).toContain('Visible Project');
    expect(advisoryPayload).not.toContain(hiddenProjectId);

    const programAdvisory = advisory.advisories.find(
      (item) => item.advisoryType === 'PROGRAM_DELIVERY_RISK',
    );
    expect(programAdvisory?.metadata?.explanation).toContain(
      '1 visible delayed project(s)',
    );
  });
});
