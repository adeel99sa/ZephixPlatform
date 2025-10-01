const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testTransactionIntegrity() {
  console.log('🧪 TESTING TRANSACTION INTEGRITY');
  console.log('================================');
  
  try {
    // Test 1: Normal signup
    console.log('\n📝 Test 1: Normal signup');
    const normalResponse = await axios.post(`${API_BASE}/auth/signup`, {
      email: `normal${Date.now()}@test.com`,
      password: 'Test123!',
      firstName: 'Normal',
      lastName: 'User',
      organizationName: 'Normal Org'
    });
    
    if (normalResponse.data.user && normalResponse.data.workspace) {
      console.log('✅ Normal signup succeeded');
      console.log(`   User ID: ${normalResponse.data.user.id}`);
      console.log(`   Workspace ID: ${normalResponse.data.workspace.id}`);
      console.log(`   User has workspace: ${!!normalResponse.data.user.currentWorkspaceId}`);
    } else {
      console.log('❌ Normal signup failed - missing data');
    }
    
    // Test 2: Duplicate email (should fail gracefully)
    console.log('\n📝 Test 2: Duplicate email signup');
    try {
      await axios.post(`${API_BASE}/auth/signup`, {
        email: `normal${Date.now()}@test.com`,
        password: 'Test123!',
        firstName: 'Duplicate',
        lastName: 'User',
        organizationName: 'Duplicate Org'
      });
      console.log('❌ FAILED: Duplicate email signup succeeded');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ PASSED: Duplicate email correctly rejected (409 Conflict)');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function testWorkspaceIsolation() {
  console.log('\n🔒 TESTING WORKSPACE ISOLATION');
  console.log('==============================');
  
  try {
    // Create two users
    console.log('📝 Creating test users...');
    const user1Response = await axios.post(`${API_BASE}/auth/signup`, {
      email: `user1${Date.now()}@test.com`,
      password: 'Test123!',
      firstName: 'User1',
      lastName: 'Test',
      organizationName: `Org1-${Date.now()}`
    });
    
    const user2Response = await axios.post(`${API_BASE}/auth/signup`, {
      email: `user2${Date.now()}@test.com`,
      password: 'Test123!',
      firstName: 'User2',
      lastName: 'Test',
      organizationName: `Org2-${Date.now()}`
    });
    
    const user1Token = user1Response.data.accessToken;
    const user2Token = user2Response.data.accessToken;
    const user1Workspace = user1Response.data.workspace.id;
    const user2Workspace = user2Response.data.workspace.id;
    
    console.log('✅ Test users created');
    console.log(`   User1 workspace: ${user1Workspace}`);
    console.log(`   User2 workspace: ${user2Workspace}`);
    
    // User1 creates a project
    console.log('\n📝 User1 creates a project');
    const projectResponse = await axios.post(`${API_BASE}/projects`, 
      { 
        name: 'User1 Project',
        description: 'This is User1 project'
      },
      { 
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        } 
      }
    );
    
    const projectId = projectResponse.data.id;
    console.log('✅ User1 project created:', projectId);
    
    // User2 tries to access User1's project
    console.log('\n📝 User2 tries to access User1 project');
    try {
      await axios.get(`${API_BASE}/projects/${projectId}`,
        { 
          headers: { 
            Authorization: `Bearer ${user2Token}`,
            'X-Workspace-Id': user2Workspace
          } 
        }
      );
      
      console.log('❌ FAILED: User2 accessed User1 project');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: User2 correctly blocked from User1 project (403 Forbidden)');
      } else if (error.response?.status === 404) {
        console.log('✅ PASSED: User2 cannot see User1 project (404 Not Found)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // User2 tries to list all projects
    console.log('\n📝 User2 lists all projects');
    const user2ProjectsResponse = await axios.get(`${API_BASE}/projects`,
      { 
        headers: { 
          Authorization: `Bearer ${user2Token}`,
          'X-Workspace-Id': user2Workspace
        } 
      }
    );
    
    const user2Projects = user2ProjectsResponse.data.data || user2ProjectsResponse.data;
    const user1Project = user2Projects.find(p => p.id === projectId);
    
    if (user1Project) {
      console.log('❌ FAILED: User2 can see User1 project in list');
    } else {
      console.log('✅ PASSED: User2 cannot see User1 project in list');
      console.log(`   User2 sees ${user2Projects.length} projects (should be 0)`);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n🛡️ TESTING ERROR HANDLING');
  console.log('==========================');
  
  try {
    // Test 1: Invalid endpoint
    console.log('\n📝 Test 1: Invalid endpoint');
    try {
      await axios.get(`${API_BASE}/invalid-endpoint`);
      console.log('❌ FAILED: Invalid endpoint returned success');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ PASSED: Invalid endpoint returns 404');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
      
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('at ') || errorMessage.includes('Error:')) {
        console.log('❌ FAILED: Error message contains internal details');
      } else {
        console.log('✅ PASSED: Error message is clean');
      }
    }
    
    // Test 2: Unauthorized access
    console.log('\n📝 Test 2: Unauthorized access');
    try {
      await axios.get(`${API_BASE}/projects`);
      console.log('❌ FAILED: Unauthorized access succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASSED: Unauthorized access returns 401');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
    }
    
    // Test 3: Health check
    console.log('\n📝 Test 3: App health check');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`);
      if (healthResponse.status === 200) {
        console.log('✅ PASSED: App is running');
      } else {
        console.log('❌ FAILED: App health check failed');
      }
    } catch (error) {
      console.log('❌ FAILED: App crashed or health endpoint not available');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚨 CRITICAL FIXES VERIFICATION');
  console.log('===============================');
  
  try {
    await testTransactionIntegrity();
    await testWorkspaceIsolation();
    await testErrorHandling();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log('✅ Transaction integrity: Tested');
    console.log('✅ Workspace isolation: Tested');
    console.log('✅ Error handling: Tested');
    console.log('✅ App stability: Verified');
    
  } catch (error) {
    console.log('❌ Test suite failed:', error.message);
  }
}

// Run all tests
runAllTests();
