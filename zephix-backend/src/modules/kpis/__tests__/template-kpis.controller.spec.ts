import { Test, TestingModule } from '@nestjs/testing';
import { TemplateKpisController } from '../controllers/template-kpis.controller';
import { TemplateKpisService } from '../services/template-kpis.service';

describe('TemplateKpisController', () => {
  let controller: TemplateKpisController;
  let mockService: any;

  const TEMPLATE_ID = '00000000-0000-0000-0000-000000000010';
  const KPI_DEF_ID = '00000000-0000-0000-0000-000000000020';

  const mockReq = {
    user: {
      userId: 'user-1',
      organizationId: 'org-1',
      platformRole: 'admin',
    },
  };

  beforeEach(async () => {
    mockService = {
      listTemplateKpis: jest.fn().mockResolvedValue([]),
      assignKpiToTemplate: jest.fn().mockResolvedValue({ id: 'tk-1' }),
      removeTemplateKpi: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateKpisController],
      providers: [
        { provide: TemplateKpisService, useValue: mockService },
      ],
    }).compile();

    controller = module.get(TemplateKpisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/templates/:templateId/kpis', () => {
    it('lists template KPIs', async () => {
      const result = await controller.list(TEMPLATE_ID, mockReq);
      expect(result).toEqual({ data: [] });
      expect(mockService.listTemplateKpis).toHaveBeenCalledWith(TEMPLATE_ID);
    });
  });

  describe('POST /admin/templates/:templateId/kpis', () => {
    it('assigns a KPI to template', async () => {
      const dto = { kpiDefinitionId: KPI_DEF_ID, isRequired: true };
      const result = await controller.assign(TEMPLATE_ID, dto as any, mockReq);
      expect(result).toEqual({ data: { id: 'tk-1' } });
      expect(mockService.assignKpiToTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
        expect.objectContaining({ kpiDefinitionId: KPI_DEF_ID, isRequired: true }),
      );
    });
  });

  describe('DELETE /admin/templates/:templateId/kpis/:kpiDefinitionId', () => {
    it('removes a KPI from template', async () => {
      const result = await controller.remove(TEMPLATE_ID, KPI_DEF_ID, mockReq);
      expect(result).toEqual({ message: 'OK' });
      expect(mockService.removeTemplateKpi).toHaveBeenCalledWith(TEMPLATE_ID, KPI_DEF_ID);
    });
  });
});
