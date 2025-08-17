/**
 * Authentication Testing Runner
 * Comprehensive testing of authentication endpoints and security features
 */

import { authApi } from '../services/api';
import { securityTester } from './securityTest';
import { securityMiddleware } from '../middleware/security.middleware';

export interface AuthTestResult {
  testName: string;
  passed: boolean;
  details: string;
  error?: string;
  response?: any;
  timestamp: string;
  duration: number;
}

export interface AuthTestSummary {
  total: number;
  passed: number;
  failed: number;
  securityTests: any;
  authTests: AuthTestResult[];
  backendConnectivity: boolean;
  apiEndpointValidation: boolean;
}

export class AuthTestRunner {
  private static instance: AuthTestRunner;
  private testResults: AuthTestResult[] = [];
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://zephix-backend-production.up.railway.app';
  }

  public static getInstance(): AuthTestRunner {
    if (!AuthTestRunner.instance) {
      AuthTestRunner.instance = new AuthTestRunner();
    }
    return AuthTestRunner.instance;
  }

  /**
   * Run comprehensive authentication tests
   */
  public async runAuthTests(): Promise<AuthTestSummary> {
    this.testResults = [];
    
    console.log('🧪 Starting comprehensive authentication tests...');
    console.log(`🌐 Testing backend: ${this.baseUrl}`);

    // Run security tests first
    const securityTests = await securityTester.runSecurityTests();
    console.log('🔒 Security tests completed');

    // Test backend connectivity
    await this.testBackendConnectivity();
    
    // Test API endpoint validation
    await this.testApiEndpointValidation();
    
    // Test signup flow
    await this.testSignupFlow();
    
    // Test login flow
    await this.testLoginFlow();
    
    // Test authentication security
    await this.testAuthenticationSecurity();
    
    // Test error handling
    await this.testErrorHandling();

    const summary = this.generateSummary(securityTests);
    this.logTestResults(summary);
    
    return summary;
  }

  /**
   * Test backend connectivity
   */
  private async testBackendConnectivity(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔌 Testing backend connectivity...');
      
      // Test health endpoint
      const response = await fetch(`${this.baseUrl}/health`);
      const isHealthy = response.ok;
      
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Backend Connectivity - Health Check',
        passed: isHealthy,
        details: `Health endpoint responded with status ${response.status}`,
        response: { status: response.status, ok: response.ok },
        timestamp: new Date().toISOString(),
        duration,
      });

      if (isHealthy) {
        console.log('✅ Backend connectivity test passed');
      } else {
        console.log('❌ Backend connectivity test failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Backend Connectivity - Health Check',
        passed: false,
        details: 'Failed to connect to backend health endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ Backend connectivity test failed:', error);
    }
  }

  /**
   * Test API endpoint validation
   */
  private async testApiEndpointValidation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Testing API endpoint validation...');
      
      // Test auth endpoints exist
      const endpoints = ['/auth/register', '/auth/login', '/auth/logout'];
      let allEndpointsValid = true;
      const endpointResults = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'OPTIONS',
            headers: { 'Origin': window.location.origin }
          });
          
          const isValid = response.ok || response.status === 405; // 405 Method Not Allowed is acceptable
          endpointResults.push({ endpoint, isValid, status: response.status });
          
          if (!isValid) {
            allEndpointsValid = false;
          }
        } catch (error) {
          endpointResults.push({ endpoint, isValid: false, error: error instanceof Error ? error.message : 'Unknown error' });
          allEndpointsValid = false;
        }
      }
      
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'API Endpoint Validation',
        passed: allEndpointsValid,
        details: `Tested ${endpoints.length} auth endpoints`,
        response: { endpoints: endpointResults },
        timestamp: new Date().toISOString(),
        duration,
      });

      if (allEndpointsValid) {
        console.log('✅ API endpoint validation passed');
      } else {
        console.log('❌ API endpoint validation failed');
        console.log('Endpoint results:', endpointResults);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'API Endpoint Validation',
        passed: false,
        details: 'Failed to validate API endpoints',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ API endpoint validation failed:', error);
    }
  }

  /**
   * Test signup flow
   */
  private async testSignupFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('📝 Testing signup flow...');
      
      // Test with valid data
      const testUserData = {
        firstName: 'Test',
        lastName: 'User',
        email: `test.${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };
      
      const response = await authApi.register(testUserData);
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Signup Flow - Valid Data',
        passed: !!response && !!response.accessToken,
        details: 'User registration with valid data',
        response: { 
          hasUser: !!response.user, 
          hasToken: !!response.accessToken,
          userId: response.user?.id 
        },
        timestamp: new Date().toISOString(),
        duration,
      });

      if (response && response.accessToken) {
        console.log('✅ Signup flow test passed');
        
        // Clean up test user (if possible)
        try {
          // Note: In production, you might want to implement test user cleanup
          console.log('🧹 Test user created successfully, consider cleanup in production');
        } catch (cleanupError) {
          console.log('⚠️ Test user cleanup not implemented');
        }
      } else {
        console.log('❌ Signup flow test failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Signup Flow - Valid Data',
        passed: false,
        details: 'User registration failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ Signup flow test failed:', error);
    }
  }

  /**
   * Test login flow
   */
  private async testLoginFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🔐 Testing login flow...');
      
      // Test with demo credentials (if available)
      const testCredentials = {
        email: 'demo@zephix.com',
        password: 'ZephixDemo2024!'
      };
      
      const response = await authApi.login(testCredentials);
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Login Flow - Demo Credentials',
        passed: !!response && !!response.accessToken,
        details: 'User login with demo credentials',
        response: { 
          hasUser: !!response.user, 
          hasToken: !!response.accessToken,
          userId: response.user?.id 
        },
        timestamp: new Date().toISOString(),
        duration,
      });

      if (response && response.accessToken) {
        console.log('✅ Login flow test passed');
      } else {
        console.log('❌ Login flow test failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Login Flow - Demo Credentials',
        passed: false,
        details: 'User login failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ Login flow test failed:', error);
    }
  }

  /**
   * Test authentication security
   */
  private async testAuthenticationSecurity(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🛡️ Testing authentication security...');
      
      // Test invalid credentials
      const invalidCredentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };
      
      try {
        await authApi.login(invalidCredentials);
        
        // If we get here, the test should fail (we expect an error)
        this.addTestResult({
          testName: 'Authentication Security - Invalid Credentials',
          passed: false,
          details: 'Login with invalid credentials should have failed',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
        
        console.log('❌ Authentication security test failed: Invalid credentials accepted');
      } catch (error) {
        // This is expected behavior
        this.addTestResult({
          testName: 'Authentication Security - Invalid Credentials',
          passed: true,
          details: 'Login with invalid credentials properly rejected',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
        
        console.log('✅ Authentication security test passed: Invalid credentials properly rejected');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Authentication Security - Invalid Credentials',
        passed: false,
        details: 'Authentication security test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ Authentication security test failed:', error);
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('⚠️ Testing error handling...');
      
      // Test with malformed data
      const malformedData = {
        email: 'invalid-email',
        password: '123' // Too short
      };
      
      try {
        await authApi.login(malformedData as any);
        
        // If we get here, the test should fail (we expect an error)
        this.addTestResult({
          testName: 'Error Handling - Malformed Data',
          passed: false,
          details: 'Login with malformed data should have failed',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
        
        console.log('❌ Error handling test failed: Malformed data accepted');
      } catch (error) {
        // This is expected behavior
        this.addTestResult({
          testName: 'Error Handling - Malformed Data',
          passed: true,
          details: 'Login with malformed data properly rejected',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
        
        console.log('✅ Error handling test passed: Malformed data properly rejected');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addTestResult({
        testName: 'Error Handling - Malformed Data',
        passed: false,
        details: 'Error handling test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration,
      });
      
      console.log('❌ Error handling test failed:', error);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(result: AuthTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Generate test summary
   */
  private generateSummary(securityTests: any): AuthTestSummary {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    // Check if backend connectivity test passed
    const backendConnectivity = this.testResults.find(r => 
      r.testName === 'Backend Connectivity - Health Check'
    )?.passed || false;
    
    // Check if API endpoint validation test passed
    const apiEndpointValidation = this.testResults.find(r => 
      r.testName === 'API Endpoint Validation'
    )?.passed || false;

    return {
      total,
      passed,
      failed,
      securityTests,
      authTests: this.testResults,
      backendConnectivity,
      apiEndpointValidation,
    };
  }

  /**
   * Log test results
   */
  private logTestResults(summary: AuthTestSummary): void {
    console.log('\n📊 AUTHENTICATION TEST RESULTS SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Backend Connectivity: ${summary.backendConnectivity ? '✅' : '❌'}`);
    console.log(`API Endpoint Validation: ${summary.apiEndpointValidation ? '✅' : '❌'}`);
    
    if (summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`  - ${test.testName}: ${test.error || test.details}`);
      });
    }
    
    console.log('\n🔒 SECURITY TEST RESULTS:');
    const securitySummary = summary.securityTests.getTestSummary();
    console.log(`  Total: ${securitySummary.total}`);
    console.log(`  Passed: ${securitySummary.passed} ✅`);
    console.log(`  Failed: ${securitySummary.failed} ❌`);
    
    if (securitySummary.failed > 0) {
      console.log('  Failed Security Tests:');
      summary.securityTests.getFailedTests().forEach(test => {
        console.log(`    - ${test.testName}: ${test.details}`);
      });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (!summary.backendConnectivity) {
      console.log('  🚨 CRITICAL: Backend is not accessible. Check deployment and network configuration.');
    }
    if (!summary.apiEndpointValidation) {
      console.log('  ⚠️ WARNING: API endpoints validation failed. Check backend route configuration.');
    }
    if (summary.failed > 0) {
      console.log('  🔧 Review failed authentication tests and fix issues before production deployment.');
    }
    if (securitySummary.failed > 0) {
      console.log('  🛡️ Security tests failed. Review security configuration before production deployment.');
    }
    if (summary.passed === summary.total && securitySummary.passed === securitySummary.total) {
      console.log('  🎉 All tests passed! Your authentication system is ready for production.');
    }
  }
}

// Export singleton instance
export const authTestRunner = AuthTestRunner.getInstance();
export default authTestRunner;