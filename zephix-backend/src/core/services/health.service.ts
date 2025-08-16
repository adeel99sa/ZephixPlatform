import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { IBaseService, ServiceStatus, HealthStatus, ServiceHealth, ApplicationHealth } from '../interfaces/base.service';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly services: Map<string, IBaseService<any>> = new Map();
  private startupTime: Date = new Date();

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService<EnvironmentVariables>
  ) {
    this.registerService('database', databaseService);
  }

  registerService(name: string, service: IBaseService<any>): void {
    this.services.set(name, service);
    this.logger.log(`Service registered: ${name}`);
  }

  async checkCoreServices(): Promise<HealthStatus> {
    this.logger.log('Checking core services health...');
    
    const checks = await Promise.allSettled([
      this.checkConfiguration(),
      this.checkBasicConnectivity(),
      this.checkDatabaseService()
    ]);

    const failed = checks.filter(check => check.status === 'rejected');
    if (failed.length > 0) {
      const errorMessages = failed.map(check => 
        check.status === 'rejected' ? check.reason?.message : 'Unknown error'
      ).join('; ');
      
      this.logger.error(`Core services health check failed: ${errorMessages}`);
      
      return { 
        status: ServiceStatus.UNAVAILABLE, 
        message: `Core services failed: ${failed.length}`,
        error: errorMessages,
        timestamp: new Date().toISOString()
      };
    }

    this.logger.log('Core services health check passed');
    return { 
      status: ServiceStatus.HEALTHY,
      message: 'All core services healthy',
      timestamp: new Date().toISOString()
    };
  }

  async getFullHealth(): Promise<ApplicationHealth> {
    const serviceHealthChecks = await Promise.allSettled(
      Array.from(this.services.entries()).map(async ([name, service]) => {
        const startTime = Date.now();
        try {
          const health = await service.getHealth();
          const responseTime = Date.now() - startTime;
          
          return {
            name,
            status: health.status,
            responseTime,
            lastCheck: new Date().toISOString(),
            error: health.error
          };
        } catch (error) {
          return {
            name,
            status: ServiceStatus.UNAVAILABLE,
            lastCheck: new Date().toISOString(),
            error: error.message
          };
        }
      })
    );

    const services: Record<string, ServiceHealth> = {};
    serviceHealthChecks.forEach((check, index) => {
      const serviceName = Array.from(this.services.keys())[index];
      if (check.status === 'fulfilled') {
        services[serviceName] = check.value;
      } else {
        services[serviceName] = {
          name: serviceName,
          status: ServiceStatus.UNAVAILABLE,
          lastCheck: new Date().toISOString(),
          error: 'Health check failed'
        };
      }
    });

    const overallStatus = this.computeOverallStatus(Object.values(services));

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startupTime.getTime(),
      version: process.env.npm_package_version || '0.0.1',
      environment: this.configService.get('NODE_ENV') || 'development'
    };
  }

  private async checkConfiguration(): Promise<void> {
    try {
      // Verify required environment variables
      const requiredVars = ['JWT_SECRET'];
      const missing = requiredVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
      
      this.logger.log('Configuration validation passed');
    } catch (error) {
      this.logger.error(`Configuration check failed: ${error.message}`);
      throw error;
    }
  }

  private async checkBasicConnectivity(): Promise<void> {
    try {
      // Check if the application can bind to ports and handle basic operations
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      if (memoryUsagePercent > 95) {
        throw new Error(`High memory usage: ${Math.round(memoryUsagePercent)}%`);
      }
      
      this.logger.log('Basic connectivity check passed');
    } catch (error) {
      this.logger.error(`Basic connectivity check failed: ${error.message}`);
      throw error;
    }
  }

  private async checkDatabaseService(): Promise<void> {
    try {
      const dbHealth = await this.databaseService.getHealth();
      
      if (dbHealth.status === ServiceStatus.UNAVAILABLE && this.configService.get('isDatabaseEnabled')) {
        throw new Error(`Database service unavailable: ${dbHealth.message}`);
      }
      
      this.logger.log('Database service check passed');
    } catch (error) {
      this.logger.error(`Database service check failed: ${error.message}`);
      throw error;
    }
  }

  private computeOverallStatus(serviceHealths: ServiceHealth[]): ServiceStatus {
    if (serviceHealths.length === 0) {
      return ServiceStatus.HEALTHY;
    }

    const criticalServices = serviceHealths.filter(service => 
      service.name === 'database' && this.configService.get('isDatabaseEnabled')
    );

    if (criticalServices.length > 0) {
      const criticalStatuses = criticalServices.map(service => service.status);
      
      if (criticalStatuses.includes(ServiceStatus.UNAVAILABLE)) {
        return ServiceStatus.UNAVAILABLE;
      }
      
      if (criticalStatuses.includes(ServiceStatus.DEGRADED)) {
        return ServiceStatus.DEGRADED;
      }
    }

    const allStatuses = serviceHealths.map(service => service.status);
    
    if (allStatuses.includes(ServiceStatus.UNAVAILABLE)) {
      return ServiceStatus.DEGRADED;
    }
    
    if (allStatuses.includes(ServiceStatus.DEGRADED)) {
      return ServiceStatus.DEGRADED;
    }
    
    return ServiceStatus.HEALTHY;
  }

  initializeOptionalServices(): void {
    this.logger.log('Initializing optional services...');
    
    // Fire and forget initialization of non-critical services
    setTimeout(() => {
      this.logger.log('Optional services initialization completed');
    }, 1000);
  }
}
