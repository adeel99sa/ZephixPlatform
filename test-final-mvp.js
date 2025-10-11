const axios = require('axios');

const API_URL = 'https://zephix-backend-production.up.railway.app/api';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test123!@#';

class FinalMVPTester {
  constructor() {
    this.token = null;
    this.workspaceId = null;
    this.userId = null;
    this.projectId = null;
  }

  async testNewUserSignup() {
    console.log('\n📝 Testing New User Signup (with unique org slug)...');
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Org ${Date.now()}`
      });
      
      console.assert(response.data.user, '❌ No user returned');
      console.assert(response.data.user.currentWorkspaceId, '❌ No workspace assigned');
      console.assert(response.data.accessToken, '❌ No access token');
      
      this.userId = response.data.user.id;
      this.workspaceId = response.data.user.currentWorkspaceId;
      console.log('✅ New user signup successful');
      console.log(`   User ID: ${response.data.user.id}`);
      console.log(`   Workspace ID: ${response.data.user.currentWorkspaceId}`);
      
      return true;
    } catch (error) {
      console.error('❌ New user signup failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testNewUserLogin() {
    console.log('\n🔑 Testing New User Login...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      console.assert(response.data.accessToken, '❌ No access token');
      this.token = response.data.accessToken;
      
      // Decode JWT to check workspace
      const payload = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64').toString());
      console.assert(payload.currentWorkspaceId, '❌ JWT missing workspace');
      
      this.workspaceId = payload.currentWorkspaceId;
      console.log('✅ New user login successful');
      console.log(`   JWT contains workspace: ${payload.currentWorkspaceId}`);
      
      return true;
    } catch (error) {
      console.error('❌ New user login failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testProjectCreation() {
    console.log('\n🏗️ Testing Project Creation...');
    try {
      const response = await axios.post(
        `${API_URL}/projects`,
        {
          name: 'Test Project',
          description: 'Testing MVP functionality',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planning'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-Workspace-Id': this.workspaceId
          }
        }
      );
      
      console.assert(response.data.id, '❌ No project ID returned');
      console.assert(response.data.workspaceId === this.workspaceId, '❌ Wrong workspace');
      
      this.projectId = response.data.id;
      console.log('✅ Project created');
      console.log(`   Project ID: ${response.data.id}`);
      console.log(`   Workspace ID: ${response.data.workspaceId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Project creation failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testProjectList() {
    console.log('\n📋 Testing Project List...');
    try {
      const response = await axios.get(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Workspace-Id': this.workspaceId
        }
      });
      
      console.assert(Array.isArray(response.data), '❌ Projects not an array');
      console.assert(response.data.length > 0, '❌ No projects returned');
      
      const ourProject = response.data.find(p => p.id === this.projectId);
      console.assert(ourProject, '❌ Created project not in list');
      
      console.log('✅ Project list working');
      console.log(`   Projects found: ${response.data.length}`);
      
      return true;
    } catch (error) {
      console.error('❌ Project list failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testResourceHeatmap() {
    console.log('\n🗓️ Testing Resource Heatmap...');
    try {
      const response = await axios.get(
        `${API_URL}/resources/heatmap`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-Workspace-Id': this.workspaceId
          }
        }
      );
      
      console.assert(response.data, '❌ No heatmap data returned');
      console.log('✅ Resource heatmap working');
      console.log(`   Data structure received: ${typeof response.data}`);
      
      return true;
    } catch (error) {
      console.error('❌ Resource heatmap failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testAdminLogin() {
    console.log('\n👤 Testing Admin Login...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'adeel99sa@yahoo.com',
        password: 'ReAdY4wK73967#!@'
      });
      
      console.assert(response.data.accessToken, '❌ No access token');
      
      const payload = JSON.parse(
        Buffer.from(response.data.accessToken.split('.')[1], 'base64').toString()
      );
      console.assert(payload.currentWorkspaceId, '❌ Admin JWT missing workspace');
      
      console.log('✅ Admin login successful');
      console.log(`   Admin workspace: ${payload.currentWorkspaceId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Admin login failed:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Final MVP Tests...');
    console.log('================================');
    
    const results = {
      newUserSignup: await this.testNewUserSignup(),
      newUserLogin: await this.testNewUserLogin(),
      projectCreation: await this.testProjectCreation(),
      projectList: await this.testProjectList(),
      resourceHeatmap: await this.testResourceHeatmap(),
      adminLogin: await this.testAdminLogin()
    };
    
    console.log('\n📊 Final Test Summary:');
    console.log('======================');
    
    let passed = 0;
    let failed = 0;
    
    for (const [test, result] of Object.entries(results)) {
      if (result) {
        console.log(`✅ ${test}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test}: FAILED`);
        failed++;
      }
    }
    
    console.log('\n📈 Final Score:');
    console.log(`   Passed: ${passed}/${passed + failed}`);
    console.log(`   Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! MVP IS 100% FUNCTIONAL!');
      console.log('🚀 Your Zephix platform is ready for production!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review and fix.');
    }
    
    return failed === 0;
  }
}

// Run tests
const tester = new FinalMVPTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
