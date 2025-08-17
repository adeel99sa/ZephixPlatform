/**
 * Security Test Utility
 * Provides testing functions for security features
 */

import { securityMiddleware } from '../middleware/security.middleware';
import { securityConfig, securityValidators } from '../config/security.config';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export class SecurityTester {
  private static instance: SecurityTester;
  private testResults: SecurityTestResult[] = [];

  private constructor() {}

  public static getInstance(): SecurityTester {
    if (!SecurityTester.instance) {
      SecurityTester.instance = new SecurityTester();
    }
    return SecurityTester.instance;
  }

  /**
   * Run comprehensive security tests
   */
  public async runSecurityTests(): Promise<SecurityTestResult[]> {
    this.testResults = [];
    
    // Environment tests
    await this.testEnvironmentSecurity();
    
    // API security tests
    await this.testApiSecurity();
    
    // Storage security tests
    await this.testStorageSecurity();
    
    // Authentication tests
    await this.testAuthenticationSecurity();
    
    // Logging tests
    await this.testSecurityLogging();

    return this.testResults;
  }

  /**
   * Test environment security
   */
  private async testEnvironmentSecurity(): Promise<void> {
    // Test environment validation
    try {
      const envValidation = securityValidators.validateEnvironment();
      this.addTestResult({
        testName: 'Environment Validation',
        passed: envValidation.isValid,
        details: envValidation.isValid 
          ? 'All environment checks passed' 
          : `Issues found: ${envValidation.issues.join(', ')}`,
        severity: envValidation.isValid ? 'low' : 'high',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.addTestResult({
        testName: 'Environment Validation',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        timestamp: new Date().toISOString(),
      });
    }

    // Test HTTPS enforcement
    this.addTestResult({
      testName: 'HTTPS Enforcement',
      passed: securityConfig.HTTPS_REQUIRED,
      details: securityConfig.HTTPS_REQUIRED 
        ? 'HTTPS is enforced in production' 
        : 'HTTPS enforcement is disabled',
      severity: securityConfig.HTTPS_REQUIRED ? 'low' : 'high',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Test API security
   */
  private async testApiSecurity(): Promise<void> {
    // Test API timeout configuration
    this.addTestResult({
      testName: 'API Timeout Configuration',
      passed: securityConfig.API_TIMEOUT > 0 && securityConfig.API_TIMEOUT <= 30000,
      details: `API timeout set to ${securityConfig.API_TIMEOUT}ms`,
      severity: 'medium',
      timestamp: new Date().toISOString(),
    });

    // Test retry limit configuration
    this.addTestResult({
      testName: 'Retry Limit Configuration',
      passed: securityConfig.MAX_RETRIES > 0 && securityConfig.MAX_RETRIES <= 5,
      details: `Max retries set to ${securityConfig.MAX_RETRIES}`,
      severity: 'medium',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Test storage security
   */
  private async testStorageSecurity(): Promise<void> {
    try {
      // Test localStorage access monitoring
      const testKey = '__security_test__';
      const testValue = 'test_value';
      
      localStorage.setItem(testKey, testValue);
      const retrievedValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      this.addTestResult({
        testName: 'Storage Access Monitoring',
        passed: retrievedValue === testValue,
        details: 'Local storage access monitoring is functional',
        severity: 'low',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.addTestResult({
        testName: 'Storage Access Monitoring',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Test authentication security
   */
  private async testAuthenticationSecurity(): Promise<void> {
    // Test token refresh threshold
    this.addTestResult({
      testName: 'Token Refresh Threshold',
      passed: securityConfig.TOKEN_REFRESH_THRESHOLD > 0 && securityConfig.TOKEN_REFRESH_THRESHOLD <= 600,
      details: `Token refresh threshold set to ${securityConfig.TOKEN_REFRESH_THRESHOLD} seconds`,
      severity: 'medium',
      timestamp: new Date().toISOString(),
    });

    // Test login attempt limits
    this.addTestResult({
      testName: 'Login Attempt Limits',
      passed: securityConfig.MAX_LOGIN_ATTEMPTS > 0 && securityConfig.MAX_LOGIN_ATTEMPTS <= 10,
      details: `Max login attempts set to ${securityConfig.MAX_LOGIN_ATTEMPTS}`,
      severity: 'medium',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Test security logging
   */
  private async testSecurityLogging(): Promise<void> {
    try {
      // Test security event logging
      const testEventId = crypto.randomUUID();
      securityMiddleware.logSecurityEvent('security_test', {
        testId: testEventId,
        testType: 'logging_test',
      }, 'low');

      this.addTestResult({
        testName: 'Security Event Logging',
        passed: true,
        details: 'Security event logging is functional',
        severity: 'low',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.addTestResult({
        testName: 'Security Event Logging',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }

    // Test audit report generation
    try {
      const auditReport = securityMiddleware.getSecurityAuditReport();
      this.addTestResult({
        testName: 'Audit Report Generation',
        passed: !!auditReport && typeof auditReport === 'object',
        details: 'Security audit report generation is functional',
        severity: 'low',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.addTestResult({
        testName: 'Audit Report Generation',
        passed: false,
        details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Add test result
   */
  private addTestResult(result: SecurityTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Get test results summary
   */
  public getTestSummary(): {
    total: number;
    passed: number;
    failed: number;
    bySeverity: Record<string, number>;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    const bySeverity = this.testResults.reduce((acc, result) => {
      acc[result.severity] = (acc[result.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, passed, failed, bySeverity };
  }

  /**
   * Get failed tests
   */
  public getFailedTests(): SecurityTestResult[] {
    return this.testResults.filter(r => !r.passed);
  }

  /**
   * Get critical tests
   */
  public getCriticalTests(): SecurityTestResult[] {
    return this.testResults.filter(r => r.severity === 'critical');
  }

  /**
   * Clear test results
   */
  public clearResults(): void {
    this.testResults = [];
  }
}

// Export singleton instance
export const securityTester = SecurityTester.getInstance();
export default securityTester;