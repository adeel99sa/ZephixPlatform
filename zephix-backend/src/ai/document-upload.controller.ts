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
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organizations/guards/organization.guard';
import { DocumentParserService } from './document-parser.service';
import { DocumentProcessingQueueService } from './document-processing-queue.service';
import { VectorDatabaseService } from './vector-database.service';

export class UploadDocumentResponse {
  jobId: string;
  message: string;
  documentId: string;
}

export class JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class QueueStatsResponse {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Controller('api/v1/documents')
@ApiTags('Document Upload & Processing')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class DocumentUploadController {
  constructor(
    private readonly documentParserService: DocumentParserService,
    private readonly documentProcessingQueue: DocumentProcessingQueueService,
    private readonly vectorDatabaseService: VectorDatabaseService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Upload a document for processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (.docx or .pdf)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Document accepted for processing',
    type: UploadDocumentResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedTypes = ['.docx', '.pdf'];
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        
        if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
          return callback(
            new BadRequestException(
              `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
        
        callback(null, true);
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<UploadDocumentResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file using document parser service
    const validation = this.documentParserService.validateFile(file);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Generate unique document ID
    const documentId = uuidv4();
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;

    try {
      // Add document processing job to queue
      const jobId = await this.documentProcessingQueue.addDocumentProcessingJob({
        documentId,
        filename: file.originalname,
        fileBuffer: file.buffer,
        organizationId,
        userId,
      });

      return {
        jobId,
        documentId,
        message: 'Document accepted for processing. Use the job ID to check status.',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to queue document for processing: ${error.message}`);
    }
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get the status of a document processing job' })
  @ApiParam({ name: 'jobId', description: 'Job ID returned from upload' })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: JobStatusResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
    const status = await this.documentProcessingQueue.getJobStatus(jobId);
    
    if (!status) {
      throw new BadRequestException('Job not found');
    }

    return status;
  }

  @Get('results/:jobId')
  @ApiOperation({ summary: 'Get parsed document results for a completed job' })
  @ApiParam({ name: 'jobId', description: 'Job ID from upload response' })
  @ApiResponse({
    status: 200,
    description: 'Document results retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found or not completed',
  })
  async getDocumentResults(@Param('jobId') jobId: string): Promise<any> {
    const status = await this.documentProcessingQueue.getJobStatus(jobId);
    
    if (!status) {
      throw new BadRequestException('Job not found');
    }

    if (status.status !== 'completed') {
      throw new BadRequestException(`Job is not completed. Current status: ${status.status}`);
    }

    if (!status.result?.parsedDocument) {
      throw new BadRequestException('No parsed document available for this job');
    }

    return {
      jobId,
      documentId: status.result.documentId,
      parsedDocument: status.result.parsedDocument,
      vectorCount: status.result.vectorCount,
      processingTime: status.result.processingTime,
      completedAt: status.updatedAt,
    };
  }

  @Get('search/:documentId')
  @ApiOperation({ summary: 'Search for similar content within a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID to search within' })
  @ApiQuery({ name: 'query', description: 'Search query text' })
  @ApiQuery({ name: 'topK', description: 'Number of results to return', required: false })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchDocumentContent(
    @Param('documentId') documentId: string,
    @Query('query') query: string,
    @Query('topK') topK: string = '10',
  ): Promise<any> {
    if (!query) {
      throw new BadRequestException('Query parameter is required');
    }

    // For now, return a placeholder response
    // In a real implementation, this would:
    // 1. Generate embedding for the query
    // 2. Search the vector database
    // 3. Return relevant chunks with highlighting info
    return {
      documentId,
      query,
      results: [],
      message: 'Search functionality will be implemented in the next phase',
    };
  }

  @Get('organization/:organizationId/jobs')
  @ApiOperation({ summary: 'Get all document processing jobs for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization jobs retrieved successfully',
    type: [JobStatusResponse],
  })
  async getOrganizationJobs(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ): Promise<JobStatusResponse[]> {
    // Ensure user can only access their organization's jobs
    if (req.user.organizationId !== organizationId) {
      throw new BadRequestException('Access denied to organization jobs');
    }

    return await this.documentProcessingQueue.getOrganizationJobs(organizationId);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get document processing queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
    type: QueueStatsResponse,
  })
  async getQueueStats(): Promise<QueueStatsResponse> {
    return await this.documentProcessingQueue.getQueueStats();
  }

  @Get('vector-database/status')
  @ApiOperation({ summary: 'Get vector database connection status' })
  @ApiResponse({
    status: 200,
    description: 'Vector database status retrieved successfully',
  })
  async getVectorDatabaseStatus(): Promise<{
    isReady: boolean;
    indexStats?: any;
  }> {
    const isReady = this.vectorDatabaseService.isReady();
    
    if (isReady) {
      const indexStats = await this.vectorDatabaseService.getIndexStats();
      return { isReady, indexStats };
    }

    return { isReady: false };
  }

  @Get('services/status')
  @ApiOperation({ summary: 'Get status of all document processing services' })
  @ApiResponse({
    status: 200,
    description: 'Service statuses retrieved successfully',
  })
  async getServicesStatus(): Promise<{
    documentParser: { status: string };
    embedding: { status: string; config: any };
    vectorDatabase: { status: string };
    queue: { status: string; stats: any };
  }> {
    const [queueStats, vectorDbStatus] = await Promise.all([
      this.documentProcessingQueue.getQueueStats(),
      this.vectorDatabaseService.isReady(),
    ]);

    return {
      documentParser: { status: 'ready' },
      embedding: { 
        status: 'ready',
        config: { model: 'text-embedding-3-large' }
      },
      vectorDatabase: { status: vectorDbStatus ? 'ready' : 'not_configured' },
      queue: { 
        status: 'ready',
        stats: queueStats
      },
    };
  }
}
