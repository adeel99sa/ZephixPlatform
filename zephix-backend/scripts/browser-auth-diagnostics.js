#!/usr/bin/env node
/**
 * Browser Authentication Diagnostics Script
 * 
 * This script simulates browser authentication flow and captures
 * all the information needed for debugging authentication issues.
 * 
 * Usage: node scripts/browser-auth-diagnostics.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class BrowserAuthDiagnostics {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.testCredentials = {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'testpassword123'
    };
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        frontendUrl: this.frontendUrl,
        backendUrl: this.backendUrl,
        userAgent: 'Zephix-Diagnostics/1.0'
      },
      tests: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalIssues: []
      }
    };
  }

  async runTest(name, testFn) {
    const testStart = Date.now();
    console.log(`🧪 Running test: ${name}`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - testStart;
      
      this.results.tests[name] = {
        success: true,
        duration,
        details: result
      };
      
      this.results.summary.passedTests++;
      console.log(`✅ ${name}: PASSED (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - testStart;
      const errorMessage = error.message || String(error);
      
      this.results.tests[name] = {
        success: false,
        duration,
        error: errorMessage,
        details: error.response?.data || error
      };
      
      this.results.summary.failedTests++;
      console.log(`❌ ${name}: FAILED (${duration}ms) - ${errorMessage}`);
      
      if (this.isCriticalIssue(name, errorMessage)) {
        this.results.summary.criticalIssues.push(`${name}: ${errorMessage}`);
      }
    }
    
    this.results.summary.totalTests++;
  }

  isCriticalIssue(testName, error) {
    const criticalPatterns = [
      /unauthorized/i,
      /forbidden/i,
      /invalid.*token/i,
      /authentication.*failed/i,
      /cors.*error/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(error));
  }

  // Test 1: Pre-authentication state
  async testPreAuthState() {
    const response = await axios.get(`${this.backendUrl}/health`, {
      timeout: 10000,
      headers: {
        'User-Agent': this.results.environment.userAgent
      }
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: {
        'content-type': response.headers['content-type'],
        'x-request-id': response.headers['x-request-id'],
        'access-control-allow-origin': response.headers['access-control-allow-origin']
      }
    };
  }

  // Test 2: CORS preflight for login
  async testCorsPreflight() {
    const response = await axios.options(`${this.backendUrl}/auth/login`, {
      headers: {
        'Origin': this.frontendUrl,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization',
        'User-Agent': this.results.environment.userAgent
      },
      timeout: 10000
    });
    
    return {
      status: response.status,
      corsHeaders: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers'],
        'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
        'access-control-max-age': response.headers['access-control-max-age']
      }
    };
  }

  // Test 3: Login attempt
  async testLoginAttempt() {
    const response = await axios.post(`${this.backendUrl}/auth/login`, this.testCredentials, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.frontendUrl,
        'User-Agent': this.results.environment.userAgent
      }
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: {
        'content-type': response.headers['content-type'],
        'x-request-id': response.headers['x-request-id']
      },
      hasToken: !!response.data.accessToken,
      tokenType: response.data.accessToken ? typeof response.data.accessToken : 'none',
      userData: response.data.user ? {
        id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName
      } : null
    };
  }

  // Test 4: Profile access with token
  async testProfileAccess() {
    // First get a token
    const loginResponse = await axios.post(`${this.backendUrl}/auth/login`, this.testCredentials, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.frontendUrl
      }
    });
    
    if (!loginResponse.data.accessToken) {
      throw new Error('No access token received from login');
    }
    
    const token = loginResponse.data.accessToken;
    
    // Test profile access
    const profileResponse = await axios.get(`${this.backendUrl}/auth/profile`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': this.frontendUrl,
        'User-Agent': this.results.environment.userAgent
      }
    });
    
    return {
      status: profileResponse.status,
      data: profileResponse.data,
      headers: {
        'content-type': profileResponse.headers['content-type'],
        'x-request-id': profileResponse.headers['x-request-id']
      },
      tokenValid: true,
      userData: profileResponse.data.user
    };
  }

  // Test 5: Invalid token handling
  async testInvalidTokenHandling() {
    const invalidToken = 'invalid.jwt.token';
    
    try {
      await axios.get(`${this.backendUrl}/auth/profile`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'Origin': this.frontendUrl,
          'User-Agent': this.results.environment.userAgent
        }
      });
      
      throw new Error('Expected 401 for invalid token but got success');
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          status: error.response.status,
          data: error.response.data,
          expectedBehavior: true,
          errorType: 'unauthorized'
        };
      } else {
        throw new Error(`Unexpected response for invalid token: ${error.response?.status}`);
      }
    }
  }

  // Test 6: Token refresh flow
  async testTokenRefresh() {
    // First get a token
    const loginResponse = await axios.post(`${this.backendUrl}/auth/login`, this.testCredentials, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.frontendUrl
      }
    });
    
    if (!loginResponse.data.accessToken) {
      throw new Error('No access token received from login');
    }
    
    const token = loginResponse.data.accessToken;
    
    // Test refresh endpoint
    try {
      const refreshResponse = await axios.post(`${this.backendUrl}/auth/refresh`, {
        refreshToken: token // Using access token as refresh token for testing
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Origin': this.frontendUrl,
          'User-Agent': this.results.environment.userAgent
        }
      });
      
      return {
        status: refreshResponse.status,
        data: refreshResponse.data,
        hasNewToken: !!refreshResponse.data.accessToken,
        tokenType: response.data.accessToken ? typeof response.data.accessToken : 'none'
      };
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        return {
          status: error.response.status,
          data: error.response.data,
          expectedBehavior: true,
          errorType: 'invalid_refresh_token'
        };
      } else {
        throw error;
      }
    }
  }

  // Test 7: Logout flow
  async testLogoutFlow() {
    // First get a token
    const loginResponse = await axios.post(`${this.backendUrl}/auth/login`, this.testCredentials, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Origin': this.frontendUrl
      }
    });
    
    if (!loginResponse.data.accessToken) {
      throw new Error('No access token received from login');
    }
    
    const token = loginResponse.data.accessToken;
    
    // Test logout
    const logoutResponse = await axios.post(`${this.backendUrl}/auth/logout`, {}, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': this.frontendUrl,
        'User-Agent': this.results.environment.userAgent
      }
    });
    
    return {
      status: logoutResponse.status,
      data: logoutResponse.data,
      logoutSuccessful: logoutResponse.status === 200
    };
  }

  // Test 8: Rate limiting behavior
  async testRateLimiting() {
    const attempts = [];
    
    // Make multiple login attempts to test rate limiting
    for (let i = 0; i < 6; i++) {
      try {
        const response = await axios.post(`${this.backendUrl}/auth/login`, {
          email: `test${i}@example.com`,
          password: 'wrongpassword'
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'Origin': this.frontendUrl,
            'User-Agent': this.results.environment.userAgent
          }
        });
        
        attempts.push({
          attempt: i + 1,
          status: response.status,
          rateLimited: false
        });
      } catch (error) {
        attempts.push({
          attempt: i + 1,
          status: error.response?.status || 'error',
          rateLimited: error.response?.status === 429,
          error: error.response?.data?.message || error.message
        });
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const rateLimitedAttempts = attempts.filter(a => a.rateLimited);
    
    return {
      attempts,
      totalAttempts: attempts.length,
      rateLimitedCount: rateLimitedAttempts.length,
      rateLimitingWorking: rateLimitedAttempts.length > 0
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Browser Authentication Diagnostics...\n');
    
    await this.runTest('Pre-authentication State', () => this.testPreAuthState());
    await this.runTest('CORS Preflight Check', () => this.testCorsPreflight());
    await this.runTest('Login Attempt', () => this.testLoginAttempt());
    await this.runTest('Profile Access with Token', () => this.testProfileAccess());
    await this.runTest('Invalid Token Handling', () => this.testInvalidTokenHandling());
    await this.runTest('Token Refresh Flow', () => this.testTokenRefresh());
    await this.runTest('Logout Flow', () => this.testLogoutFlow());
    await this.runTest('Rate Limiting Behavior', () => this.testRateLimiting());
    
    this.generateReport();
  }

  generateReport() {
    const totalDuration = Date.now() - new Date(this.results.timestamp).getTime();
    
    console.log('\n📊 BROWSER AUTHENTICATION DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`Passed: ${this.results.summary.passedTests} ✅`);
    console.log(`Failed: ${this.results.summary.failedTests} ❌`);
    console.log(`Duration: ${totalDuration}ms`);
    
    if (this.results.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results.summary.criticalIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'browser-auth-diagnostics-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    const recommendations = [];
    
    // Analyze test results and generate recommendations
    if (this.results.tests['CORS Preflight Check']?.success === false) {
      recommendations.push('Fix CORS configuration - preflight requests are failing');
    }
    
    if (this.results.tests['Login Attempt']?.success === false) {
      recommendations.push('Investigate login endpoint - authentication is failing');
    }
    
    if (this.results.tests['Profile Access with Token']?.success === false) {
      recommendations.push('Check JWT validation - tokens are not being accepted');
    }
    
    if (this.results.tests['Rate Limiting Behavior']?.success === true && 
        this.results.tests['Rate Limiting Behavior']?.details?.rateLimitingWorking === false) {
      recommendations.push('Rate limiting may not be properly configured');
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No specific recommendations at this time');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Review the detailed report above');
    console.log('2. Address any critical issues first');
    console.log('3. Test authentication flow manually in browser');
    console.log('4. Check browser console for JavaScript errors');
    console.log('5. Verify network requests in browser dev tools');
  }
}

// Main execution
async function main() {
  try {
    const diagnostics = new BrowserAuthDiagnostics();
    await diagnostics.runAllTests();
  } catch (error) {
    console.error('❌ Browser diagnostic script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { BrowserAuthDiagnostics };
