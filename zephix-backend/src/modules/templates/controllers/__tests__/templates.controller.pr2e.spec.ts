import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TemplatesController } from '../templates.controller';
import { TemplatesService } from '../../services/templates.service';
import { TemplatesInstantiateV51Service } from '../../services/templates-instantiate-v51.service';
import { TemplatesRecommendationService } from '../../services/templates-recommendation.service';
import { TemplatesPreviewV51Service } from '../../services/templates-preview-v51.service';
import { ResponseService } from '../../../../shared/services/response.service';
import { WorkspaceRoleGuardService } from '../../../workspace-access/workspace-role-guard.service';

describe('TemplatesController (PR 2E legacy route)', () => {
  let controller: TemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: {} },
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

  it('POST :id/instantiate returns 410 Gone with LEGACY_ROUTE', async () => {
    await expect(
      controller.instantiate(
        '00000000-0000-4000-8000-000000000001',
        {},
        { id: 'u1', organizationId: 'o1' },
        {} as any,
      ),
    ).rejects.toThrow(GoneException);

    try {
      await controller.instantiate(
        '00000000-0000-4000-8000-000000000001',
        {},
        { id: 'u1', organizationId: 'o1' },
        {} as any,
      );
    } catch (e) {
      expect(e).toBeInstanceOf(GoneException);
      expect((e as GoneException).getResponse()).toEqual(
        expect.objectContaining({ code: 'LEGACY_ROUTE' }),
      );
    }
  });
});
