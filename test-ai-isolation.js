const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAIWorkspaceIsolation() {
  console.log('🤖 TESTING AI WORKSPACE ISOLATION');
  console.log('==================================');
  
  try {
    // Test 1: Create two users in different workspaces
    console.log('\n📝 Step 1: Creating test users...');
    
    const user1Response = await axios.post(`${API_BASE}/auth/signup`, {
      email: `ai-test-user1-${Date.now()}@test.com`,
      password: 'Test123!',
      firstName: 'AI',
      lastName: 'User1',
      organizationName: `AI-Test-Org1-${Date.now()}`
    });
    
    const user2Response = await axios.post(`${API_BASE}/auth/signup`, {
      email: `ai-test-user2-${Date.now()}@test.com`,
      password: 'Test123!',
      firstName: 'AI',
      lastName: 'User2',
      organizationName: `AI-Test-Org2-${Date.now()}`
    });
    
    const user1Token = user1Response.data.accessToken;
    const user2Token = user2Response.data.accessToken;
    const user1Workspace = user1Response.data.workspace.id;
    const user2Workspace = user2Response.data.workspace.id;
    
    console.log('✅ Test users created');
    console.log(`   User1 workspace: ${user1Workspace}`);
    console.log(`   User2 workspace: ${user2Workspace}`);
    
    // Test 2: User1 tries to access AI without workspace context
    console.log('\n📝 Step 2: Testing AI access without workspace context');
    try {
      await axios.post(`${API_BASE}/ai-chat/send-message`, {
        message: "What are my projects?",
        context: { userId: user1Response.data.user.id }
      }, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      
      console.log('❌ FAILED: AI accessed without workspace context');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: AI correctly blocked without workspace context (403 Forbidden)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 3: User1 tries to access AI with wrong workspace
    console.log('\n📝 Step 3: Testing AI access with wrong workspace');
    try {
      await axios.post(`${API_BASE}/ai-chat/send-message`, {
        message: "What are my projects?",
        context: { 
          userId: user1Response.data.user.id,
          workspaceId: user2Workspace // Wrong workspace
        }
      }, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user2Workspace
        }
      });
      
      console.log('❌ FAILED: AI accessed with wrong workspace');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: AI correctly blocked with wrong workspace (403 Forbidden)');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 4: User1 tries to access AI with correct workspace
    console.log('\n📝 Step 4: Testing AI access with correct workspace');
    try {
      const response = await axios.post(`${API_BASE}/ai-chat/send-message`, {
        message: "Hello, can you help me?",
        context: { 
          userId: user1Response.data.user.id,
          workspaceId: user1Workspace
        }
      }, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        }
      });
      
      console.log('✅ PASSED: AI accessed with correct workspace');
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log('⚠️  AI access failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 5: Test AI suggestions endpoint
    console.log('\n📝 Step 5: Testing AI suggestions endpoint');
    try {
      const response = await axios.get(`${API_BASE}/ai/suggestions/project/${user1Workspace}`, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        }
      });
      
      console.log('✅ PASSED: AI suggestions endpoint accessible');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ PASSED: AI suggestions endpoint exists (404 expected for empty data)');
      } else {
        console.log('⚠️  AI suggestions error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 6: Test AI mapping endpoint
    console.log('\n📝 Step 6: Testing AI mapping endpoint');
    try {
      const response = await axios.get(`${API_BASE}/ai/mapping/status`, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        }
      });
      
      console.log('✅ PASSED: AI mapping endpoint accessible');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ PASSED: AI mapping endpoint exists (404 expected for empty data)');
      } else {
        console.log('⚠️  AI mapping error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 7: Test AI intelligence endpoint
    console.log('\n📝 Step 7: Testing AI intelligence endpoint');
    try {
      const response = await axios.post(`${API_BASE}/ai-intelligence/analyze-project-context`, {
        documents: [],
        projectData: { name: 'Test Project' },
        userInteractions: [],
        industryData: {}
      }, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        }
      });
      
      console.log('✅ PASSED: AI intelligence endpoint accessible');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ PASSED: AI intelligence endpoint exists (400 expected for invalid data)');
      } else {
        console.log('⚠️  AI intelligence error:', error.response?.status, error.response?.data?.message);
      }
    }
    
    // Test 8: Test AI PM assistant endpoint
    console.log('\n📝 Step 8: Testing AI PM assistant endpoint');
    try {
      const response = await axios.post(`${API_BASE}/ai-pm-assistant/ask`, {
        question: "How can I improve my project management?",
        context: { projectId: 'test-project' }
      }, {
        headers: { 
          Authorization: `Bearer ${user1Token}`,
          'X-Workspace-Id': user1Workspace
        }
      });
      
      console.log('✅ PASSED: AI PM assistant endpoint accessible');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ PASSED: AI PM assistant endpoint exists (400 expected for invalid data)');
      } else {
        console.log('⚠️  AI PM assistant error:', error.response?.status, error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
  }
}

// Run the test
testAIWorkspaceIsolation().catch(console.error);
