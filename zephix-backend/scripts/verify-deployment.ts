#!/usr/bin/env ts-node

import axios from 'axios';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

interface DeploymentVerificationConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  healthEndpoints: string[];
  criticalEndpoints: string[];
  expectedResponseCodes: { [key: string]: number };
}

interface VerificationResult {
  endpoint: string;
  status: 'success' | 'failure' | 'warning';
  responseTime: number;
  statusCode: number;
  error?: string;
  details?: any;
}

class DeploymentVerifier {
  private config: DeploymentVerificationConfig;
  private results: VerificationResult[] = [];

  constructor(config: DeploymentVerificationConfig) {
    this.config = config;
  }

  async verifyAll(): Promise<boolean> {
    console.log('🔍 Starting deployment verification...');
    console.log(`📍 Base URL: ${this.config.baseUrl}`);
    
    const startTime = Date.now();
    
    // Verify health endpoints
    await this.verifyHealthEndpoints();
    
    // Verify critical endpoints
    await this.verifyCriticalEndpoints();
    
    // Verify database connectivity
    await this.verifyDatabaseConnectivity();
    
    // Verify external services
    await this.verifyExternalServices();
    
    // Generate report
    const totalTime = Date.now() - startTime;
    await this.generateReport(totalTime);
    
    // Check overall success
    const criticalFailures = this.results.filter(
      r => r.status === 'failure' && this.config.criticalEndpoints.includes(r.endpoint)
    );
    
    const success = criticalFailures.length === 0;
    
    if (success) {
      console.log('✅ Deployment verification completed successfully!');
    } else {
      console.log(`❌ Deployment verification failed with ${criticalFailures.length} critical failures`);
    }
    
    return success;
  }

  private async verifyHealthEndpoints(): Promise<void> {
    console.log('\n🏥 Verifying health endpoints...');
    
    for (const endpoint of this.config.healthEndpoints) {
      const result = await this.verifyEndpoint(endpoint, true);
      this.results.push(result);
      
      if (result.status === 'success') {
        console.log(`  ✅ ${endpoint}: ${result.responseTime}ms`);
      } else {
        console.log(`  ❌ ${endpoint}: ${result.error}`);
      }
    }
  }

  private async verifyCriticalEndpoints(): Promise<void> {
    console.log('\n🚨 Verifying critical endpoints...');
    
    for (const endpoint of this.config.criticalEndpoints) {
      const result = await this.verifyEndpoint(endpoint, false);
      this.results.push(result);
      
      if (result.status === 'success') {
        console.log(`  ✅ ${endpoint}: ${result.responseTime}ms`);
      } else {
        console.log(`  ❌ ${endpoint}: ${result.error}`);
      }
    }
  }

