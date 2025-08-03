const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testRegistration() {
  try {
    console.log('🧪 Testing user registration...');
    
    const userData = {
      email: 'test@zephix.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await axios.post(`${BASE_URL}/api/users/register`, userData);
    
    console.log('✅ Registration successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Registration failed');
      console.log('📋 Error response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testRegistration(); 