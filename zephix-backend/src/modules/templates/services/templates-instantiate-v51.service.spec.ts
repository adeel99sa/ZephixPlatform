import { TemplatesInstantiateV51Service } from './templates-instantiate-v51.service';
import { ProjectState } from '../../projects/entities/project.entity';

describe('TemplatesInstantiateV51Service risk presets', () => {
  const template = {
    id: 'tpl-1',
    templateScope: 'SYSTEM',
    organizationId: null,
    workspaceId: null,
    methodology: 'waterfall',
    defaultEnabledKPIs: [],
    defaultGovernanceFlags: {},
    metadata: null,
    version: 1,
    phases: [
      {
        name: 'Plan',
        order: 0,
        estimatedDurationDays: 5,
      },
    ],
    taskTemplates: [],
    riskPresets: [
      {
        id: 'risk-preset-1',
        title: 'Compliance risk',
        description: 'Controls may not pass review',
        category: 'compliance',
        severity: 'critical',
        tags: ['audit'],
      },
    ],
  };

  function createManager(overrides: Partial<Record<string, any>> = {}) {
    const project = {
      id: 'project-1',
      name: 'New Project',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      state: ProjectState.DRAFT,
      structureLocked: false,
      templateId: null,
      activeKpiIds: [],
    };
    const projectRepo = {
      create: jest.fn((data) => ({ ...project, ...data })),
      save: jest.fn(async (entity) => ({ ...project, ...entity })),
      findOne: jest.fn(),
    };
    const templateRepo = {
      findOne: jest.fn().mockResolvedValue(overrides.template ?? template),
    };
    const workspaceRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'ws-1', organizationId: 'org-1' }),
    };
    const phaseRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: `phase-${data.sortOrder}`, ...data })),
      save: jest.fn(async (entity) => entity),
    };
    const taskRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => ({ id: `task-${data.rank}`, ...data })),
      save: jest.fn(async (entity) => entity),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        const name = entity?.name;
        if (name === 'Template') return templateRepo;
        if (name === 'Project') return projectRepo;
        if (name === 'Workspace') return workspaceRepo;
        if (name === 'WorkPhase') return phaseRepo;
        if (name === 'WorkTask') return taskRepo;
        return {};
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    return { manager, projectRepo, templateRepo, phaseRepo, taskRepo };
  }

  function createService(overrides: { createSystemRisk?: jest.Mock } = {}) {
    const workRisksService = {
      createSystemRisk:
        overrides.createSystemRisk ??
        jest.fn().mockResolvedValue({ id: 'risk-1' }),
    };
    const managerBundle = createManager();
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(managerBundle.manager)),
    };
    const service = new TemplatesInstantiateV51Service(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      { canAccessWorkspace: jest.fn().mockResolvedValue(true) } as any,
      {} as any,
      { invalidateCache: jest.fn() } as any,
      {
        snapshotTemplateGovernanceToProject: jest
          .fn()
          .mockResolvedValue(undefined),
      } as any,
      workRisksService as any,
    );

    return { service, workRisksService, dataSource, managerBundle };
  }

  it('creates canonical work risks for template risk presets in the transaction', async () => {
    const { service, workRisksService, managerBundle } = createService();

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'New Project' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(workRisksService.createSystemRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'project-1',
        source: 'template_preset',
        riskType: 'compliance',
        title: 'Compliance risk',
        severity: 'CRITICAL',
        evidence: expect.objectContaining({
          presetId: 'risk-preset-1',
          templateId: 'tpl-1',
          tags: ['audit'],
        }),
      }),
      managerBundle.manager,
    );
  });

  it('skips malformed risk presets and still completes instantiation', async () => {
    const { service, workRisksService, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      riskPresets: [{ id: 'bad-preset', severity: 'high' }],
    });

    const result = await service.instantiateV51(
      'tpl-1',
      { projectName: 'New Project' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(result.projectId).toBe('project-1');
    expect(workRisksService.createSystemRisk).not.toHaveBeenCalled();
  });

  it('logs and continues when a risk preset create fails', async () => {
    const createSystemRisk = jest
      .fn()
      .mockRejectedValue(new Error('risk failed'));
    const { service } = createService({ createSystemRisk });

    const result = await service.instantiateV51(
      'tpl-1',
      { projectName: 'New Project' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(result.projectId).toBe('project-1');
    expect(createSystemRisk).toHaveBeenCalled();
  });
});
