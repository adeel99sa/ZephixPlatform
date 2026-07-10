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
      // TC-B1: usage_count atomic increment lives inside the transaction.
      increment: jest.fn().mockResolvedValue({ affected: 1 }),
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

    // Generic no-op repo for entities the instantiate flow touches but these
    // tests don't assert on (e.g. TemplateAttributeDefinition,
    // ProjectAttributeDefinition). Prevents ".find is not a function" when the
    // attribute copy-down step runs inside the transaction.
    const genericRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => d),
      count: jest.fn().mockResolvedValue(0),
      increment: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    // TC-B4: capture phase_gate_definitions creation.
    const gateRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => ({ id: 'gate-1', ...d })),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        const name = entity?.name;
        if (name === 'Template') return templateRepo;
        if (name === 'Project') return projectRepo;
        if (name === 'Workspace') return workspaceRepo;
        if (name === 'WorkPhase') return phaseRepo;
        if (name === 'WorkTask') return taskRepo;
        if (name === 'PhaseGateDefinition') return gateRepo;
        return genericRepo;
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    return { manager, projectRepo, templateRepo, phaseRepo, taskRepo, gateRepo };
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
    const projectStatusService = {
      seedFromTemplate: jest.fn().mockResolvedValue(undefined),
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
      // 12th dep: projectStatusService (seedFromTemplate runs post-transaction).
      projectStatusService as any,
    );

    return {
      service,
      workRisksService,
      dataSource,
      managerBundle,
      projectStatusService,
    };
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

  it('TC-B1: increments template usage_count once inside the transaction on success', async () => {
    const { service, managerBundle } = createService();

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'New Project' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    // Atomic column increment: increment({ id }, 'usageCount', 1) on the
    // transaction-scoped template repo.
    expect(managerBundle.templateRepo.increment).toHaveBeenCalledTimes(1);
    expect(managerBundle.templateRepo.increment).toHaveBeenCalledWith(
      { id: 'tpl-1' },
      'usageCount',
      1,
    );
  });

  it('TC-B1: does NOT increment usage_count when the template is not found (no project created)', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue(null);

    await expect(
      service.instantiateV51(
        'tpl-missing',
        { projectName: 'New Project' },
        'ws-1',
        'org-1',
        'user-1',
        'ADMIN',
      ),
    ).rejects.toThrow();

    // The transaction throws before reaching the increment — atomic with the
    // (absent) project write, so the counter is untouched.
    expect(managerBundle.templateRepo.increment).not.toHaveBeenCalled();
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

  // ── TC-B3: status resolution order (system → org status_groups → defaults) ──
  const ORG_STATUS_GROUPS = [
    {
      statusKey: 'UAT_SIGNED_OFF',
      displayName: 'UAT Signed Off',
      color: '#3B6D11',
      order: 7,
      bucket: 'done' as const,
      isDefault: false,
    },
  ];

  it('TC-B3: falls back to template.status_groups when no SYSTEM def matches', async () => {
    const { service, projectStatusService, managerBundle } = createService();
    // No templateCode → no SYSTEM def; template carries its own status_groups.
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null,
      statusGroups: ORG_STATUS_GROUPS,
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(projectStatusService.seedFromTemplate).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      ORG_STATUS_GROUPS,
    );
  });

  it('TC-B3: passes undefined (→ 7 defaults) when neither SYSTEM def nor status_groups exist', async () => {
    const { service, projectStatusService, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null,
      statusGroups: null,
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(projectStatusService.seedFromTemplate).toHaveBeenCalledWith(
      'project-1',
      'org-1',
      undefined,
    );
  });

  // ── TC-B4: instantiate creates phase_gate_definitions per gated phase ──
  it('TC-B4: creates a gate definition per phase that declares a gateKey', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null,
      phases: [
        { name: 'Initiation', order: 0, gateKey: 'platform.gate.init-to-plan' },
        { name: 'Planning', order: 1 }, // no gate → no def
      ],
      taskTemplates: [],
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    expect(managerBundle.gateRepo.save).toHaveBeenCalledTimes(1);
    expect(managerBundle.gateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'project-1',
        phaseId: 'phase-0',
        gateKey: 'platform.gate.init-to-plan',
      }),
    );
  });

  it('TC-B4: no gate definitions created when instantiation fails (template missing) — transactional', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue(null);

    await expect(
      service.instantiateV51(
        'missing',
        { projectName: 'P' },
        'ws-1',
        'org-1',
        'user-1',
        'ADMIN',
      ),
    ).rejects.toThrow();

    expect(managerBundle.gateRepo.save).not.toHaveBeenCalled();
  });

  // ── TC-B5: views + tags materialization ──────────────────────────────
  it('TC-B5 views: materializes template default_tabs + defaultView onto project.columnConfig', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null, // org/custom → no SYSTEM def match
      defaultTabs: ['overview', 'board'],
      columnConfig: { defaultView: 'board' },
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    const created = managerBundle.projectRepo.create.mock.calls[0][0];
    expect(created.columnConfig.visibleTabs).toEqual(['overview', 'board']);
    expect(created.columnConfig.defaultView).toBe('board');
  });

  it('TC-B5 views: absence of config falls back to the four-tab default (no regression)', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null,
      defaultTabs: null,
      columnConfig: null,
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    const created = managerBundle.projectRepo.create.mock.calls[0][0];
    expect(created.columnConfig.visibleTabs).toEqual([
      'overview',
      'tasks',
      'board',
      'documents',
    ]);
    expect(created.columnConfig.defaultView).toBeUndefined();
  });

  it('TC-B5 tags: materializes template task tags onto work_tasks.tags', async () => {
    const { service, managerBundle } = createService();
    managerBundle.templateRepo.findOne.mockResolvedValue({
      ...template,
      templateCode: null,
      phases: [{ name: 'P', order: 0 }],
      taskTemplates: [{ name: 'Tagged task', phaseOrder: 0, tags: ['client', 'p0'] }],
    });

    await service.instantiateV51(
      'tpl-1',
      { projectName: 'P' },
      'ws-1',
      'org-1',
      'user-1',
      'ADMIN',
    );

    const taskArg = managerBundle.taskRepo.create.mock.calls[0][0];
    expect(taskArg.title).toBe('Tagged task');
    expect(taskArg.tags).toEqual(['client', 'p0']);
  });
});
