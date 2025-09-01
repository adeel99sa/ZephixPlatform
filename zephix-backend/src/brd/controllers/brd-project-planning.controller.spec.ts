import { Test, TestingModule } from '@nestjs/testing';
import { BRDProjectPlanningController } from './brd-project-planning.controller';
import { BRDAnalysisService } from '../services/brd-analysis.service';
import { BRDService } from '../services/brd.service';
import { ProjectMethodology } from '../entities/generated-project-plan.entity';
import { BRDAnalysis } from '../entities/brd-analysis.entity';
import { GeneratedProjectPlan } from '../entities/generated-project-plan.entity';
import { BRD } from '../entities/brd.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';

// Mock the guards
const mockJwtAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockOrganizationGuard = {
  canActivate: jest.fn(() => true),
};

describe('BRDProjectPlanningController', () => {
  let controller: BRDProjectPlanningController;
  let brdAnalysisService: jest.Mocked<BRDAnalysisService>;
  let brdService: jest.Mocked<BRDService>;

  beforeEach(async () => {
    const mockBRDAnalysisService = {
      analyzeBRD: jest.fn(),
      getLatestAnalysis: jest.fn(),
      generateProjectPlan: jest.fn(),
      getAnalysisByBRD: jest.fn(),
      getGeneratedPlans: jest.fn(),
      refinePlan: jest.fn(),
      createProjectFromPlan: jest.fn(),
    };

    const mockBRDService = {
      // Add any methods that might be needed
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BRDProjectPlanningController],
      providers: [
        {
          provide: BRDAnalysisService,
          useValue: mockBRDAnalysisService,
        },
        {
          provide: BRDService,
          useValue: mockBRDService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(OrganizationGuard)
      .useValue(mockOrganizationGuard)
      .compile();

    controller = module.get<BRDProjectPlanningController>(BRDProjectPlanningController);
    brdAnalysisService = module.get(BRDAnalysisService);
    brdService = module.get(BRDService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyzeBRD', () => {
    it('should call brdAnalysisService.analyzeBRD with correct parameters', async () => {
      const brdId = 'test-brd-id';
      const orgId = 'test-org-id';
      const user = { id: 'test-user-id' };
      const expectedResult = {
        id: 'analysis-id',
        extractedElements: {
          objectives: ['Test objective'],
          scope: { inclusions: [], exclusions: [], assumptions: [] },
          deliverables: [],
          stakeholders: [],
          constraints: { timeline: '', budget: '', resources: [], technology: [], regulatory: [] },
          risks: [],
          successCriteria: [],
        },
        analysisMetadata: {
          confidence: 0.9,
          processingTime: 1000,
          documentQuality: 'high' as const,
          missingElements: [],
          suggestions: [],
        },
      };

      brdAnalysisService.analyzeBRD.mockResolvedValue(expectedResult);

      const result = await controller.analyzeBRD(brdId, orgId, user);

      expect(brdAnalysisService.analyzeBRD).toHaveBeenCalledWith(brdId, orgId, user.id);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('generateProjectPlan', () => {
    it('should call brdAnalysisService.generateProjectPlan with correct parameters', async () => {
      const brdId = 'test-brd-id';
      const dto = { methodology: ProjectMethodology.WATERFALL, brdAnalysisId: 'analysis-id' };
      const orgId = 'test-org-id';
      const user = { id: 'test-user-id' };
      const mockAnalysis = new BRDAnalysis();
      mockAnalysis.id = 'analysis-id';
      mockAnalysis.extractedElements = {
        objectives: ['Test objective'],
        scope: { inclusions: [], exclusions: [], assumptions: [] },
        deliverables: [],
        stakeholders: [],
        constraints: { timeline: '', budget: '', resources: [], technology: [], regulatory: [] },
        risks: [],
        successCriteria: [],
      };
      mockAnalysis.analysisMetadata = {
        confidence: 0.9,
        processingTime: 1000,
        documentQuality: 'high' as const,
        missingElements: [],
        suggestions: [],
      };
      mockAnalysis.brd = new BRD();
      mockAnalysis.generatedPlans = [];
      
      const expectedResult = new GeneratedProjectPlan();
      expectedResult.id = 'plan-id';
      expectedResult.brdAnalysisId = 'analysis-id';
      expectedResult.organizationId = orgId;
      expectedResult.methodology = ProjectMethodology.WATERFALL;
      expectedResult.planStructure = { tasks: [] };
      expectedResult.resourcePlan = { roles: [], timeline: { startDate: '', endDate: '', criticalPath: [], bufferTime: 0 }, budget: { totalEstimate: 0, breakdown: [] } };
      expectedResult.riskRegister = [];
      expectedResult.generationMetadata = { confidence: 0.9, methodology: 'waterfall', alternativesConsidered: [], assumptions: [], recommendations: [] };
      expectedResult.generatedBy = user.id;
      expectedResult.createdAt = new Date();
      expectedResult.updatedAt = new Date();
      expectedResult.brdAnalysis = mockAnalysis;

      brdAnalysisService.getLatestAnalysis.mockResolvedValue(mockAnalysis);
      brdAnalysisService.generateProjectPlan.mockResolvedValue(expectedResult);

      const result = await controller.generateProjectPlan(brdId, dto, orgId, user);

      expect(brdAnalysisService.getLatestAnalysis).toHaveBeenCalledWith(brdId);
      expect(brdAnalysisService.generateProjectPlan).toHaveBeenCalledWith(
        mockAnalysis,
        dto.methodology,
        orgId,
        user.id
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getBRDAnalysis', () => {
    it('should call brdAnalysisService.getAnalysisByBRD with correct parameters', async () => {
      const brdId = 'test-brd-id';
      const orgId = 'test-org-id';
      const mockAnalysis = new BRDAnalysis();
      mockAnalysis.id = 'analysis-id';
      mockAnalysis.brdId = 'brd-id';
      mockAnalysis.organizationId = orgId;
      mockAnalysis.extractedElements = {
        objectives: ['Test objective'],
        scope: { inclusions: [], exclusions: [], assumptions: [] },
        deliverables: [],
        stakeholders: [],
        constraints: { timeline: '', budget: '', resources: [], technology: [], regulatory: [] },
        risks: [],
        successCriteria: [],
      };
      mockAnalysis.analysisMetadata = {
        confidence: 0.9,
        processingTime: 1000,
        documentQuality: 'high' as const,
        missingElements: [],
        suggestions: [],
      };
      mockAnalysis.analyzedBy = 'user-id';
      mockAnalysis.createdAt = new Date();
      mockAnalysis.updatedAt = new Date();
      mockAnalysis.brd = new BRD();
      mockAnalysis.generatedPlans = [];
      
      const expectedResult = [mockAnalysis];

      brdAnalysisService.getAnalysisByBRD.mockResolvedValue(expectedResult);

      const result = await controller.getBRDAnalysis(brdId, orgId);

      expect(brdAnalysisService.getAnalysisByBRD).toHaveBeenCalledWith(brdId, orgId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getGeneratedPlans', () => {
    it('should call brdAnalysisService.getGeneratedPlans with correct parameters', async () => {
      const brdId = 'test-brd-id';
      const orgId = 'test-org-id';
      const mockPlan = new GeneratedProjectPlan();
      mockPlan.id = 'plan-id';
      mockPlan.brdAnalysisId = 'analysis-id';
      mockPlan.organizationId = orgId;
      mockPlan.methodology = ProjectMethodology.WATERFALL;
      mockPlan.planStructure = { tasks: [] };
      mockPlan.resourcePlan = { roles: [], timeline: { startDate: '', endDate: '', criticalPath: [], bufferTime: 0 }, budget: { totalEstimate: 0, breakdown: [] } };
      mockPlan.riskRegister = [];
      mockPlan.generationMetadata = { confidence: 0.9, methodology: 'waterfall', alternativesConsidered: [], assumptions: [], recommendations: [] };
      mockPlan.generatedBy = 'user-id';
      mockPlan.createdAt = new Date();
      mockPlan.updatedAt = new Date();
      mockPlan.brdAnalysis = new BRDAnalysis();
      
      const expectedResult = [mockPlan];

      brdAnalysisService.getGeneratedPlans.mockResolvedValue(expectedResult);

      const result = await controller.getGeneratedPlans(brdId, orgId);

      expect(brdAnalysisService.getGeneratedPlans).toHaveBeenCalledWith(brdId, orgId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refinePlan', () => {
    it('should call brdAnalysisService.refinePlan and return formatted response', async () => {
      const planId = 'test-plan-id';
      const dto = { refinementRequest: 'Add more detail' };
      const orgId = 'test-org-id';
      const mockRefinedPlan = new GeneratedProjectPlan();
      mockRefinedPlan.id = 'refined-plan-id';
      mockRefinedPlan.brdAnalysisId = 'analysis-id';
      mockRefinedPlan.organizationId = orgId;
      mockRefinedPlan.methodology = ProjectMethodology.WATERFALL;
      mockRefinedPlan.planStructure = { phases: [], tasks: [] };
      mockRefinedPlan.resourcePlan = { roles: [], timeline: { startDate: '', endDate: '', criticalPath: [], bufferTime: 0 }, budget: { totalEstimate: 0, breakdown: [] } };
      mockRefinedPlan.riskRegister = [];
      mockRefinedPlan.generationMetadata = { confidence: 0.9, methodology: 'waterfall', alternativesConsidered: [], assumptions: [], recommendations: [] };
      mockRefinedPlan.generatedBy = 'user-id';
      mockRefinedPlan.createdAt = new Date();
      mockRefinedPlan.updatedAt = new Date();
      mockRefinedPlan.brdAnalysis = new BRDAnalysis();
      (mockRefinedPlan as any).changesMade = ['Added risk mitigation'];

      brdAnalysisService.refinePlan.mockResolvedValue(mockRefinedPlan);

      const result = await controller.refinePlan(planId, dto, orgId);

      expect(brdAnalysisService.refinePlan).toHaveBeenCalledWith(planId, dto.refinementRequest);
      expect(result).toEqual({
        id: mockRefinedPlan.id,
        originalPlanId: planId,
        refinementRequest: dto.refinementRequest,
        refinedPlanStructure: mockRefinedPlan.planStructure,
        changesMade: mockRefinedPlan.changesMade,
        createdAt: mockRefinedPlan.createdAt,
      });
    });
  });

  describe('createProjectFromPlan', () => {
    it('should call brdAnalysisService.createProjectFromPlan and return formatted response', async () => {
      const planId = 'test-plan-id';
      const dto = {
        projectName: 'Test Project',
        projectDescription: 'Test Description',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        budget: 100000,
      };
      const orgId = 'test-org-id';
      const user = { id: 'test-user-id' };
      const mockResult = {
        id: 'project-id',
        name: 'Test Project',
        createdAt: new Date(),
      };

      brdAnalysisService.createProjectFromPlan.mockResolvedValue(mockResult);

      const result = await controller.createProjectFromPlan(planId, dto, orgId, user);

      expect(brdAnalysisService.createProjectFromPlan).toHaveBeenCalledWith(
        planId,
        dto,
        orgId,
        user.id
      );
      expect(result).toEqual({
        projectId: mockResult.id,
        projectName: mockResult.name,
        status: 'success',
        message: 'Project successfully created from plan',
        createdAt: mockResult.createdAt,
      });
    });
  });
});
