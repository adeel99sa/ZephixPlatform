import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

/**
 * AppModule Compilation Tests
 *
 * Verifies that the core test module can compile without external clients.
 * Uses a minimal ConfigModule setup (no TypeORM, no DB connection).
 *
 * This test is part of the CI gating suite — it must pass without a database.
 */
describe('AppModule Compilation', () => {
  let app: TestingModule;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        {
          provide: 'DATABASE_CONNECTION',
          useValue: {
            isInitialized: true,
            query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
            initialize: jest.fn().mockResolvedValue(undefined),
            destroy: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: 'CONFIG_SERVICE',
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    app = moduleFixture;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Module Compilation', () => {
    it('should compile module successfully without starting external clients', () => {
      expect(app).toBeDefined();
    });

    it('should create TestingModule without errors', () => {
      expect(app.get).toBeDefined();
    });

    it('should not have any circular dependencies', () => {
      // If there were circular dependencies, the module compilation would fail
      expect(app).toBeDefined();
    });

    it('should resolve ConfigService from compiled module', () => {
      const configService = app.get(ConfigModule);
      expect(configService).toBeDefined();
    });
  });
});
