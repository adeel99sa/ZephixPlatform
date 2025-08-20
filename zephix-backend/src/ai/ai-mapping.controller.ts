import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Query,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organizations/guards/organization.guard';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { AIMappingService } from './services/ai-mapping.service';
import {
  AIMappingRequestDto,
  AIMappingResponseDto,
  AIMappingStatusDto,
} from './dto/ai-mapping.dto';

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

interface QueryParameters {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  documentType?: string;
  limit?: number;
  offset?: number;
}

@ApiTags('AI Document Mapping')
@Controller('ai/mapping')
@UseGuards(JwtAuthGuard, OrganizationGuard, RateLimiterGuard)
@ApiBearerAuth()
export class AIMappingController {
  constructor(private readonly aiMappingService: AIMappingService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Analyze Business Requirements Document with AI',
    description:
      'Upload and analyze BRD documents to extract project structure, requirements, and insights',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (.pdf, .docx, .txt)',
        },
        documentType: {
          type: 'string',
          enum: ['brd', 'project_charter', 'requirements', 'technical_spec'],
          description: 'Type of document being analyzed',
        },
        analysisDepth: {
          type: 'string',
          enum: ['basic', 'detailed', 'comprehensive'],
          default: 'detailed',
          description: 'Level of analysis detail',
        },
        extractFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific fields to extract',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Document analysis started successfully',
    type: AIMappingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Invalid file type. Only PDF, DOCX, and TXT files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async analyzeDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(pdf|docx|txt)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() mappingRequest: AIMappingRequestDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AIMappingResponseDto> {
    try {
      const organizationId = req.headers['x-org-id'];
      const userId = req.user.id;

      if (!organizationId) {
        throw new BadRequestException('Organization context required');
      }

      return await this.aiMappingService.analyzeDocument(
        file,
        mappingRequest,
        organizationId,
        userId,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Document analysis failed: ${error.message}`,
        );
      }
      throw new BadRequestException('Document analysis failed');
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get AI mapping analysis result',
    description: 'Retrieve the completed AI analysis for a document',
  })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis result retrieved successfully',
    type: AIMappingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis not found',
  })
  async getAnalysisResult(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AIMappingResponseDto> {
    const organizationId = req.headers['x-org-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return await this.aiMappingService.getAnalysisResult(id, organizationId);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get AI mapping analysis status',
    description: 'Check the current status and progress of document analysis',
  })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    type: AIMappingStatusDto,
  })
  async getAnalysisStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AIMappingStatusDto> {
    const organizationId = req.headers['x-org-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return await this.aiMappingService.getAnalysisStatus(id, organizationId);
  }

  @Get()
  @ApiOperation({
    summary: 'List AI mapping analyses',
    description: 'Get list of all AI mapping analyses for the organization',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Analyses list retrieved successfully',
    type: [AIMappingResponseDto],
  })
  async listAnalyses(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryParameters,
  ): Promise<AIMappingResponseDto[]> {
    const organizationId = req.headers['x-org-id'];

    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }

    return await this.aiMappingService.listAnalyses(
      organizationId,
      query.status,
      query.documentType,
      query.limit,
      query.offset,
    );
  }
}
