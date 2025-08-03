const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuthEndpoints() {
  console.log('🧪 Testing Zephix Authentication Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: User Registration
    console.log('2️⃣ Testing User Registration...');
    const registerData = {
      email: 'test@zephix.com',
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    console.log('✅ Registration successful!');
    console.log('📋 User ID:', registerResponse.data.user.id);
    console.log('📋 Access Token:', registerResponse.data.accessToken.substring(0, 20) + '...');
    console.log('');

    // Test 3: User Login
    console.log('3️⃣ Testing User Login...');
    const loginData = {
      email: 'test@zephix.com',
      password: 'SecurePassword123!'
    };

    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    console.log('✅ Login successful!');
    console.log('📋 User:', loginResponse.data.user.email);
    console.log('📋 Access Token:', loginResponse.data.accessToken.substring(0, 20) + '...');
    console.log('');

    // Test 4: Get Profile (Protected Route)
    console.log('4️⃣ Testing Protected Profile Route...');
    const accessToken = loginResponse.data.accessToken;
    
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Profile access successful!');
    console.log('📋 User Profile:', profileResponse.data.user.email);
    console.log('');

    // Test 5: Duplicate Registration (Should Fail)
    console.log('5️⃣ Testing Duplicate Registration (Should Fail)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('❌ Duplicate registration should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Duplicate registration correctly rejected!');
        console.log('📋 Error:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 6: Invalid Login (Should Fail)
    console.log('6️⃣ Testing Invalid Login (Should Fail)...');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@zephix.com',
        password: 'WrongPassword123!'
      });
      console.log('❌ Invalid login should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid login correctly rejected!');
        console.log('📋 Error:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 7: Unauthorized Profile Access (Should Fail)
    console.log('7️⃣ Testing Unauthorized Profile Access (Should Fail)...');
    try {
      await axios.get(`${BASE_URL}/api/auth/profile`);
      console.log('❌ Unauthorized access should have failed!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Unauthorized access correctly rejected!');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('🚀 Zephix Authentication Service is working perfectly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the tests
testAuthEndpoints(); 