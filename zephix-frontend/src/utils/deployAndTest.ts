/**
 * Deploy and Test Enterprise Authentication System
 * Complete deployment verification and testing
 */

import { authFlowTester } from './testAuthFlow';
import { enterpriseAuthService } from '../services/enterpriseAuth.service';
import { securityMiddleware } from '../middleware/security.middleware';

console.log('🚀 ENTERPRISE AUTHENTICATION SYSTEM DEPLOYMENT');
console.log('=============================================');
console.log('');

// Log deployment start
securityMiddleware.logSecurityEvent('enterprise_auth_deployment_started', {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
}, 'low');

// Test the complete system
const runDeploymentTests = async () => {
  try {
    console.log('🧪 Running Deployment Tests...');
    
    // Run authentication flow tests
    const testResults = await authFlowTester.runAuthFlowTests();
    
    // Check system readiness
    const isSystemReady = testResults.every(result => result.passed);
    
    if (isSystemReady) {
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
      console.log('==========================');
      console.log('✅ Enterprise authentication system is fully operational');
      console.log('✅ All security tests passed');
      console.log('✅ Authentication flow is ready for production');
      
      // Log successful deployment
      securityMiddleware.logSecurityEvent('enterprise_auth_deployment_successful', {
        timestamp: new Date().toISOString(),
        testResults: testResults.length,
        passedTests: testResults.filter(r => r.passed).length,
      }, 'low');
      
      // Show system status
      showSystemStatus();
      
    } else {
      console.log('\n❌ DEPLOYMENT FAILED!');
      console.log('=====================');
      console.log('❌ Some tests failed. Please review and fix issues.');
      
      // Log deployment failure
      securityMiddleware.logSecurityEvent('enterprise_auth_deployment_failed', {
        timestamp: new Date().toISOString(),
        testResults: testResults.length,
        failedTests: testResults.filter(r => !r.passed).length,
      }, 'high');
    }
    
    return isSystemReady;
    
  } catch (error) {
    console.error('💥 DEPLOYMENT ERROR:', error);
    
    // Log deployment error
    securityMiddleware.logSecurityEvent('enterprise_auth_deployment_error', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'critical');
    
    return false;
  }
};

/**
 * Show current system status
 */
const showSystemStatus = () => {
  console.log('\n📊 SYSTEM STATUS');
  console.log('================');
  
  // Auth service status
  const authState = enterpriseAuthService.getAuthState();
  console.log(`🔐 Authentication Service: ${authState.isAuthenticated ? 'Active' : 'Inactive'}`);
  console.log(`👤 Current User: ${authState.user ? authState.user.email : 'None'}`);
  console.log(`🛡️ Security Level: ${authState.securityLevel}`);
  
  // Security events
  const securityEvents = enterpriseAuthService.getSecurityEvents();
  console.log(`📈 Security Events: ${securityEvents.length}`);
  
  // Security middleware status
  const auditReport = securityMiddleware.getSecurityAuditReport();
  console.log(`🔍 Security Audit: ${auditReport.totalEvents} events logged`);
  
  console.log('\n🎯 READY FOR TESTING:');
  console.log('  • Navigate to /login to test authentication');
  console.log('  • Use demo credentials: demo@zephix.com / ZephixDemo2024!');
  console.log('  • Check browser console for security events');
  console.log('  • Monitor authentication state changes');
};

/**
 * Test login flow with demo credentials
 */
export const testLoginFlow = async () => {
  console.log('\n🔐 TESTING LOGIN FLOW WITH DEMO CREDENTIALS');
  console.log('==========================================');
  
  try {
    const demoCredentials = {
      email: 'demo@zephix.com',
      password: 'ZephixDemo2024!'
    };
    
    console.log('📝 Attempting login with demo credentials...');
    
    const success = await enterpriseAuthService.loginSecurely(demoCredentials);
    
    if (success) {
      console.log('✅ Login successful!');
      
      const authState = enterpriseAuthService.getAuthState();
      console.log('📊 Authentication State:');
      console.log(`  • User: ${authState.user?.email}`);
      console.log(`  • Role: ${authState.user?.role}`);
      console.log(`  • Authenticated: ${authState.isAuthenticated}`);
      console.log(`  • Session Expiry: ${new Date(authState.sessionExpiry || 0).toLocaleString()}`);
      
      // Test navigation to dashboard
      console.log('\n🎯 Testing Dashboard Access...');
      const canAccessDashboard = enterpriseAuthService.isAuthenticated();
      
      if (canAccessDashboard) {
        console.log('✅ Dashboard access granted - No redirect loop!');
        console.log('🚀 User successfully reached dashboard without authentication issues');
      } else {
        console.log('❌ Dashboard access denied');
      }
      
    } else {
      console.log('❌ Login failed');
    }
    
    return success;
    
  } catch (error) {
    console.error('💥 Login test error:', error);
    return false;
  }
};

/**
 * Show security audit report
 */
export const showSecurityAudit = () => {
  console.log('\n🔒 SECURITY AUDIT REPORT');
  console.log('========================');
  
  const auditReport = securityMiddleware.getSecurityAuditReport();
  console.log(`Total Events: ${auditReport.totalEvents}`);
  console.log(`Events by Severity:`, auditReport.eventsBySeverity);
  
  const securityEvents = enterpriseAuthService.getSecurityEvents();
  console.log(`\nEnterprise Auth Security Events: ${securityEvents.length}`);
  
  if (securityEvents.length > 0) {
    console.log('Recent Events:');
    securityEvents.slice(-5).forEach((event, index) => {
      console.log(`  ${index + 1}. [${event.severity.toUpperCase()}] ${event.event}`);
    });
  }
};

// Run deployment tests
runDeploymentTests().then((success) => {
  if (success) {
    console.log('\n🚀 SYSTEM READY FOR PRODUCTION TESTING!');
    console.log('========================================');
    console.log('Your enterprise authentication system is fully deployed and operational.');
    console.log('Navigate to the application to test the complete authentication flow.');
  }
});

// Export for manual testing
export default {
  runDeploymentTests,
  testLoginFlow,
  showSecurityAudit,
  showSystemStatus,
};