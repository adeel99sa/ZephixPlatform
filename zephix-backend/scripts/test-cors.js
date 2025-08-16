#!/usr/bin/env node

/**
 * CORS Testing Script for Zephix Backend
 * 
 * This script tests CORS configuration by making requests from different origins
 * to verify that the backend properly handles CORS for Railway deployment.
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://zephix-frontend-production.up.railway.app';

// Test scenarios
const testScenarios = [
  {
    name: 'OPTIONS Preflight Request (Frontend Origin)',
    method: 'OPTIONS',
    headers: {
      'Origin': FRONTEND_URL,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Authorization,Content-Type',
    },
    expectedStatus: 204,
  },
  {
    name: 'POST Login Request (Frontend Origin)',
    method: 'POST',
    path: '/api/auth/login',
    headers: {
      'Origin': FRONTEND_URL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword',
    }),
    expectedStatus: [400, 401, 422], // Any of these statuses means CORS worked
  },
  {
    name: 'GET Health Check (Frontend Origin)',
    method: 'GET',
    path: '/api/health',
    headers: {
      'Origin': FRONTEND_URL,
    },
    expectedStatus: 200,
  },
  {
    name: 'OPTIONS Preflight Request (Invalid Origin)',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://malicious-site.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Authorization,Content-Type',
    },
    expectedStatus: 204, // Should still return 204 but without CORS headers
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
  console.log(`   Method: ${scenario.method}`);
  console.log(`   Path: ${scenario.path || '/'}`);
  console.log(`   Origin: ${scenario.headers.Origin || 'None'}`);
  
  try {
    const url = new URL(scenario.path || '/', BACKEND_URL);
    
    const options = {
      method: scenario.method,
      headers: scenario.headers,
    };
    
    const response = await makeRequest(url.toString(), options, scenario.body);
    
    // Check status code
    const expectedStatuses = Array.isArray(scenario.expectedStatus) 
      ? scenario.expectedStatus 
      : [scenario.expectedStatus];
    
    const statusOk = expectedStatuses.includes(response.statusCode);
    
    // Check CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Max-Age': response.headers['access-control-max-age'],
    };
    
    console.log(`   Status: ${response.statusCode} ${statusOk ? '✅' : '❌'}`);
    console.log(`   Expected: ${expectedStatuses.join(' or ')}`);
    
    // Log CORS headers
    console.log('   CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`     ${key}: ${value || 'Not set'}`);
    });
    
    // Validate CORS for frontend origin
    if (scenario.headers.Origin === FRONTEND_URL) {
      const originHeader = response.headers['access-control-allow-origin'];
      const credentialsHeader = response.headers['access-control-allow-credentials'];
      
      if (originHeader === FRONTEND_URL || originHeader === '*') {
        console.log('   ✅ CORS Origin: Correctly configured');
      } else {
        console.log('   ❌ CORS Origin: Incorrectly configured');
      }
      
      if (credentialsHeader === 'true') {
        console.log('   ✅ CORS Credentials: Enabled');
      } else {
        console.log('   ❌ CORS Credentials: Disabled');
      }
    }
    
    return { success: statusOk, response };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Zephix Backend CORS Testing');
  console.log('================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'Not set'}`);
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push({ scenario: scenario.name, ...result });
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Tests Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All CORS tests passed! Frontend should be able to connect.');
  } else {
    console.log('⚠️  Some CORS tests failed. Check the configuration.');
  }
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.scenario}: ${status}`);
  });
  
  console.log('\n💡 Next Steps:');
  console.log('1. Deploy these changes to Railway');
  console.log('2. Test from the actual frontend application');
  console.log('3. Check browser console for any remaining CORS errors');
  console.log('4. Verify JWT authentication flow works correctly');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testScenario };
