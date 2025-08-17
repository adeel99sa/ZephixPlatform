import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../modules/users/entities/user.entity';

@ApiTags('Feedback')
@Controller('feedback')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit user feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user: User,
  ) {
    const feedback = await this.feedbackService.create(createFeedbackDto, user);
    return {
      message: 'Thank you for your feedback! We appreciate your input.',
      feedbackId: feedback.id,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get feedback statistics' })
  async getStatistics() {
    const stats = await this.feedbackService.getStatistics();
    return {
      message: 'Feedback statistics retrieved successfully',
      statistics: stats,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all feedback (for development)' })
  async findAll() {
    const feedback = await this.feedbackService.findAll();
    return {
      message: 'All feedback retrieved successfully',
      feedback,
      count: feedback.length,
    };
  }
}
