import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// ✅ SENIOR-LEVEL TEST IMPLEMENTATION
describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    getHealth: jest.fn().mockReturnValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('root endpoint', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should return "Hello World!"', () => {
      const result = controller.getHello();

      expect(result).toBe('Hello World!');
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });

  describe('health check endpoint', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(mockAppService.getHealth).toHaveBeenCalled();
    });
  });
});
