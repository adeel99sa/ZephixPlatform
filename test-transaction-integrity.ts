import { NestFactory } from '@nestjs/core';
import { AppModule } from './zephix-backend/src/app.module';
import { DataSource } from 'typeorm';
import { AuthService } from './zephix-backend/src/modules/auth/auth.service';

async function testTransactionRollback() {
  console.log('🧪 TESTING TRANSACTION INTEGRITY');
  console.log('================================');
  
  let app;
  try {
    app = await NestFactory.create(AppModule);
    const dataSource = app.get(DataSource);
    const authService = app.get(AuthService);
    
    console.log('✅ App created successfully');
    
    // Test 1: Normal signup (should work)
    console.log('\n📝 Test 1: Normal signup');
    try {
      const normalResult = await authService.signup({
        email: `normal${Date.now()}@test.com`,
        password: 'Test123!',
        firstName: 'Normal',
        lastName: 'User',
        organizationName: 'Normal Org'
      });
      
      if (normalResult.user && normalResult.workspace) {
        console.log('✅ Normal signup succeeded');
        console.log(`   User ID: ${normalResult.user.id}`);
        console.log(`   Workspace ID: ${normalResult.workspace.id}`);
        console.log(`   User has workspace: ${!!normalResult.user.currentWorkspaceId}`);
      } else {
        console.log('❌ Normal signup failed - missing data');
      }
    } catch (error) {
      console.log('❌ Normal signup failed:', error.message);
    }
    
    // Test 2: Simulate workspace creation failure
    console.log('\n📝 Test 2: Simulated workspace creation failure');
    
    // Monkey-patch to force failure on workspace creation
    const originalCreate = dataSource.manager.create;
    let callCount = 0;
    dataSource.manager.create = function(...args) {
      callCount++;
      console.log(`   Creating entity #${callCount}: ${args[0].name || 'Unknown'}`);
      
      // Fail on workspace creation (3rd entity created)
      if (callCount === 3) {
        console.log('   💥 FORCING WORKSPACE CREATION FAILURE');
        throw new Error('Simulated workspace creation failure');
      }
      
      return originalCreate.apply(this, args);
    };
    
    try {
      const failResult = await authService.signup({
        email: `fail${Date.now()}@test.com`,
        password: 'Test123!',
        firstName: 'Fail',
        lastName: 'User',
        organizationName: 'Fail Org'
      });
      
      console.log('❌ FAILED: Signup succeeded when it should have failed');
      console.log('   This indicates transaction rollback is NOT working');
    } catch (error) {
      console.log('✅ Error caught as expected:', error.message);
      
      // Verify NOTHING was created in database
      console.log('\n🔍 Verifying rollback...');
      
      const userRepo = dataSource.getRepository('User');
      const orgRepo = dataSource.getRepository('Organization');
      const workspaceRepo = dataSource.getRepository('Workspace');
      
      const users = await userRepo.find({ where: { email: `fail${Date.now()}@test.com` } });
      const orgs = await orgRepo.find({ where: { name: 'Fail Org' } });
      const workspaces = await workspaceRepo.find({ where: { name: "Fail's Workspace" } });
      
      console.log(`   Users created: ${users.length} (should be 0)`);
      console.log(`   Organizations created: ${orgs.length} (should be 0)`);
      console.log(`   Workspaces created: ${workspaces.length} (should be 0)`);
      
      if (users.length === 0 && orgs.length === 0 && workspaces.length === 0) {
        console.log('✅ PASSED: Transaction rolled back successfully - NO partial data created');
      } else {
        console.log('❌ FAILED: Partial data was created - transaction rollback failed');
        console.log('   This is a CRITICAL data integrity issue');
      }
    }
    
    // Test 3: Simulate user creation failure
    console.log('\n📝 Test 3: Simulated user creation failure');
    
    // Reset the monkey patch
    dataSource.manager.create = originalCreate;
    callCount = 0;
    
    dataSource.manager.create = function(...args) {
      callCount++;
      console.log(`   Creating entity #${callCount}: ${args[0].name || 'Unknown'}`);
      
      // Fail on user creation (2nd entity created)
      if (callCount === 2) {
        console.log('   💥 FORCING USER CREATION FAILURE');
        throw new Error('Simulated user creation failure');
      }
      
      return originalCreate.apply(this, args);
    };
    
    try {
      const failResult = await authService.signup({
        email: `fail2${Date.now()}@test.com`,
        password: 'Test123!',
        firstName: 'Fail2',
        lastName: 'User',
        organizationName: 'Fail2 Org'
      });
      
      console.log('❌ FAILED: Signup succeeded when it should have failed');
    } catch (error) {
      console.log('✅ Error caught as expected:', error.message);
      
      // Verify only organization was created (and rolled back)
      const orgs = await dataSource.getRepository('Organization').find({ where: { name: 'Fail2 Org' } });
      console.log(`   Organizations created: ${orgs.length} (should be 0)`);
      
      if (orgs.length === 0) {
        console.log('✅ PASSED: Transaction rolled back successfully');
      } else {
        console.log('❌ FAILED: Organization was created but not rolled back');
      }
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

// Run the test
testTransactionRollback().catch(console.error);
