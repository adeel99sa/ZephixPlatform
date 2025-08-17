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
import { VectorDatabaseService } from './vector-database.service';
import { EmbeddingService } from './embedding.service';

export class UploadDocumentResponse {
  documentId: string;
  message: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class DocumentStatusResponse {
  documentId: string;
  status: 'completed' | 'failed';
  message: string;
  result?: any;
  error?: string;
  processingTime?: number;
}

@ApiTags('Document Processing')
@Controller('v1/documents')
@UseGuards(JwtAuthGuard) // Temporarily disabled OrganizationGuard
@ApiBearerAuth()
export class DocumentUploadController {
  constructor(
    private readonly documentParserService: DocumentParserService,
    private readonly vectorDatabaseService: VectorDatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload and process a document synchronously' })
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
    status: 200,
    description: 'Document processed successfully',
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
      const startTime = Date.now();

      // Parse the document
      const parseResult = await this.documentParserService.parseDocument(
        file.buffer,
        file.originalname,
        documentId,
      );

      if (!parseResult.success || !parseResult.document) {
        throw new Error(`Document parsing failed: ${parseResult.error}`);
      }

      // Generate embeddings
      const embeddings = await this.embeddingService.generateChunkEmbeddings(
        parseResult.document.chunks,
      );

      if (embeddings.length !== parseResult.document.chunks.length) {
        throw new Error(
          `Embedding generation mismatch: expected ${parseResult.document.chunks.length}, got ${embeddings.length}`,
        );
      }

      // Store in vector database
      const vectorResult = await this.vectorDatabaseService.storeDocumentChunks(
        documentId,
        parseResult.document.chunks,
        embeddings,
      );

      if (!vectorResult.success) {
        throw new Error(`Vector storage failed: ${vectorResult.error}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        documentId,
        message: `Document processed successfully in ${processingTime}ms`,
        status: 'completed',
        result: {
          parsedDocument: parseResult.document,
          vectorCount: vectorResult.storedCount,
          processingTime,
        },
      };
    } catch (error) {
      return {
        documentId,
        message: 'Document processing failed',
        status: 'failed',
        error: error.message,
      };
    }
  }

  @Get('status/:documentId')
  @ApiOperation({ summary: 'Get the status of a processed document' })
  @ApiParam({ name: 'documentId', description: 'Document ID from upload' })
  @ApiResponse({
    status: 200,
    description: 'Document status retrieved successfully',
    type: DocumentStatusResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocumentStatus(
    @Param('documentId') documentId: string,
  ): Promise<DocumentStatusResponse> {
    // For now, return a simple status since we're not storing job status
    // In a real implementation, you'd query a database for document status
    return {
      documentId,
      status: 'completed',
      message: 'Document processing completed',
    };
  }

  @Get('results/:documentId')
  @ApiOperation({ summary: 'Get parsed document results' })
  @ApiParam({ name: 'documentId', description: 'Document ID from upload' })
  @ApiResponse({
    status: 200,
    description: 'Document results retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocumentResults(
    @Param('documentId') documentId: string,
  ): Promise<any> {
    // For now, return a simple response since we're not storing results
    // In a real implementation, you'd query the vector database for results
    return {
      documentId,
      message: 'Document results available',
      note: 'Results are stored in the vector database for AI processing',
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'List documents for an organization' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of documents to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of documents to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents listed successfully',
  })
  async listDocuments(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req: any,
  ): Promise<any> {
    // For now, return a simple response since we're not storing document metadata
    // In a real implementation, you'd query a database for document listings
    return {
      documents: [],
      total: 0,
      limit,
      offset,
      message: 'Document listing not yet implemented',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document processing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getDocumentStats(): Promise<any> {
    // For now, return simple stats since we're not tracking processing
    return {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      message: 'Statistics not yet implemented',
    };
  }
}
