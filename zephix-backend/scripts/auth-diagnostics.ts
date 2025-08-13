#!/usr/bin/env ts-node
/**
 * Zephix Authentication Diagnostics Script
 * 
 * This script performs comprehensive authentication flow testing and diagnostics
 * for the JWT-based authentication system.
 * 
 * Usage: npm run auth:diagnose
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface DiagnosticResult {
  timestamp: string;
  environment: {
    frontendUrl: string;
    backendUrl: string;
    nodeEnv: string;
    gitSha?: string;
  };
  tests: {
    [key: string]: {
      success: boolean;
      duration: number;
      error?: string;
      details?: any;
    };
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalIssues: string[];
  };
}

class AuthDiagnostics {
  private results: DiagnosticResult;
  private startTime: number;
  private backendUrl: string;
  private frontendUrl: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.startTime = Date.now();
    
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        frontendUrl: this.frontendUrl,
        backendUrl: this.backendUrl,
        nodeEnv: process.env.NODE_ENV || 'unknown',
        gitSha: process.env.GIT_SHA || 'unknown'
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

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.tests[name] = {
        success: false,
        duration,
        error: errorMessage,
        details: error
      };
      
      this.results.summary.failedTests++;
      console.log(`❌ ${name}: FAILED (${duration}ms) - ${errorMessage}`);
      
      // Check for critical issues
      if (this.isCriticalIssue(name, errorMessage)) {
        this.results.summary.criticalIssues.push(`${name}: ${errorMessage}`);
      }
    }
    
    this.results.summary.totalTests++;
  }

  private isCriticalIssue(testName: string, error: string): boolean {
    const criticalPatterns = [
      /database.*connection/i,
      /jwt.*secret/i,
      /cors.*error/i,
      /authentication.*failed/i
    ];
    
    return criticalPatterns.some(pattern => pattern.test(error));
  }

  // Test 1: Backend Health Check
  private async testBackendHealth(): Promise<any> {
    const response = await axios.get(`${this.backendUrl}/health`, {
      timeout: 10000
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: {
        'content-type': response.headers['content-type'],
        'x-request-id': response.headers['x-request-id']
      }
    };
  }

  // Test 2: CORS Preflight Check
  private async testCorsPreflight(): Promise<any> {
    const response = await axios.options(`${this.backendUrl}/auth/login`, {
      headers: {
        'Origin': this.frontendUrl,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      },
      timeout: 10000
    });
    
    return {
      status: response.status,
      corsHeaders: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers'],
        'access-control-allow-credentials': response.headers['access-control-allow-credentials']
      }
    };
  }

  // Test 3: Authentication Endpoint Availability
  private async testAuthEndpoints(): Promise<any> {
    const endpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/profile',
      '/auth/refresh',
      '/auth/logout'
    ];
    
    const results: any = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.options(`${this.backendUrl}${endpoint}`, {
          timeout: 5000
        });
        results[endpoint] = {
          available: true,
          status: response.status,
          methods: response.headers['allow'] || 'unknown'
        };
      } catch (error) {
        results[endpoint] = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return results;
  }

  // Test 4: JWT Configuration Check
  private async testJwtConfiguration(): Promise<any> {
    // Check environment variables
    const jwtConfig = {
      secret: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      expiresIn: process.env.JWT_EXPIRES_IN || 'NOT_SET',
      refreshSecret: process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT_SET',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || 'NOT_SET'
    };
    
    // Check if JWT secret is secure
    const secretStrength = this.analyzeJwtSecret(process.env.JWT_SECRET || '');
    
    return {
      config: jwtConfig,
      secretStrength,
      recommendations: this.getJwtRecommendations(jwtConfig, secretStrength)
    };
  }

  // Test 5: Database Connection Test
  private async testDatabaseConnection(): Promise<any> {
    try {
      const response = await axios.get(`${this.backendUrl}/health`, {
        timeout: 15000
      });
      
      if (response.data?.database?.status === 'connected') {
        return {
          status: 'connected',
          details: response.data.database
        };
      } else {
        throw new Error('Database not connected according to health check');
      }
    } catch (error) {
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test 6: Rate Limiting Configuration
  private async testRateLimiting(): Promise<any> {
    const config = {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 'NOT_SET',
      max: process.env.RATE_LIMIT_MAX || 'NOT_SET',
      authEnabled: process.env.AUTH_RATE_LIMIT_ENABLED === 'true',
      authWindowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 'NOT_SET',
      authMax: process.env.AUTH_RATE_LIMIT_MAX || 'NOT_SET'
    };
    
    return {
      config,
      recommendations: this.getRateLimitRecommendations(config)
    };
  }

  // Test 7: Security Headers Check
  private async testSecurityHeaders(): Promise<any> {
    const response = await axios.get(`${this.backendUrl}/health`, {
      timeout: 10000
    });
    
    const securityHeaders = {
      'x-frame-options': response.headers['x-frame-options'],
      'x-content-type-options': response.headers['x-content-type-options'],
      'x-xss-protection': response.headers['x-xss-protection'],
      'strict-transport-security': response.headers['strict-transport-security'],
      'content-security-policy': response.headers['content-security-policy']
    };
    
    return {
      headers: securityHeaders,
      recommendations: this.getSecurityHeaderRecommendations(securityHeaders)
    };
  }

  // Test 8: Environment Validation
  private async testEnvironmentValidation(): Promise<any> {
    const requiredVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'NODE_ENV',
      'CORS_ALLOWED_ORIGINS'
    ];
    
    const optionalVars = [
      'JWT_REFRESH_SECRET',
      'RATE_LIMIT_ENABLED',
      'HELMET_ENABLED',
      'ANTHROPIC_API_KEY'
    ];
    
    const results: any = {
      required: {},
      optional: {},
      missing: [],
      recommendations: []
    };
    
    // Check required variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value) {
        results.required[varName] = 'SET';
      } else {
        results.required[varName] = 'MISSING';
        results.missing.push(varName);
      }
    }
    
    // Check optional variables
    for (const varName of optionalVars) {
      const value = process.env[varName];
      results.optional[varName] = value ? 'SET' : 'NOT_SET';
    }
    
    // Generate recommendations
    if (results.missing.length > 0) {
      results.recommendations.push(`Missing required environment variables: ${results.missing.join(', ')}`);
    }
    
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_REFRESH_SECRET) {
      results.recommendations.push('JWT_REFRESH_SECRET should be set in production for enhanced security');
    }
    
    return results;
  }

  private analyzeJwtSecret(secret: string): string {
    if (!secret) return 'NOT_SET';
    if (secret.length < 32) return 'WEAK';
    if (secret.length < 64) return 'MEDIUM';
    if (secret.includes('change') || secret.includes('your') || secret.includes('example')) return 'DEFAULT';
    return 'STRONG';
  }

  private getJwtRecommendations(config: any, strength: string): string[] {
    const recommendations: string[] = [];
    
    if (config.secret === 'NOT_SET') {
      recommendations.push('JWT_SECRET must be set for authentication to work');
    }
    
    if (strength === 'WEAK') {
      recommendations.push('JWT_SECRET should be at least 64 characters long');
    }
    
    if (strength === 'DEFAULT') {
      recommendations.push('JWT_SECRET should be changed from default value');
    }
    
    if (config.refreshSecret === 'NOT_SET') {
      recommendations.push('JWT_REFRESH_SECRET should be set for enhanced security');
    }
    
    if (config.expiresIn === 'NOT_SET') {
      recommendations.push('JWT_EXPIRES_IN should be set (recommended: 15m for production)');
    }
    
    return recommendations;
  }

  private getRateLimitRecommendations(config: any): string[] {
    const recommendations: string[] = [];
    
    if (process.env.NODE_ENV === 'production' && !config.enabled) {
      recommendations.push('Rate limiting should be enabled in production');
    }
    
    if (config.enabled && config.max === 'NOT_SET') {
      recommendations.push('RATE_LIMIT_MAX should be set when rate limiting is enabled');
    }
    
    if (config.enabled && config.windowMs === 'NOT_SET') {
      recommendations.push('RATE_LIMIT_WINDOW_MS should be set when rate limiting is enabled');
    }
    
    return recommendations;
  }

  private getSecurityHeaderRecommendations(headers: any): string[] {
    const recommendations: string[] = [];
    
    if (!headers['x-frame-options']) {
      recommendations.push('X-Frame-Options header should be set to prevent clickjacking');
    }
    
    if (!headers['x-content-type-options']) {
      recommendations.push('X-Content-Type-Options header should be set to nosniff');
    }
    
    if (!headers['x-xss-protection']) {
      recommendations.push('X-XSS-Protection header should be set to 1; mode=block');
    }
    
    if (process.env.NODE_ENV === 'production' && !headers['strict-transport-security']) {
      recommendations.push('Strict-Transport-Security header should be set in production');
    }
    
    return recommendations;
  }

  // Run all diagnostic tests
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Zephix Authentication Diagnostics...\n');
    
    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('CORS Preflight Check', () => this.testCorsPreflight());
    await this.runTest('Authentication Endpoints', () => this.testAuthEndpoints());
    await this.runTest('JWT Configuration', () => this.testJwtConfiguration());
    await this.runTest('Database Connection', () => this.testDatabaseConnection());
    await this.runTest('Rate Limiting Configuration', () => this.testRateLimiting());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Environment Validation', () => this.testEnvironmentValidation());
    
    this.generateReport();
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(50));
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
    const reportPath = path.join(process.cwd(), 'auth-diagnostics-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate recommendations
    this.generateRecommendations();
  }

  private generateRecommendations(): void {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    const allRecommendations = new Set<string>();
    
    // Collect all recommendations from tests
    Object.values(this.results.tests).forEach(test => {
      if (test.details?.recommendations) {
        test.details.recommendations.forEach((rec: string) => allRecommendations.add(rec));
      }
    }
    
    if (allRecommendations.size === 0) {
      console.log('✅ No specific recommendations at this time');
    } else {
      Array.from(allRecommendations).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Review the detailed report above');
    console.log('2. Address any critical issues first');
    console.log('3. Implement security recommendations');
    console.log('4. Test authentication flow manually');
    console.log('5. Monitor logs for any remaining issues');
  }
}

// Main execution
async function main() {
  try {
    const diagnostics = new AuthDiagnostics();
    await diagnostics.runAllTests();
  } catch (error) {
    console.error('❌ Diagnostic script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { AuthDiagnostics };
