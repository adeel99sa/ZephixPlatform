import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Response } from 'express';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get()
  async getHealth(@Res() res: Response) {
    try {
      // Check database connectivity
      const isDatabaseConnected = this.dataSource.isInitialized;
      
      if (!isDatabaseConnected) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          service: 'Zephix Authentication Service',
          database: 'disconnected',
          message: 'Database connection failed',
        });
      }

      // Test database query
      await this.dataSource.query('SELECT 1');

      return res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Zephix Authentication Service',
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Zephix Authentication Service',
        database: 'error',
        message: error.message,
      });
    }
  }
}
