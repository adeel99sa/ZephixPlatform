/**
 * Immediate Authentication Test Execution
 * Run this to test authentication endpoints right now
 */

import { authTestRunner } from './authTestRunner';
import { securityMiddleware } from '../middleware/security.middleware';

console.log('🚀 EXECUTING COMPREHENSIVE AUTHENTICATION TESTS');
console.log('==============================================');
console.log('');

// Initialize security monitoring
securityMiddleware.logSecurityEvent('immediate_auth_test_started', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href,
}, 'low');

// Run all authentication tests
const runTests = async () => {
  try {
    console.log('🔒 Running security tests...');
    const summary = await authTestRunner.runAuthTests();
    
    console.log('');
    console.log('🎯 TESTING COMPLETED SUCCESSFULLY');
    console.log('================================');
    console.log('');
    
    // Display comprehensive results
    console.log('📊 AUTHENTICATION TEST RESULTS:');
    console.log(`  ✅ Passed: ${summary.passed}/${summary.total}`);
    console.log(`  ❌ Failed: ${summary.failed}/${summary.total}`);
    console.log(`  🌐 Backend Connectivity: ${summary.backendConnectivity ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`  🔗 API Endpoint Validation: ${summary.apiEndpointValidation ? '✅ Valid' : '❌ Invalid'}`);
    console.log('');
    
    // Show security test results
    const securitySummary = summary.securityTests.getTestSummary();
    console.log('🔒 SECURITY TEST RESULTS:');
    console.log(`  ✅ Passed: ${securitySummary.passed}/${securitySummary.total}`);
    console.log(`  ❌ Failed: ${securitySummary.failed}/${securitySummary.total}`);
    console.log('');
    
    // Show failed tests if any
    if (summary.failed > 0) {
      console.log('❌ FAILED AUTHENTICATION TESTS:');
      summary.authTests.filter(r => !r.passed).forEach(test => {
        console.log(`  - ${test.testName}: ${test.error || test.details}`);
      });
      console.log('');
    }
    
    // Show failed security tests if any
    if (securitySummary.failed > 0) {
      console.log('❌ FAILED SECURITY TESTS:');
      summary.securityTests.getFailedTests().forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
      console.log('');
    }
    
    // Show recommendations
    console.log('💡 RECOMMENDATIONS:');
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
    console.log('');
    
    // Log final security event
    securityMiddleware.logSecurityEvent('immediate_auth_test_completed', {
      timestamp: new Date().toISOString(),
      results: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        backendConnectivity: summary.backendConnectivity,
        apiEndpointValidation: summary.apiEndpointValidation,
        securityTestsPassed: securitySummary.passed,
        securityTestsFailed: securitySummary.failed,
      },
    }, 'low');
    
    // Export results to global scope for browser console access
    (window as any).authTestResults = summary;
    (window as any).securityAuditReport = securityMiddleware.getSecurityAuditReport();
    
    console.log('💡 TIP: Access detailed results in browser console:');
    console.log('  - authTestResults: Full authentication test results');
    console.log('  - securityAuditReport: Complete security audit report');
    console.log('');
    
    return summary;
    
  } catch (error) {
    console.error('💥 TESTING FAILED WITH ERROR:', error);
    
    // Log error to security system
    securityMiddleware.logSecurityEvent('immediate_auth_test_failed', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'high');
    
    throw error;
  }
};

// Execute tests immediately
runTests();

// Export for module usage
export default runTests;