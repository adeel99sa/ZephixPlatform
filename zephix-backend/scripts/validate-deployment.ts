import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { OrganizationGuard } from '../src/organizations/guards/organization.guard';

export async function validateDeployment() {
  try {
    console.log('🔍 Validating NestJS dependency injection...');
    console.log('📋 Testing OrganizationGuard instantiation...');
    
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    // Test OrganizationGuard can be instantiated
    const guard = moduleRef.get(OrganizationGuard);
    console.log('✅ OrganizationGuard successfully instantiated');

    // Test that the guard has the expected methods
    if (typeof guard.canActivate === 'function') {
      console.log('✅ OrganizationGuard.canActivate method exists');
    } else {
      throw new Error('OrganizationGuard missing canActivate method');
    }

    // Test that the guard has the expected private methods
    const guardPrototype = Object.getPrototypeOf(guard);
    const privateMethods = [
      'extractOrganizationId',
      'validateUserOrganizationAccess',
      'getUserOrganizationFromClaims',
      'getUserRoleFromClaims'
    ];

    for (const method of privateMethods) {
      if (guardPrototype[method]) {
        console.log(`✅ OrganizationGuard.${method} method exists`);
      } else {
        console.warn(`⚠️  OrganizationGuard.${method} method not found (may be private)`);
      }
    }

    await app.close();
    console.log('✅ Deployment validation passed');
    
    return true;
  } catch (error) {
    console.error('❌ Deployment validation failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateDeployment()
    .then((success) => {
      if (success) {
        console.log('🎉 All validation checks passed!');
        process.exit(0);
      } else {
        console.error('💥 Validation failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error during validation:', error);
      process.exit(1);
    });
}
