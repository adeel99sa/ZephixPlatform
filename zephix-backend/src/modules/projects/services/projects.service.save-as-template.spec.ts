import { BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Template } from '../../templates/entities/template.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { ProjectStatus as ProjectStatusEntity } from '../../work-management/entities/project-status.entity';
import { ProjectAttributeDefinition } from '../../attributes/entities/project-attribute-definition.entity';
import { TemplateAttributeDefinition } from '../../attributes/entities/template-attribute-definition.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';

/**
 * TC-B1 — saveProjectAsTemplate scope + metadata corrections.
 * TC-B3 — write-path symmetry: statuses (status_groups), attributes
 * (template_attribute_definitions), governance (capabilities + flags +
 * rule-set capture), and ORG-scope name-collision suffixing.
 */
const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

function buildService(opts: {
  onSaved: (entity: any) => void;
  sourceTask?: Partial<WorkTask>;
  statuses?: any[];
  attrs?: any[];
  phases?: any[];
  gateDefs?: any[];
  projectOverrides?: Record<string, any>;
  existingTemplateNames?: string[];
  captureTad?: (rows: any[]) => void;
  captureGovernance?: (args: any) => void;
}) {
  const project = {
    id: 'proj-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    name: 'Alpha',
    description: 'src desc',
    methodology: 'agile',
    activeKpiIds: [],
    capabilities: { use_iterations: true },
    iterationsEnabled: true,
    costTrackingEnabled: false,
    baselinesEnabled: false,
    earnedValueEnabled: false,
    capacityEnabled: false,
    changeManagementEnabled: true,
    waterfallEnabled: false,
    ...(opts.projectOverrides ?? {}),
  };

  const sourceTask = {
    id: 'task-1',
    title: 'Do the thing',
    description: 'task desc',
    estimateHours: 3,
    phaseId: null,
    priority: 'HIGH',
    assigneeUserId: 'user-should-not-leak',
    ...(opts.sourceTask ?? {}),
  } as unknown as WorkTask;

  const templateRepo = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (d: any) => {
      opts.onSaved(d);
      return { id: 'tpl-1', createdAt: new Date(), ...d };
    }),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue(
          (opts.existingTemplateNames ?? []).map((name) => ({ name })),
        ),
    })),
  };

  const tadRepo = {
    save: jest.fn(async (rows: any[]) => {
      opts.captureTad?.(rows);
      return rows;
    }),
  };

  const routeRepo = (entity: unknown) => {
    if (entity === WorkPhase)
      return { find: jest.fn(async () => opts.phases ?? []) };
    if (entity === WorkTask) return { find: jest.fn(async () => [sourceTask]) };
    if (entity === ProjectStatusEntity)
      return { find: jest.fn(async () => opts.statuses ?? []) };
    if (entity === ProjectAttributeDefinition)
      return { find: jest.fn(async () => opts.attrs ?? []) };
    if (entity === PhaseGateDefinition)
      return { find: jest.fn(async () => opts.gateDefs ?? []) };
    if (entity === TemplateAttributeDefinition) return tadRepo;
    if (entity === Template) return templateRepo;
    return {};
  };

  const dataSource = {
    getRepository: jest.fn(routeRepo),
    query: jest.fn(async () => [{ methodology_config: null }]),
    transaction: jest.fn(async (fn: any) =>
      fn({ getRepository: jest.fn(routeRepo) }),
    ),
  } as unknown as DataSource;

  const governanceTemplateService = {
    snapshotProjectGovernanceToTemplate: jest.fn(async (_m, args, tplId) => {
      opts.captureGovernance?.({ args, tplId });
    }),
  };

  const service = new ProjectsService(
    { findOne: jest.fn(async () => project) } as unknown as Repository<Project>,
    {} as Repository<Workspace>,
    {} as any,
    dataSource,
    {
      runWithTenant: jest.fn(async (_t: any, fn: any) => fn()),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService,
    {} as ConfigService,
    { canAccessWorkspace: jest.fn() } as unknown as WorkspaceAccessService,
    { assertWithinLimit: jest.fn() } as any,
    mockAuditService as any,
    { getWorkspaceRole: jest.fn() } as any,
    undefined, // domainEventEmitter
    undefined, // methodologyConfigSync
    undefined, // methodologyConfigValidator
    undefined, // methodologyConstraints
    undefined, // changeRequestRepo
    undefined, // orgPolicyService
    governanceTemplateService as any, // TC-B3 governanceTemplateService
  );

  return { service, governanceTemplateService };
}

