const axios = require('axios');

const BASE_URL = 'https://zephix-backend-production.up.railway.app';
const TEST_EMAIL = `test_${Date.now()}@demo.com`;
const TEST_PASSWORD = 'Test123!';
let authToken = '';
let userId = '';
let projectId = '';

const testResults = {
  passed: [],
  failed: [],
  errors: []
};

async function runTests() {
  console.log('🚀 Starting Zephix Backend System Test\n');
  console.log('Base URL:', BASE_URL);
  console.log('Test Email:', TEST_EMAIL);
  console.log('=====================================\n');

  // TEST 1: Health Check
  try {
    console.log('TEST 1: Health Check');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health Status:', health.data.status);
    testResults.passed.push('Health Check');
  } catch (error) {
    console.log('❌ Health Check Failed:', error.response?.data || error.message);
    testResults.failed.push('Health Check');
  }

  // TEST 2: User Registration
  try {
    console.log('\nTEST 2: User Registration');
    const register = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    authToken = register.data.accessToken;
    userId = register.data.user.id;
    console.log('✅ Registration successful');
    console.log('  User ID:', userId);
    console.log('  Email verified:', register.data.user.isEmailVerified);
    console.log('  Token received:', authToken ? 'Yes' : 'No');
    testResults.passed.push('User Registration');
  } catch (error) {
    console.log('❌ Registration Failed:', error.response?.data || error.message);
    testResults.failed.push('User Registration');
  }

  // TEST 3: User Login
  try {
    console.log('\nTEST 3: User Login');
    const login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    authToken = login.data.accessToken;
    console.log('✅ Login successful');
    console.log('  Token refreshed:', authToken ? 'Yes' : 'No');
    testResults.passed.push('User Login');
  } catch (error) {
    console.log('❌ Login Failed:', error.response?.data || error.message);
    testResults.failed.push('User Login');
  }

  // TEST 4: Dashboard Endpoint
  try {
    console.log('\nTEST 4: Dashboard Endpoint');
    const dashboard = await axios.get(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Dashboard accessed successfully');
    console.log('  Projects count:', dashboard.data.myProjects?.length || 0);
    console.log('  Risks count:', dashboard.data.risksNeedingAttention?.length || 0);
    console.log('  Statistics:', JSON.stringify(dashboard.data.statistics));
    testResults.passed.push('Dashboard Endpoint');
  } catch (error) {
    console.log('❌ Dashboard Failed:', error.response?.data || error.message);
    testResults.failed.push('Dashboard Endpoint');
  }

  // TEST 5: Create Project
  try {
    console.log('\nTEST 5: Create Project');
    const project = await axios.post(`${BASE_URL}/api/projects`, {
      name: 'Test Project ' + Date.now(),
      description: 'Automated test project',
      methodology: 'WATERFALL',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      budget: 100000
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    projectId = project.data.id;
    console.log('✅ Project created successfully');
    console.log('  Project ID:', projectId);
    console.log('  Methodology:', project.data.methodology);
    console.log('  Status:', project.data.status);
    testResults.passed.push('Create Project');
  } catch (error) {
    console.log('❌ Create Project Failed:', error.response?.data || error.message);
    testResults.failed.push('Create Project');
  }

  // TEST 6: List Projects
  try {
    console.log('\nTEST 6: List Projects');
    const projects = await axios.get(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Projects listed successfully');
    console.log('  Total projects:', projects.data.length || 0);
    if (projects.data.length > 0) {
      console.log('  First project:', projects.data[0].name);
    }
    testResults.passed.push('List Projects');
  } catch (error) {
    console.log('❌ List Projects Failed:', error.response?.data || error.message);
    testResults.failed.push('List Projects');
  }

  // TEST 7: Get Single Project
  if (projectId) {
    try {
      console.log('\nTEST 7: Get Single Project');
      const project = await axios.get(`${BASE_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Project retrieved successfully');
      console.log('  Name:', project.data.name);
      console.log('  Budget:', project.data.budget);
      testResults.passed.push('Get Single Project');
    } catch (error) {
      console.log('❌ Get Project Failed:', error.response?.data || error.message);
      testResults.failed.push('Get Single Project');
    }
  }

  // TEST 8: Risk Analysis
  if (projectId) {
    try {
      console.log('\nTEST 8: Risk Analysis');
      const risks = await axios.post(`${BASE_URL}/api/projects/${projectId}/risks`, {
        riskSources: ['budget', 'schedule', 'scope'],
        scanDepth: 'comprehensive',
        focusAreas: ['timeline', 'resources']
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Risk analysis performed');
      console.log('  Analysis type:', risks.data.analysisType || 'Unknown');
      console.log('  Risks found:', risks.data.risks?.length || 0);
      testResults.passed.push('Risk Analysis');
    } catch (error) {
      console.log('❌ Risk Analysis Failed:', error.response?.data || error.message);
      testResults.failed.push('Risk Analysis');
    }
  }

  // TEST 9: Get Project Risks
  if (projectId) {
    try {
      console.log('\nTEST 9: Get Project Risks');
      const risks = await axios.get(`${BASE_URL}/api/projects/${projectId}/risks`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Risks retrieved successfully');
      console.log('  Total risks:', risks.data.risks?.length || 0);
      testResults.passed.push('Get Project Risks');
    } catch (error) {
      console.log('❌ Get Risks Failed:', error.response?.data || error.message);
      testResults.failed.push('Get Project Risks');
    }
  }

  // FINAL REPORT
  console.log('\n=====================================');
  console.log('📊 TEST SUMMARY');
  console.log('=====================================');
  console.log(`✅ Passed: ${testResults.passed.length} tests`);
  console.log(`❌ Failed: ${testResults.failed.length} tests`);
  
  if (testResults.passed.length > 0) {
    console.log('\nPassed Tests:');
    testResults.passed.forEach(test => console.log(`  ✓ ${test}`));
  }
  
  if (testResults.failed.length > 0) {
    console.log('\nFailed Tests:');
    testResults.failed.forEach(test => console.log(`  ✗ ${test}`));
  }

  console.log('\n=====================================');
  console.log('SYSTEM STATUS:', testResults.failed.length === 0 ? '✅ FULLY OPERATIONAL' : '⚠️ PARTIAL FAILURE');
  console.log('=====================================');
}

// Install axios if not present
const { exec } = require('child_process');
exec('npm list axios', (error) => {
  if (error) {
    console.log('Installing axios...');
    exec('npm install axios', (err) => {
      if (err) {
        console.error('Failed to install axios:', err);
        return;
      }
      runTests();
    });
  } else {
    runTests();
  }
});
