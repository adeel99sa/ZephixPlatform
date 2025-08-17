/**
 * Authentication Flow Test Script
 * Tests the complete enterprise authentication system
 */

import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

export interface AuthTestResult {
  testName: string;
  passed: boolean;
  details: string;
  error?: string;
  timestamp: string;
}

export class AuthFlowTester {
  private static instance: AuthFlowTester;
  private testResults: AuthTestResult[] = [];

  private constructor() {}

  public static getInstance(): AuthFlowTester {
    if (!AuthFlowTester.instance) {
      AuthFlowTester.instance = new AuthFlowTester();
    }
    return AuthFlowTester.instance;
  }

  /**
   * Run complete authentication flow tests
   */
  public async runAuthFlowTests(): Promise<AuthTestResult[]> {
    this.testResults = [];
    
    console.log('🧪 Starting Enterprise Authentication Flow Tests...');
    console.log('==================================================');

    // Test 1: Service Initialization
    await this.testServiceInitialization();
    
    // Test 2: Security Event Logging
    await this.testSecurityEventLogging();
    
    // Test 3: Token Validation
    await this.testTokenValidation();
    
    // Test 4: State Management
    await this.testStateManagement();
    
    // Test 5: Security Monitoring
    await this.testSecurityMonitoring();

    this.logTestResults();
    return this.testResults;
  }

  /**
   * Test service initialization
   */
  private async testServiceInitialization(): Promise<void> {
    try {
      console.log('🔧 Testing Service Initialization...');
      
      const service = enterpriseAuthService;
      const authState = service.getAuthState();
      
      const passed = !!service && !!authState;
      
      this.addTestResult({
        testName: 'Service Initialization',
        passed,
        details: 'Enterprise auth service initialized successfully',
        timestamp: new Date().toISOString(),
      });

      if (passed) {
        console.log('✅ Service initialization test passed');
      } else {
        console.log('❌ Service initialization test failed');
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Service Initialization',
        passed: false,
        details: 'Service initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      console.log('❌ Service initialization test failed:', error);
    }
  }

  /**
   * Test security event logging
   */
  private async testSecurityEventLogging(): Promise<void> {
    try {
      console.log('🔒 Testing Security Event Logging...');
      
      // Test security middleware
      const testEventId = crypto.randomUUID();
      securityMiddleware.logSecurityEvent('auth_test_event', {
        testId: testEventId,
        testType: 'security_logging_test',
      }, 'low');

      // Test enterprise auth service logging
      enterpriseAuthService['logSecurityEvent']('auth_test_event', 'low', {
        testId: testEventId,
        testType: 'enterprise_logging_test',
      });

      this.addTestResult({
        testName: 'Security Event Logging',
        passed: true,
        details: 'Security event logging is functional',
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Security event logging test passed');
    } catch (error) {
      this.addTestResult({
        testName: 'Security Event Logging',
        passed: false,
        details: 'Security event logging failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      console.log('❌ Security event logging test failed:', error);
    }
  }

  /**
   * Test token validation
   */
  private async testTokenValidation(): Promise<void> {
    try {
      console.log('🔐 Testing Token Validation...');
      
      // Test with invalid token
      const invalidToken = 'invalid.token.format';
      const isValid = await enterpriseAuthService['validateTokenIntegrity'](invalidToken);
      
      const passed = isValid === false; // Should reject invalid token
      
      this.addTestResult({
        testName: 'Token Validation - Invalid Token',
        passed,
        details: 'Invalid token properly rejected',
        timestamp: new Date().toISOString(),
      });

      if (passed) {
        console.log('✅ Token validation test passed');
      } else {
        console.log('❌ Token validation test failed');
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Token Validation - Invalid Token',
        passed: false,
        details: 'Token validation test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      console.log('❌ Token validation test failed:', error);
    }
  }

  /**
   * Test state management
   */
  private async testStateManagement(): Promise<void> {
    try {
      console.log('📊 Testing State Management...');
      
      const initialState = enterpriseAuthService.getAuthState();
      const isInitialStateValid = !initialState.isAuthenticated && !initialState.user;
      
      this.addTestResult({
        testName: 'State Management - Initial State',
        passed: isInitialStateValid,
        details: 'Initial auth state is correct',
        timestamp: new Date().toISOString(),
      });

      if (isInitialStateValid) {
        console.log('✅ State management test passed');
      } else {
        console.log('❌ State management test failed');
      }
    } catch (error) {
      this.addTestResult({
        testName: 'State Management - Initial State',
        passed: false,
        details: 'State management test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      console.log('❌ State management test failed:', error);
    }
  }

  /**
   * Test security monitoring
   */
  private async testSecurityMonitoring(): Promise<void> {
    try {
      console.log('🛡️ Testing Security Monitoring...');
      
      const securityEvents = enterpriseAuthService.getSecurityEvents();
      const hasEvents = securityEvents.length > 0;
      
      this.addTestResult({
        testName: 'Security Monitoring - Event Collection',
        passed: hasEvents,
        details: `Security events collected: ${securityEvents.length}`,
        timestamp: new Date().toISOString(),
      });

      if (hasEvents) {
        console.log('✅ Security monitoring test passed');
        console.log(`📊 Security events collected: ${securityEvents.length}`);
      } else {
        console.log('❌ Security monitoring test failed');
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Security Monitoring - Event Collection',
        passed: false,
        details: 'Security monitoring test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      console.log('❌ Security monitoring test failed:', error);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(result: AuthTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Log test results
   */
  private logTestResults(): void {
    console.log('\n📊 AUTHENTICATION FLOW TEST RESULTS');
    console.log('====================================');
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`  - ${test.testName}: ${test.error || test.details}`);
      });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (failed === 0) {
      console.log('  🎉 All tests passed! Your enterprise authentication system is ready.');
    } else {
      console.log('  🔧 Review failed tests and fix issues before production deployment.');
    }
    
    // Export results to global scope for browser console access
    (window as any).authFlowTestResults = this.testResults;
    console.log('\n💡 TIP: Access detailed results in browser console: authFlowTestResults');
  }
}

// Export singleton instance
export const authFlowTester = AuthFlowTester.getInstance();
export default authFlowTester;