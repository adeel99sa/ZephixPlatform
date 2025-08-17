/**
 * Authentication Test Execution Script
 * Run this to execute comprehensive authentication tests
 */

import { authTestRunner } from './authTestRunner';
import { securityMiddleware } from '../middleware/security.middleware';

// Initialize security monitoring
securityMiddleware.logSecurityEvent('auth_test_execution_started', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
}, 'low');

console.log('🚀 Starting Authentication Endpoint Testing...');
console.log('============================================');

// Run all authentication tests
authTestRunner.runAuthTests()
  .then((summary) => {
    console.log('\n🎯 TESTING COMPLETED SUCCESSFULLY');
    console.log('================================');
    
    // Log final security event
    securityMiddleware.logSecurityEvent('auth_test_execution_completed', {
      timestamp: new Date().toISOString(),
      results: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        backendConnectivity: summary.backendConnectivity,
        apiEndpointValidation: summary.apiEndpointValidation,
      },
    }, 'low');
    
    // Display results in browser console
    console.log('📊 FINAL RESULTS:');
    console.log(`  ✅ Passed: ${summary.passed}/${summary.total}`);
    console.log(`  ❌ Failed: ${summary.failed}/${summary.total}`);
    console.log(`  🌐 Backend: ${summary.backendConnectivity ? 'Connected' : 'Disconnected'}`);
    console.log(`  🔗 Endpoints: ${summary.apiEndpointValidation ? 'Valid' : 'Invalid'}`);
    
    // Show security audit report
    const securityReport = securityMiddleware.getSecurityAuditReport();
    console.log('\n🔒 SECURITY AUDIT REPORT:');
    console.log(`  Total Events: ${securityReport.totalEvents}`);
    console.log(`  Events by Severity:`, securityReport.eventsBySeverity);
    
    // Export results to global scope for browser console access
    (window as any).authTestResults = summary;
    (window as any).securityAuditReport = securityReport;
    
    console.log('\n💡 TIP: Access detailed results in browser console:');
    console.log('  - authTestResults: Full authentication test results');
    console.log('  - securityAuditReport: Complete security audit report');
    
    return summary;
  })
  .catch((error) => {
    console.error('💥 TESTING FAILED WITH ERROR:', error);
    
    // Log error to security system
    securityMiddleware.logSecurityEvent('auth_test_execution_failed', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'high');
    
    throw error;
  });

// Export for module usage
export default authTestRunner;