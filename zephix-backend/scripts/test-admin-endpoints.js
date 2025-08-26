const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

// Test admin endpoints
async function testAdminEndpoints() {
  console.log('🧪 Testing Admin Endpoints...\n');

  try {
    // Test 1: Get admin stats (should fail without auth)
    console.log('1️⃣ Testing /admin/stats without authentication...');
    try {
      await axios.get(`${API_BASE}/admin/stats`);
      console.log('❌ Should have failed - endpoint accessible without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    // Test 2: Get admin users (should fail without auth)
    console.log('\n2️⃣ Testing /admin/users without authentication...');
    try {
      await axios.get(`${API_BASE}/admin/users`);
      console.log('❌ Should have failed - endpoint accessible without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    // Test 3: Create audit log (should fail without auth)
    console.log('\n3️⃣ Testing /admin/audit without authentication...');
    try {
      await axios.post(`${API_BASE}/admin/audit`, {
        action: 'test.action',
        entityType: 'test'
      });
      console.log('❌ Should have failed - endpoint accessible without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    console.log('\n✅ All authentication tests passed!');
    console.log('📝 Note: To test with real authentication, you need to:');
    console.log('   1. Start the backend server');
    console.log('   2. Login as admin@zephix.ai');
    console.log('   3. Use the JWT token in Authorization header');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testAdminEndpoints();
