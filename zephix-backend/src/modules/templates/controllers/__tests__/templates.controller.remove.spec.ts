import { ForbiddenException } from '@nestjs/common';
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
 * MP-2b — DELETE /api/templates/:id must archive on the canonical `templates`
 * store via archiveUnified(). The legacy archive() queried the tombstoned
 * ProjectTemplate entity (`project_templates`), whose mapped
 * `default_workspace_visibility` column is absent from the DB, 500ing on the
 * SELECT before it could resolve the row. remove() must NOT touch that path.
 */
describe('TemplatesController.remove (DELETE /templates/:id) — MP-2b', () => {
  let controller: TemplatesController;
  let templatesService: {
    archiveUnified: jest.Mock;
    archive: jest.Mock;
  };
  const USER = { id: 'u-1', organizationId: 'org-1' } as any;

  beforeEach(async () => {
    templatesService = {
      archiveUnified: jest.fn().mockResolvedValue(undefined),
      // Legacy ProjectTemplate path — must remain untouched by remove().
      archive: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: templatesService },
        { provide: TemplatesInstantiateV51Service, useValue: {} },
        { provide: TemplatesRecommendationService, useValue: {} },
        { provide: TemplatesPreviewV51Service, useValue: {} },
        { provide: ResponseService, useValue: {} },
        {
          provide: WorkspaceRoleGuardService,
          useValue: { requireWorkspaceWrite: jest.fn() },
        },
        { provide: getDataSourceToken(), useValue: {} },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  it('archives an ORG template via the canonical archiveUnified, not the legacy path', async () => {
    await controller.remove('org-tpl-1', USER);

    expect(templatesService.archiveUnified).toHaveBeenCalledWith(
      'org-tpl-1',
      'org-1',
    );
    expect(templatesService.archive).not.toHaveBeenCalled();
  });

  it('propagates ForbiddenException for SYSTEM templates (archiveUnified guards them)', async () => {
    templatesService.archiveUnified.mockRejectedValueOnce(
      new ForbiddenException('Cannot archive system templates'),
    );

    await expect(controller.remove('sys-tpl-1', USER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('always passes the caller organizationId from the JWT', async () => {
    await controller.remove('x', USER);
    expect(templatesService.archiveUnified).toHaveBeenCalledWith('x', 'org-1');
  });
});