  private async verifyEndpoint(endpoint: string, isHealthCheck: boolean): Promise<VerificationResult> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        validateStatus: () => true, // Don't throw on non-2xx status codes
      });
      
      const responseTime = Date.now() - startTime;
      const expectedCode = this.config.expectedResponseCodes[endpoint] || 200;
      
      if (response.status === expectedCode) {
        return {
          endpoint,
          status: 'success',
          responseTime,
          statusCode: response.status,
          details: isHealthCheck ? response.data : undefined,
        };
      } else {
        return {
          endpoint,
          status: 'failure',
          responseTime,
          statusCode: response.status,
          error: `Expected ${expectedCode}, got ${response.status}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint,
        status: 'failure',
        responseTime,
        statusCode: 0,
        error: error.message || 'Request failed',
      };
    }
  }

  private async verifyDatabaseConnectivity(): Promise<void> {
    console.log('\n🗄️  Verifying database connectivity...');
    
    try {
      const healthUrl = `${this.config.baseUrl}/api/health`;
      const response = await axios.get(healthUrl, { timeout: this.config.timeout });
      
      if (response.data.checks) {
        const dbCheck = response.data.checks.find((check: any) => check.name === 'database');
        
        if (dbCheck && dbCheck.status === 'healthy') {
          console.log('  ✅ Database: Connected and responsive');
          this.results.push({
            endpoint: 'database-connectivity',
            status: 'success',
            responseTime: 0,
            statusCode: 200,
            details: dbCheck,
          });
        } else {
          console.log('  ❌ Database: Connection issues detected');
          this.results.push({
            endpoint: 'database-connectivity',
            status: 'failure',
            responseTime: 0,
            statusCode: 503,
            error: 'Database health check failed',
            details: dbCheck,
          });
        }
      }
    } catch (error: any) {
      console.log('  ❌ Database: Health check endpoint unreachable');
      this.results.push({
        endpoint: 'database-connectivity',
        status: 'failure',
        responseTime: 0,
        statusCode: 0,
        error: error.message || 'Health check failed',
      });
    }
  }

  private async verifyExternalServices(): Promise<void> {
    console.log('\n🌐 Verifying external services...');
    
    try {
      const healthUrl = `${this.config.baseUrl}/api/health`;
      const response = await axios.get(healthUrl, { timeout: this.config.timeout });
      
      if (response.data.checks) {
        const externalChecks = response.data.checks.filter((check: any) => 
          ['openai', 'pinecone', 'redis'].includes(check.name)
        );
        
        for (const check of externalChecks) {
          if (check.status === 'healthy') {
            console.log(`  ✅ ${check.name}: ${check.details}`);
            this.results.push({
              endpoint: `external-${check.name}`,
              status: 'success',
              responseTime: 0,
              statusCode: 200,
              details: check,
            });
          } else {
            console.log(`  ⚠️  ${check.name}: ${check.details}`);
            this.results.push({
              endpoint: `external-${check.name}`,
              status: 'warning',
              responseTime: 0,
              statusCode: 503,
              error: check.details,
              details: check,
            });
          }
        }
      }
    } catch (error: any) {
      console.log('  ❌ External services: Health check failed');
    }
  }

  private async generateReport(totalTime: number): Promise<void> {
    console.log('\n📊 Generating verification report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.config.baseUrl,
      totalTime: `${totalTime}ms`,
      summary: {
        total: this.results.length,
        success: this.results.filter(r => r.status === 'success').length,
        failure: this.results.filter(r => r.status === 'failure').length,
        warning: this.results.filter(r => r.status === 'warning').length,
      },
      results: this.results,
    };
    
    // Save report to file
    const reportDir = path.join(process.cwd(), 'deployment-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `verification-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${reportFile}`);
    
    // Print summary
    console.log('\n📈 Verification Summary:');
    console.log(`  Total checks: ${report.summary.total}`);
    console.log(`  ✅ Success: ${report.summary.success}`);
    console.log(`  ❌ Failures: ${report.summary.failure}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warning}`);
    console.log(`  ⏱️  Total time: ${report.totalTime}`);
  }
}

async function main() {
  const config: DeploymentVerificationConfig = {
    baseUrl: process.env.VERIFICATION_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.VERIFICATION_TIMEOUT || '10000'),
    retries: parseInt(process.env.VERIFICATION_RETRIES || '3'),
    healthEndpoints: [
      '/api/health',
      '/api/health/ready',
      '/api/health/live',
    ],
    criticalEndpoints: [
      '/api/auth/login',
      '/api/projects',
      '/api/organizations',
    ],
    expectedResponseCodes: {
      '/api/health': 200,
      '/api/health/ready': 200,
      '/api/health/live': 200,
      '/api/auth/login': 400, // Expected for GET without credentials
      '/api/projects': 401, // Expected without auth
      '/api/organizations': 401, // Expected without auth
    },
  };
  
  const verifier = new DeploymentVerifier(config);
  const success = await verifier.verifyAll();
  
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DeploymentVerifier, DeploymentVerificationConfig };
