import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function testErrorHandling() {
  console.log('🛡️ TESTING ERROR HANDLING');
  console.log('==========================');
  
  try {
    // Test 1: Invalid endpoint
    console.log('\n📝 Test 1: Invalid endpoint');
    try {
      const response = await axios.get(`${API_BASE}/invalid-endpoint`);
      console.log('❌ FAILED: Invalid endpoint returned success');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ PASSED: Invalid endpoint returns 404');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
      
      // Check if error message is clean (no stack traces)
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('at ') || errorMessage.includes('Error:')) {
        console.log('❌ FAILED: Error message contains internal details');
        console.log('   Message:', errorMessage);
      } else {
        console.log('✅ PASSED: Error message is clean');
        console.log('   Message:', errorMessage);
      }
    }
    
    // Test 2: Invalid project ID
    console.log('\n📝 Test 2: Invalid project ID');
    try {
      const response = await axios.get(`${API_BASE}/projects/invalid-uuid`);
      console.log('❌ FAILED: Invalid project ID returned success');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('✅ PASSED: Invalid project ID returns appropriate error');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
      
      // Check error message
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('at ') || errorMessage.includes('Error:')) {
        console.log('❌ FAILED: Error message contains internal details');
      } else {
        console.log('✅ PASSED: Error message is clean');
      }
    }
    
    // Test 3: Unauthorized access
    console.log('\n📝 Test 3: Unauthorized access');
    try {
      const response = await axios.get(`${API_BASE}/projects`);
      console.log('❌ FAILED: Unauthorized access succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASSED: Unauthorized access returns 401');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
    }
    
    // Test 4: Malformed request body
    console.log('\n📝 Test 4: Malformed request body');
    try {
      const response = await axios.post(`${API_BASE}/projects`, {
        // Missing required fields
      });
      console.log('❌ FAILED: Malformed request succeeded');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ PASSED: Malformed request returns 400');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
    }
    
    // Test 5: Check if app is still running after errors
    console.log('\n📝 Test 5: App health check after errors');
    try {
      const response = await axios.get(`${API_BASE}/health`);
      if (response.status === 200) {
        console.log('✅ PASSED: App is still running after errors');
        console.log('   Health status:', response.data);
      } else {
        console.log('❌ FAILED: App health check failed');
      }
    } catch (error) {
      console.log('❌ FAILED: App crashed or health endpoint not available');
      console.log('   Error:', error.message);
    }
    
    // Test 6: Test with valid token but no workspace
    console.log('\n📝 Test 6: Valid token but no workspace context');
    try {
      // Create a test user first
      const signupResponse = await axios.post(`${API_BASE}/auth/signup`, {
        email: `test${Date.now()}@test.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org'
      });
      
      const token = signupResponse.data.accessToken;
      
      // Try to access projects without workspace header
      const response = await axios.get(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
        // No X-Workspace-Id header
      });
      
      console.log('❌ FAILED: Access succeeded without workspace context');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PASSED: Access blocked without workspace context (403 Forbidden)');
      } else {
        console.log('⚠️  Unexpected status:', error.response?.status);
      }
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
  }
}

// Run the test
testErrorHandling().catch(console.error);
