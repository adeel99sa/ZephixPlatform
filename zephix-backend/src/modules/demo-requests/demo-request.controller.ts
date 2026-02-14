import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { DemoRequestService } from './demo-request.service';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';

@ApiTags('Demo Requests')
@Controller('demo-requests')
export class DemoRequestController {
  constructor(private readonly demoRequestService: DemoRequestService) {}

  /**
   * Submit demo request
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimiterGuard)
  @ApiOperation({ summary: 'Submit demo request' })
  @ApiResponse({
    status: 201,
    description: 'Demo request submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBody({ type: CreateDemoRequestDto })
  async createDemoRequest(@Body() createDemoRequestDto: CreateDemoRequestDto) {
    try {
      const result =
        await this.demoRequestService.createDemoRequest(createDemoRequestDto);

      // TODO: Enable email notifications when email service is configured
      // Send notification to sales team (async)
      // this.demoRequestService.notifySalesTeam(result).catch(console.error);

      // Send confirmation email to requester (async)
      // this.demoRequestService.sendConfirmationEmail(result).catch(console.error);

      return {
        message: 'Demo request submitted successfully',
        id: result.id,
        estimatedResponseTime: '24 hours',
      };
    } catch (error) {
      throw error;
    }
  }
}
