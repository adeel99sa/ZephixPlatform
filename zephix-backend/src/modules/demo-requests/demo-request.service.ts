import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';

@Injectable()
export class DemoRequestService {
  private readonly logger = new Logger(DemoRequestService.name);

  constructor() {}

  async createDemoRequest(createDemoRequestDto: CreateDemoRequestDto) {
    try {
      this.logger.log(`Creating demo request for company: ${createDemoRequestDto.companyName}`);
      
      // For now, just return a mock response
      // TODO: Implement actual database storage
      const result = {
        id: `demo-${Date.now()}`,
        ...createDemoRequestDto,
        status: 'submitted',
        createdAt: new Date(),
        estimatedResponseTime: '24 hours'
      };

      this.logger.log(`Demo request created with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create demo request: ${error.message}`, error.stack);
      throw error;
    }
  }
}