describe('ProjectsService.saveProjectAsTemplate — TC-B1 + TC-B3', () => {
  it('defaults category to custom, sets ORG scope, omits version, strips people fields', async () => {
    let saved: any;
    const { service } = buildService({ onSaved: (e) => (saved = e) });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
      name: 'My Template',
    });

    expect(saved.category).toBe('custom');
    expect(saved.templateScope).toBe('ORG');
    expect(saved.version).toBeUndefined();

    const blob = JSON.stringify(saved).toLowerCase();
    expect(blob).not.toContain('assigneeuserid');
    expect(blob).not.toContain('user-should-not-leak');
    expect(blob).not.toContain('team_member_ids');
    expect(blob).not.toContain('projectmanagerid');
    expect(saved.taskTemplates).toHaveLength(1);
    expect(saved.taskTemplates[0]).not.toHaveProperty('assigneeUserId');
  });

  it('accepts a valid catalog category; rejects an invalid one', async () => {
    let saved: any;
    const { service } = buildService({ onSaved: (e) => (saved = e) });
    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
      name: 'T',
      category: 'Software Development',
    });
    expect(saved.category).toBe('Software Development');

    const { service: s2 } = buildService({ onSaved: () => undefined });
    await expect(
      s2.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
        name: 'T',
        category: 'Not A Real Category',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── TC-B3 write-path symmetry ────────────────────────────────────────
  it('TC-B3 statuses: serializes project_statuses into status_groups', async () => {
    let saved: any;
    const { service } = buildService({
      onSaved: (e) => (saved = e),
      statuses: [
        {
          statusKey: 'UAT_SIGNED_OFF',
          displayName: 'UAT Signed Off',
          color: '#3B6D11',
          order: 7,
          bucket: 'done',
          isDefault: false,
        },
      ],
    });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {});

    expect(saved.statusGroups).toHaveLength(1);
    expect(saved.statusGroups[0]).toEqual({
      statusKey: 'UAT_SIGNED_OFF',
      displayName: 'UAT Signed Off',
      color: '#3B6D11',
      order: 7,
      bucket: 'done',
      isDefault: false,
    });
  });

  it('TC-B3 statuses: NULL status_groups when the project has none', async () => {
    let saved: any;
    const { service } = buildService({ onSaved: (e) => (saved = e), statuses: [] });
    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {});
    expect(saved.statusGroups).toBeNull();
  });

  it('TC-B3 attributes: mirrors project_attribute_definitions → template_attribute_definitions', async () => {
    let tad: any[] = [];
    const { service } = buildService({
      onSaved: () => undefined,
      attrs: [
        { attributeDefinitionId: 'def-1', locked: true, displayOrder: 2 },
      ],
      captureTad: (rows) => (tad = rows),
    });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {});

    expect(tad).toHaveLength(1);
    expect(tad[0]).toEqual({
      templateId: 'tpl-1',
      attributeDefinitionId: 'def-1',
      locked: true,
      displayOrder: 2,
    });
  });

  it('TC-B3 governance: captures capabilities + flags on the row and snapshots rule sets', async () => {
    let saved: any;
    let gov: any;
    const { service, governanceTemplateService } = buildService({
      onSaved: (e) => (saved = e),
      captureGovernance: (a) => (gov = a),
    });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {});

    // capabilities verbatim + reconstructed defaultGovernanceFlags.
    expect(saved.capabilities).toEqual({ use_iterations: true });
    expect(saved.defaultGovernanceFlags).toEqual({
      iterationsEnabled: true,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: true,
      waterfallEnabled: false,
    });
    // rule-set snapshot invoked with the source project + new template id.
    expect(
      governanceTemplateService.snapshotProjectGovernanceToTemplate,
    ).toHaveBeenCalledTimes(1);
    expect(gov.tplId).toBe('tpl-1');
    expect(gov.args).toEqual({
      projectId: 'proj-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
    });
  });

  it('TC-B4 gateKeys: serializes phase gate definitions into template phase defs', async () => {
    let saved: any;
    const { service } = buildService({
      onSaved: (e) => (saved = e),
      phases: [
        { id: 'ph-1', name: 'Initiation' },
        { id: 'ph-2', name: 'Planning' },
      ],
      gateDefs: [
        { phaseId: 'ph-1', gateKey: 'platform.gate.init-to-plan' },
        // ph-2 has no gate def
      ],
    });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {});

    expect(saved.phases).toHaveLength(2);
    expect(saved.phases[0].gateKey).toBe('platform.gate.init-to-plan');
    expect(saved.phases[1].gateKey).toBeUndefined();
  });

  it('TC-B3 collision: ORG-scope name is deterministically suffixed', async () => {
    let saved: any;
    const { service } = buildService({
      onSaved: (e) => (saved = e),
      existingTemplateNames: ['Sprint Template'],
    });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
      name: 'Sprint Template',
    });

    expect(saved.name).toBe('Sprint Template (2)');
  });
});
