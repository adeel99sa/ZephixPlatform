import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { TemplatesController } from '../templates.controller';
import { TemplatesService } from '../../services/templates.service';
import { TemplatesInstantiateV51Service } from '../../services/templates-instantiate-v51.service';
import { TemplatesRecommendationService } from '../../services/templates-recommendation.service';
import { TemplatesPreviewV51Service } from '../../services/templates-preview-v51.service';
import { ResponseService } from '../../../../shared/services/response.service';
import { WorkspaceRoleGuardService } from '../../../workspace-access/workspace-role-guard.service';

/**
 * Scope-aware authorization for POST /api/templates/:id/publish.
 *
 * Branches under test:
 *   - Template not found                                   → NotFoundException
 *   - SYSTEM scope (any user)                              → ForbiddenException
 *   - ORG scope, non-admin                                 → ForbiddenException
 *   - ORG scope, admin                                     → publishV1 invoked
 *   - WORKSPACE scope, admin (no workspace role)           → publishV1 invoked
 *   - WORKSPACE scope, non-admin, workspace_owner role     → publishV1 invoked
 *   - WORKSPACE scope, non-admin, non-owner workspace role → ForbiddenException
 *   - WORKSPACE scope, missing workspaceId, non-admin      → ForbiddenException
 */
describe('TemplatesController.publish — scope-aware authorization', () => {
  let controller: TemplatesController;
  let templatesService: { publishV1: jest.Mock };
  let workspaceRoleGuard: { getWorkspaceRole: jest.Mock };
  let responseService: { success: jest.Mock };
  let templateRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    templatesService = {
      publishV1: jest.fn().mockResolvedValue({ id: 'tmpl-1', published: true }),
    };
    workspaceRoleGuard = { getWorkspaceRole: jest.fn() };
    responseService = { success: jest.fn((d) => ({ data: d })) };
    templateRepo = { findOne: jest.fn() };

    const dataSource = {
      getRepository: jest.fn().mockReturnValue(templateRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: templatesService },
        { provide: TemplatesInstantiateV51Service, useValue: {} },
        { provide: TemplatesRecommendationService, useValue: {} },
        { provide: TemplatesPreviewV51Service, useValue: {} },
        { provide: ResponseService, useValue: responseService },
        { provide: WorkspaceRoleGuardService, useValue: workspaceRoleGuard },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  function reqAs(opts: {
    userId?: string;
    organizationId?: string;
    platformRole?: string;
  }): any {
    return {
      user: {
        id: opts.userId ?? 'u1',
        email: 'u1@example.com',
        organizationId: opts.organizationId ?? 'o1',
        platformRole: opts.platformRole,
      },
    };
  }

  it('throws NotFoundException when the template does not exist', async () => {
    templateRepo.findOne.mockResolvedValue(null);

    await expect(
      controller.publish('tmpl-missing', reqAs({ platformRole: 'ADMIN' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(templatesService.publishV1).not.toHaveBeenCalled();
  });

  it('rejects SYSTEM templates regardless of role', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'SYSTEM',
      workspaceId: null,
      isSystem: true,
    });

    await expect(
      controller.publish('t1', reqAs({ platformRole: 'ADMIN' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(templatesService.publishV1).not.toHaveBeenCalled();
  });

  it('rejects ORG-scope publish from a non-admin', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'ORG',
      workspaceId: null,
    });

    await expect(
      controller.publish('t1', reqAs({ platformRole: 'MEMBER' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(templatesService.publishV1).not.toHaveBeenCalled();
  });

  it('allows ORG-scope publish for platform ADMIN', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'ORG',
      workspaceId: null,
    });

    const result = await controller.publish(
      't1',
      reqAs({ platformRole: 'ADMIN' }),
    );

    expect(templatesService.publishV1).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { id: 'tmpl-1', published: true } });
  });

  it('allows WORKSPACE-scope publish for platform ADMIN without consulting workspace role', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'WORKSPACE',
      workspaceId: 'ws-1',
    });

    await controller.publish('t1', reqAs({ platformRole: 'ADMIN' }));

    expect(templatesService.publishV1).toHaveBeenCalledTimes(1);
    expect(workspaceRoleGuard.getWorkspaceRole).not.toHaveBeenCalled();
  });

  it('allows WORKSPACE-scope publish for the workspace_owner of the template workspace', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'WORKSPACE',
      workspaceId: 'ws-1',
    });
    workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_owner');

    await controller.publish(
      't1',
      reqAs({ userId: 'u9', platformRole: 'MEMBER' }),
    );

    expect(workspaceRoleGuard.getWorkspaceRole).toHaveBeenCalledWith(
      'ws-1',
      'u9',
    );
    expect(templatesService.publishV1).toHaveBeenCalledTimes(1);
  });

  it('rejects WORKSPACE-scope publish from a non-owner workspace member', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'WORKSPACE',
      workspaceId: 'ws-1',
    });
    workspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_member');

    await expect(
      controller.publish('t1', reqAs({ platformRole: 'MEMBER' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(templatesService.publishV1).not.toHaveBeenCalled();
  });

  it('rejects WORKSPACE-scope publish when the template is missing its workspaceId and the caller is not admin', async () => {
    templateRepo.findOne.mockResolvedValue({
      id: 't1',
      templateScope: 'WORKSPACE',
      workspaceId: null,
    });

    await expect(
      controller.publish('t1', reqAs({ platformRole: 'MEMBER' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(workspaceRoleGuard.getWorkspaceRole).not.toHaveBeenCalled();
    expect(templatesService.publishV1).not.toHaveBeenCalled();
  });
});
