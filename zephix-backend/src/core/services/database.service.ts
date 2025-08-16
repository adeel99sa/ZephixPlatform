import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IBaseService, ServiceStatus, HealthStatus } from '../interfaces/base.service';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class DatabaseService implements IBaseService<any> {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionStatus: ServiceStatus = ServiceStatus.INITIALIZING;
  private lastHealthCheck: Date = new Date();
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService<EnvironmentVariables>,
    @Optional() @InjectDataSource() private dataSource?: DataSource,
  ) {
    this.initializeConnection();
    this.startHealthMonitoring();
  }

  isAvailable(): boolean {
    return this.connectionStatus === ServiceStatus.HEALTHY;
  }

  getStatus(): ServiceStatus {
    return this.connectionStatus;
  }

  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.configService.get('isDatabaseEnabled')) {
        return {
          status: ServiceStatus.UNAVAILABLE,
          message: 'Database disabled by configuration',
          timestamp: new Date().toISOString()
        };
      }

      if (!this.dataSource) {
        return {
          status: ServiceStatus.UNAVAILABLE,
          message: 'Database service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Test database connectivity
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      this.connectionStatus = ServiceStatus.HEALTHY;
      this.lastHealthCheck = new Date();
      
      return {
        status: ServiceStatus.HEALTHY,
        message: 'Database connection healthy',
        timestamp: new Date().toISOString(),
        details: {
          responseTime: `${responseTime}ms`,
          databaseName: this.dataSource.options.database,
          // Use type assertion for PostgreSQL-specific properties
          host: (this.dataSource.options as any).host,
          port: (this.dataSource.options as any).port
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.connectionStatus = ServiceStatus.DEGRADED;
      this.lastHealthCheck = new Date();
      
      this.logger.error(`Database health check failed: ${error.message}`);
      
      return {
        status: ServiceStatus.DEGRADED,
        message: 'Database connection degraded',
        error: error.message,
        timestamp: new Date().toISOString(),
        details: {
          responseTime: `${responseTime}ms`,
          lastSuccessfulCheck: this.lastHealthCheck.toISOString()
        }
      };
    }
  }

  async getRepository<T>(entity: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Database service is not available');
    }
    
    if (!this.dataSource) {
      throw new Error('Database connection not initialized');
    }
    
    return this.dataSource.getRepository(entity);
  }

  private async initializeConnection(): Promise<void> {
    if (!this.configService.get('isDatabaseEnabled')) {
      this.logger.log('Database disabled by configuration');
      this.connectionStatus = ServiceStatus.UNAVAILABLE;
      return;
    }

    try {
      this.logger.log('Initializing database connection...');
      await this.connectWithRetry();
    } catch (error) {
      this.logger.error(`Failed to initialize database connection: ${error.message}`);
      this.connectionStatus = ServiceStatus.UNAVAILABLE;
    }
  }

  private async connectWithRetry(maxRetries: number = 3, delay: number = 5000): Promise<void> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Database connection attempt ${attempt}/${maxRetries}`);
        
        if (!this.dataSource?.isInitialized) {
          await this.dataSource?.initialize();
        }
        
        // Test the connection
        await this.dataSource?.query('SELECT 1');
        
        this.logger.log('Database connection established successfully');
        this.connectionStatus = ServiceStatus.HEALTHY;
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Database connection attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw new Error(`Database connection failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  private startHealthMonitoring(): void {
    // Monitor database health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.getHealth();
      } catch (error) {
        this.logger.error(`Health monitoring failed: ${error.message}`);
      }
    }, 30000);
  }

  onModuleDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.dataSource?.isInitialized) {
      this.dataSource.destroy();
    }
  }
}
