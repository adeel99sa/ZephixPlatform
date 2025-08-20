import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// ✅ SENIOR-LEVEL MODULE COMPILATION TEST
describe('AppModule Compilation', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('module compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined();
    });

    it('should provide AppController', () => {
      const controller = module.get<AppController>(AppController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AppController);
    });

    it('should provide AppService', () => {
      const service = module.get<AppService>(AppService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AppService);
    });
  });

  describe('dependency injection', () => {
    it('should inject AppService into AppController', () => {
      const controller = module.get<AppController>(AppController);
      const service = module.get<AppService>(AppService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();

      // Test that controller can use service
      const result = controller.getHello();
      expect(result).toBeDefined();
    });
  });
});
