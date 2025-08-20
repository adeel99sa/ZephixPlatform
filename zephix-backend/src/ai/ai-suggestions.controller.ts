import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Request,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organizations/guards/organization.guard';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { AISuggestionsService } from './services/ai-suggestions.service';
import {
  AISuggestionDto,
  SuggestionsResponseDto,
  GenerateSuggestionsRequestDto,
  UpdateSuggestionStatusDto,
} from './dto/ai-suggestions.dto';

// ✅ PROPER TYPING - NO MORE 'any' TYPES
interface AuthenticatedRequest {
  headers: {
    'x-org-id'?: string;
    [key: string]: string | string[] | undefined;
  };
  user: {
    id: string;
    email: string;
    organizationId: string;
  };
}

interface SuggestionsQueryParams {
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'approved' | 'rejected' | 'implemented';
  projectId?: string;
  limit?: number;
  offset?: number;
}

@ApiTags('AI Suggestions')
@Controller('ai/suggestions')
@UseGuards(JwtAuthGuard, OrganizationGuard, RateLimiterGuard)
@ApiBearerAuth()
export class AISuggestionsController {
  constructor(private readonly aiSuggestionsService: AISuggestionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get AI suggestions',
    description: 'Retrieve AI-generated project optimization suggestions',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'implemented'],
  })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    type: SuggestionsResponseDto,
  })
  async getSuggestions(
    @Request() req: AuthenticatedRequest,
    @Query() query: SuggestionsQueryParams,
  ): Promise<SuggestionsResponseDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.aiSuggestionsService.getSuggestions(
        organizationId,
        userId,
        query.category,
        query.priority,
        query.status,
        query.projectId,
        query.limit || 20,
        query.offset || 0,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to retrieve suggestions: ${error.message}`,
        );
      }
      throw new BadRequestException('Failed to retrieve suggestions');
    }
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Generate new AI suggestions',
    description:
      'Trigger AI analysis to generate new project optimization suggestions',
  })
  @ApiBody({ type: GenerateSuggestionsRequestDto })
  @ApiResponse({
    status: 202,
    description: 'Suggestion generation started successfully',
  })
  async generateSuggestions(
    @Body() request: GenerateSuggestionsRequestDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; jobId: string }> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.aiSuggestionsService.generateSuggestions(
        request,
        organizationId,
        userId,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to generate suggestions: ${error.message}`,
        );
      }
      throw new BadRequestException('Failed to generate suggestions');
    }
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update suggestion status',
    description: 'Update the implementation status of a suggestion',
  })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiBody({ type: UpdateSuggestionStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Suggestion status updated successfully',
    type: AISuggestionDto,
  })
  async updateSuggestionStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateSuggestionStatusDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AISuggestionDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.aiSuggestionsService.updateSuggestionStatus(
        id,
        updateDto,
        organizationId,
        userId,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Failed to update suggestion status: ${error.message}`,
        );
      }
      throw new BadRequestException('Failed to update suggestion status');
    }
  }
}
