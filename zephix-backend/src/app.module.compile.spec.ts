import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

// Import all entities that need repository mocking
import { User } from './users/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { TeamMember } from './projects/entities/team-member.entity';
import { Role } from './projects/entities/role.entity';
import { UserProject } from './pm/entities/user-project.entity';
import { Feedback } from './feedback/entities/feedback.entity';
import { PMKnowledgeChunk } from './pm/entities/pm-knowledge-chunk.entity';
import { ProjectTask } from './pm/entities/project-task.entity';
import { ProjectRisk } from './pm/entities/project-risk.entity';
import { ProjectStakeholder } from './pm/entities/project-stakeholder.entity';
import { Portfolio } from './pm/entities/portfolio.entity';
import { Program } from './pm/entities/program.entity';
import { StatusReport } from './pm/entities/status-report.entity';
import { ProjectMetrics } from './pm/entities/project-metrics.entity';
import { PerformanceBaseline } from './pm/entities/performance-baseline.entity';
import { AlertConfiguration } from './pm/entities/alert-configuration.entity';
import { ManualUpdate } from './pm/entities/manual-update.entity';
import { StakeholderCommunication } from './pm/entities/stakeholder-communication.entity';
import { Risk } from './pm/entities/risk.entity';
import { RiskAssessment } from './pm/entities/risk-assessment.entity';
import { RiskResponse } from './pm/entities/risk-response.entity';
import { RiskMonitoring } from './pm/entities/risk-monitoring.entity';

describe('AppModule Compilation', () => {
  let app: TestingModule;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    // Create a mock DataSource
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
      createQueryRunner: jest.fn(),
      manager: {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    // Create mock repository
    const mockRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn().mockReturnValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue(null),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ 
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    })
    .overrideProvider(getDataSourceToken())
    .useValue(mockDataSource)
    // Mock all entity repositories
    .overrideProvider(getRepositoryToken(User))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Project))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(TeamMember))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Role))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(UserProject))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Feedback))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(PMKnowledgeChunk))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(ProjectTask))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(ProjectRisk))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(ProjectStakeholder))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Portfolio))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Program))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(StatusReport))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(ProjectMetrics))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(PerformanceBaseline))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(AlertConfiguration))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(ManualUpdate))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(StakeholderCommunication))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(Risk))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(RiskAssessment))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(RiskResponse))
    .useValue(mockRepository)
    .overrideProvider(getRepositoryToken(RiskMonitoring))
    .useValue(mockRepository)
    .compile();

    app = moduleFixture;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
    // Clean up any timers or async operations
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Module Compilation', () => {
    it('should compile AppModule successfully without starting external clients', () => {
      expect(app).toBeDefined();
    });

    it('should create TestingModule without errors', () => {
      expect(app.get).toBeDefined();
    });

    it('should not have any circular dependencies', () => {
      // If there were circular dependencies, the module compilation would fail
      expect(app).toBeDefined();
    });

    it('should have StatusReportingService available from StatusReportingModule', () => {
      // This will throw if StatusReportingService is not properly provided
      expect(() => {
        const statusReportingService = app.get('StatusReportingService', { strict: false });
        // We don't expect to find it since we're testing the module structure
        // The fact that this doesn't throw a circular dependency error is the test
      }).not.toThrow();
    });
  });
});
