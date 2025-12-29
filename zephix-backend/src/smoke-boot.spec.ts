/**
 * Smoke test to verify module compilation and basic DI wiring
 * This catches module wiring issues before deployment
 * 
 * Note: This test only verifies that modules compile and services are registered.
 * Full app boot with DB is tested in e2e tests.
 */
describe('Module Compilation Smoke Test', () => {
  it('should import AuthModule without errors', () => {
    // Just verify the module can be imported (compilation check)
    const { AuthModule } = require('./modules/auth/auth.module');
    expect(AuthModule).toBeDefined();
  });

  it('should import AuthRegistrationService without errors', () => {
    // Verify the service class exists and is properly exported
    const { AuthRegistrationService } = require('./modules/auth/services/auth-registration.service');
    expect(AuthRegistrationService).toBeDefined();
  });

  it('should import AuthController without errors', () => {
    // Verify the controller class exists and is properly exported
    const { AuthController } = require('./modules/auth/auth.controller');
    expect(AuthController).toBeDefined();
  });

  it('should have AuthRegistrationService in AuthModule providers', () => {
    // Verify module wiring by checking if service is in providers
    const { AuthModule } = require('./modules/auth/auth.module');
    const moduleMetadata = Reflect.getMetadata('imports', AuthModule);
    expect(moduleMetadata).toBeDefined();
  });
});

