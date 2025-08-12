#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

async function testUserLogin() {
  console.log('🔐 Testing User Login...');
  
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  const loginData = {
    email: 'adeel99sa@yahoo.com',
    password: process.env.TEST_USER_PASSWORD || 'test123'
  };

  try {
    console.log(`📧 Testing login for: ${loginData.email}`);
    console.log(`🌐 API Base URL: ${baseURL}`);
    
    // Test login endpoint
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Login-Test-Script/1.0'
      },
      timeout: 10000
    });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      console.log('✅ Login successful!');
      console.log('📊 Response status:', loginResponse.status);
      
      if (loginResponse.data.accessToken) {
        console.log('🔑 Access token received');
        console.log('🔑 Token type:', typeof loginResponse.data.accessToken);
        console.log('🔑 Token length:', loginResponse.data.accessToken.length);
      }
      
      if (loginResponse.data.user) {
        console.log('👤 User data received:');
        console.log('   - ID:', loginResponse.data.user.id);
        console.log('   - Email:', loginResponse.data.user.email);
        console.log('   - Name:', loginResponse.data.user.firstName, loginResponse.data.user.lastName);
        console.log('   - Email Verified:', loginResponse.data.user.isEmailVerified);
        console.log('   - Active:', loginResponse.data.user.isActive);
      }
      
      // Test if we can access a protected endpoint
      if (loginResponse.data.accessToken) {
        console.log('\n🔒 Testing protected endpoint access...');
        try {
          const protectedResponse = await axios.get(`${baseURL}/api/health/user-exists?email=${loginData.email}`, {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.accessToken}`,
              'User-Agent': 'Login-Test-Script/1.0'
            },
            timeout: 10000
          });
          
          if (protectedResponse.status === 200) {
            console.log('✅ Protected endpoint access successful!');
            console.log('📊 Protected endpoint response:', protectedResponse.data);
          }
        } catch (protectedError) {
          console.log('⚠️  Protected endpoint access failed (this might be expected):', protectedError.message);
        }
      }
      
    } else {
      console.log('⚠️  Login response status:', loginResponse.status);
      console.log('📊 Response data:', loginResponse.data);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Login failed with status:', error.response.status);
      console.log('📊 Error response:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('🔐 Authentication failed - check credentials');
      } else if (error.response.status === 400) {
        console.log('📝 Bad request - check request format');
      } else if (error.response.status === 500) {
        console.log('⚙️  Server error - check backend logs');
      }
    } else if (error.request) {
      console.log('❌ No response received - check if server is running');
      console.log('🌐 Server URL:', baseURL);
    } else {
      console.log('❌ Request setup error:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testUserLogin().catch(console.error);
}

module.exports = { testUserLogin };
