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

/**
 * TC-B1 — saveProjectAsTemplate scope + metadata corrections.
 *
 * Covers: category validated against the five catalog categories (default
 * 'custom' when absent, 400 when invalid); templateScope promoted to ORG;
 * version no longer hardcoded (entity default owns it); and the snapshot
 * payload carries NO people fields (assignees / team_member_ids /
 * projectManagerId) even when the source task has an assignee.
 */
const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

function buildService(opts: {
  onSaved: (entity: any) => void;
  sourceTask?: Partial<WorkTask>;
}) {
  const project = {
    id: 'proj-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    name: 'Alpha',
    description: 'src desc',
    methodology: 'agile',
    activeKpiIds: [],
  };

  const sourceTask = {
    id: 'task-1',
    title: 'Do the thing',
    description: 'task desc',
    estimateHours: 3,
    phaseId: null,
    priority: 'HIGH',
    // A people field on the SOURCE that must never reach the snapshot.
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
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const projectRepository = {
    findOne: jest.fn(async () => project),
  } as unknown as Repository<Project>;

  const dataSource = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === WorkPhase) return { find: jest.fn(async () => []) };
      if (entity === WorkTask)
        return { find: jest.fn(async () => [sourceTask]) };
      if (entity === Template) return templateRepo;
      return {};
    }),
    query: jest.fn(async () => [{ methodology_config: null }]),
  } as unknown as DataSource;

  const service = new ProjectsService(
    projectRepository,
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
  );

  return service;
}

describe('ProjectsService.saveProjectAsTemplate — TC-B1', () => {
  it('defaults category to custom, sets ORG scope, omits version, and strips people fields', async () => {
    let saved: any;
    const service = buildService({ onSaved: (e) => (saved = e) });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
      name: 'My Template',
    });

    expect(saved.category).toBe('custom');
    expect(saved.templateScope).toBe('ORG');
    // version is not hardcoded — entity default (1) owns it.
    expect(saved.version).toBeUndefined();

    // No people fields anywhere in the snapshot payload.
    const blob = JSON.stringify(saved).toLowerCase();
    expect(blob).not.toContain('assigneeuserid');
    expect(blob).not.toContain('user-should-not-leak');
    expect(blob).not.toContain('team_member_ids');
    expect(blob).not.toContain('teammemberids');
    expect(blob).not.toContain('projectmanagerid');
    // The one task made it in, but only its shape — not its assignee.
    expect(saved.taskTemplates).toHaveLength(1);
    expect(saved.taskTemplates[0]).not.toHaveProperty('assigneeUserId');
  });

  it('accepts a valid catalog category', async () => {
    let saved: any;
    const service = buildService({ onSaved: (e) => (saved = e) });

    await service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
      name: 'T',
      category: 'Software Development',
    });

    expect(saved.category).toBe('Software Development');
  });

  it('rejects an invalid category with 400', async () => {
    const service = buildService({ onSaved: () => undefined });

    await expect(
      service.saveProjectAsTemplate('proj-1', 'org-1', 'admin-1', {
        name: 'T',
        category: 'Not A Real Category',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
