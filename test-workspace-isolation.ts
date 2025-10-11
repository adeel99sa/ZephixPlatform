import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function createTestUser(email: string, orgName: string) {
  try {
    const response = await axios.post(`${API_BASE}/auth/signup`, {
      email,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: orgName
    });
    
    return response.data.accessToken;
  } catch (error) {
    console.log(`Failed to create user ${email}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testWorkspaceIsolation() {
  console.log('🔒 TESTING WORKSPACE ISOLATION');
  console.log('==============================');
  
  try {
    // Create two users in different organizations
    console.log('📝 Creating test users...');
    const user1Token = await createTestUser(`user1${Date.now()}@test.com`, `Org1-${Date.now()}`);
    const user2Token = await createTestUser(`user2${Date.now()}@test.com`, `Org2-${Date.now()}`);
    
    if (!user1Token || !user2Token) {
      console.log('❌ Failed to create test users');
      return;
    }
    
    console.log('✅ Test users created');
    
    // Decode tokens to get workspace IDs
    const user1Payload = JSON.parse(Buffer.from(user1Token.split('.')[1], 'base64').toString());
    const user2Payload = JSON.parse(Buffer.from(user2Token.split('.')[1], 'base64').toString());
    
    console.log(`   User1 workspace: ${user1Payload.currentWorkspaceId}`);
    console.log(`   User2 workspace: ${user2Payload.currentWorkspaceId}`);
    
    // Test 1: User1 creates a project
    console.log('\n📝 Test 1: User1 creates a project');
    let project1;
    try {
      const response = await axios.post(`${API_BASE}/projects`, 
        { 
          name: 'User1 Project',
          description: 'This is User1 project'
        },
        { 
          headers: { 
            Authorization: `Bearer ${user1Token}`,
            'X-Workspace-Id': user1Payload.currentWorkspaceId
          } 
        }
      );
      
      project1 = response.data;
      console.log('✅ User1 project created:', project1.id);
    } catch (error) {
      console.log('❌ User1 failed to create project:', error.response?.data?.message || error.message);
      return;
    }
    
    // Test 2: User2 tries to access User1's project
    console.log('\n📝 Test 2: User2 tries to access User1 project');
    try {
      const response = await axios.get(`${API_BASE}/projects/${project1.id}`,
        { 
          headers: { 
            Authorization: `Bearer ${user2Token}`,
            'X-Workspace-Id': user2Payload.currentWorkspaceId
          } 
        }
      );
      
      console.log('❌ FAILED: User2 accessed User1 project');
      console.log('   This indicates workspace isolation is NOT working');
      console.log('   Response:', response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: User2 correctly blocked from User1 project (403 Forbidden)');
      } else if (error.response?.status === 404) {
        console.log('✅ PASSED: User2 cannot see User1 project (404 Not Found)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 3: User2 tries to list all projects
    console.log('\n📝 Test 3: User2 lists all projects');
    try {
      const response = await axios.get(`${API_BASE}/projects`,
        { 
          headers: { 
            Authorization: `Bearer ${user2Token}`,
            'X-Workspace-Id': user2Payload.currentWorkspaceId
          } 
        }
      );
      
      const projects = response.data.data || response.data;
      const user1Project = projects.find((p: any) => p.id === project1.id);
      
      if (user1Project) {
        console.log('❌ FAILED: User2 can see User1 project in list');
        console.log('   This indicates workspace filtering is NOT working');
      } else {
        console.log('✅ PASSED: User2 cannot see User1 project in list');
        console.log(`   User2 sees ${projects.length} projects (should be 0)`);
      }
    } catch (error) {
      console.log('⚠️  Error listing projects:', error.response?.data?.message || error.message);
    }
    
    // Test 4: User1 tries to access without workspace header
    console.log('\n📝 Test 4: User1 tries to access without workspace header');
    try {
      const response = await axios.get(`${API_BASE}/projects`,
        { 
          headers: { 
            Authorization: `Bearer ${user1Token}`
            // No X-Workspace-Id header
          } 
        }
      );
      
      console.log('❌ FAILED: User1 accessed projects without workspace header');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: User1 blocked without workspace header (403 Forbidden)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 5: User1 tries to access with wrong workspace ID
    console.log('\n📝 Test 5: User1 tries to access with wrong workspace ID');
    try {
      const response = await axios.get(`${API_BASE}/projects`,
        { 
          headers: { 
            Authorization: `Bearer ${user1Token}`,
            'X-Workspace-Id': user2Payload.currentWorkspaceId // Wrong workspace
          } 
        }
      );
      
      console.log('❌ FAILED: User1 accessed with wrong workspace ID');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: User1 blocked with wrong workspace ID (403 Forbidden)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testWorkspaceIsolation().catch(console.error);
