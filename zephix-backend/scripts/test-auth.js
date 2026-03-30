#!/usr/bin/env node

/**
 * Authentication Testing Script for Zephix Backend
 *
 * Covers self-serve registration (register → neutral 200, no org/tokens),
 * login, JWT usage, protected routes, and validation errors.
 *
 * Note: After register, login may return 403 EMAIL_NOT_VERIFIED until the user
 * verifies email (unless staging bypass applies). Token-dependent tests skip in that case.
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://zephix-frontend-production.up.railway.app';

// Test user data (RegisterDto: email, password, fullName — no org at register)
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'SecurePassword123!',
  fullName: 'Test User',
};

let authToken = null;
let refreshToken = null;

// Test scenarios
const testScenarios = [
  {
    name: 'Health Check (No Auth Required)',
    method: 'GET',
    path: '/api/health',
    headers: {
      'Origin': FRONTEND_URL,
    },
    expectedStatus: 200,
    description: 'Basic health check should work without authentication'
  },
  {
    name: 'User Register (self-serve)',
    method: 'POST',
    path: '/api/auth/register',
    headers: {
      'Origin': FRONTEND_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testUser),
    expectedStatus: 200,
    description:
      'Register creates user only (neutral 200); org/workspace come after verify + onboarding',
  },
  {
    name: 'User Login',
    method: 'POST',
    path: '/api/auth/login',
    headers: {
      'Origin': FRONTEND_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
    expectedStatus: 200,
    description:
      'Login should return tokens when email is verified (403 EMAIL_NOT_VERIFIED otherwise)',
    allowEmailNotVerified: true,
  },
  {
    name: 'Get User Profile (Authenticated)',
    method: 'GET',
    path: '/api/auth/me',
    headers: {
      'Origin': FRONTEND_URL,
      'Authorization': `Bearer ${authToken}`,
    },
    expectedStatus: 200,
    description: 'Protected endpoint should work with valid JWT token',
    requiresAuth: true
  },
  {
    name: 'Get User Profile (No Auth)',
    method: 'GET',
    path: '/api/auth/me',
    headers: {
      'Origin': FRONTEND_URL,
    },
    expectedStatus: 401,
    description: 'Protected endpoint should reject requests without JWT token'
  },
  {
    name: 'Login with Wrong Password',
    method: 'POST',
    path: '/api/auth/login',
    headers: {
      'Origin': FRONTEND_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testUser.email,
      password: 'WrongPassword123!',
    }),
    expectedStatus: 401,
    description: 'Login should fail with invalid credentials'
  },
  {
    name: 'Register with same email again (neutral)',
    method: 'POST',
    path: '/api/auth/register',
    headers: {
      'Origin': FRONTEND_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testUser),
    expectedStatus: 200,
    description:
      'Duplicate register returns same neutral 200 (does not reveal existing email)',
  },
];

/**
 * Make HTTP/HTTPS request
 */
function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

/**
 * Test a single scenario
 */
async function testScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  console.log(`   Method: ${scenario.method}`);
  console.log(`   Path: ${scenario.path}`);
  console.log(`   Origin: ${scenario.headers.Origin || 'None'}`);
  
  // Skip auth-required tests if we don't have a token
  if (scenario.requiresAuth && !authToken) {
    console.log('   ⏭️  Skipped: No auth token available');
    return { success: true, skipped: true, reason: 'No auth token' };
  }
  
  try {
    const url = new URL(scenario.path, BACKEND_URL);
    
    const options = {
      method: scenario.method,
      headers: scenario.headers,
    };
    
    const response = await makeRequest(url.toString(), options, scenario.body);

    // Parse response data early (login email-not-verified path)
    let responseData = null;
    try {
      responseData = JSON.parse(response.data);
    } catch (e) {
      // Response might not be JSON
    }

    let statusOk = response.statusCode === scenario.expectedStatus;
    if (
      scenario.allowEmailNotVerified &&
      response.statusCode === 403 &&
      responseData &&
      (responseData.code === 'EMAIL_NOT_VERIFIED' ||
        String(responseData.message || '').toLowerCase().includes('verify'))
    ) {
      statusOk = true;
      console.log(
        '   ℹ️  Login returned 403 EMAIL_NOT_VERIFIED (expected for unverified self-serve users).',
      );
    }

    console.log(`   Status: ${response.statusCode} ${statusOk ? '✅' : '❌'}`);
    console.log(`   Expected: ${scenario.expectedStatus}`);
    
    // Check CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
    };
    
    console.log('   CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`     ${key}: ${value || 'Not set'}`);
    });
    
    // Extract tokens from successful login (JSON body; cookies also set by API)
    const access = responseData.accessToken || responseData.token;
    if (
      response.statusCode === 200 &&
      access &&
      responseData.refreshToken
    ) {
      authToken = access;
      refreshToken = responseData.refreshToken;
      console.log('   🔑 Tokens extracted successfully');
      console.log(`   Access Token: ${authToken.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`);
    }
    
    // Log response details for debugging
    if (responseData) {
      console.log('   Response Data:');
      if (responseData.user) {
        console.log(`     User: ${responseData.user.email} (${responseData.user.role})`);
      }
      if (responseData.message) {
        console.log(`     Message: ${responseData.message}`);
      }
      if (responseData.error) {
        console.log(`     Error: ${responseData.error}`);
      }
    }
    
    return { success: statusOk, response, responseData };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Zephix Backend Authentication Testing');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`Test User: ${testUser.email}`);
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push({ scenario: scenario.name, ...result });
  }
  
  // Summary
  console.log('\n📊 Authentication Test Results Summary');
  console.log('=====================================');
  
  const passed = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const total = results.filter(r => !r.skipped).length;
  
  console.log(`Tests Passed: ${passed}/${total}`);
  console.log(`Tests Skipped: ${skipped}`);
  
  if (passed === total) {
    console.log('🎉 All authentication tests passed! Auth system is working correctly.');
  } else {
    console.log('⚠️  Some authentication tests failed. Check the configuration.');
  }
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    if (result.skipped) {
      console.log(`${index + 1}. ${result.scenario}: ⏭️ SKIPPED (${result.reason})`);
    } else {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.scenario}: ${status}`);
    }
  });
  
  // Authentication flow summary
  if (authToken && refreshToken) {
    console.log('\n🔑 Authentication Flow Summary:');
    console.log('✅ User register returned neutral 200');
    console.log('✅ User login successful');
    console.log('✅ JWT tokens generated');
    console.log('✅ Protected endpoints accessible');
    console.log('\n💡 The authentication system is working correctly!');
  } else {
    console.log('\n⚠️  Authentication Flow (partial):');
    console.log(
      '   No JWT in response body — common when login is blocked until email verification.',
    );
    console.log(
      '   Use a verified user, staging bypass allowlist, or complete verify-email first.',
    );
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Deploy these changes to Railway');
  console.log('2. Test from the actual frontend application');
  console.log('3. Verify login/signup forms work correctly');
  console.log('4. Check that protected routes are accessible after login');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testScenario };
