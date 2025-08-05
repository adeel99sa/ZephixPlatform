import { Controller, Get, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async getHealth() {
    try {
      if (!this.dataSource.isInitialized) {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          status: 'error',
          timestamp: new Date().toISOString(),
          service: 'Zephix Authentication Service',
          database: 'disconnected',
          message: 'Database connection not initialized',
        };
      }

      await this.dataSource.query('SELECT 1');

      return {
        statusCode: HttpStatus.OK,
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Zephix Authentication Service',
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Zephix Authentication Service',
        database: 'error',
        message: error.message,
      };
    }
  }
}
