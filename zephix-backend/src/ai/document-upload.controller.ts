import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  HttpStatus,
  HttpCode,
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
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimiterGuard } from '../common/guards/rate-limiter.guard';
import { DocumentParserService } from './document-parser.service';
import { EmbeddingService } from './embedding.service';
import { VectorDatabaseService } from './vector-database.service';
import {
  DocumentStatusResponse,
  DocumentUploadResponse,
} from './dto/document-upload.dto';

@ApiTags('Document Upload & Processing')
@Controller('ai/documents')
@UseGuards(JwtAuthGuard, RateLimiterGuard)
@ApiBearerAuth()
export class DocumentUploadController {
  constructor(
    private readonly documentParserService: DocumentParserService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorDatabaseService: VectorDatabaseService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Upload and process document',
    description: 'Upload a document for AI analysis and processing',
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
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Document upload accepted for processing',
    type: DocumentUploadResponse,
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
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(pdf|docx|txt)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<DocumentUploadResponse> {
    // Generate unique document ID
    const documentId = uuidv4();

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
        parseResult.document.content,
      );

      if (embeddings.length !== parseResult.document.content.length) {
        throw new Error(
          `Embedding generation mismatch: expected ${parseResult.document.content.length}, got ${embeddings.length}`,
        );
      }

      // Store in vector database
      const vectorResult = await this.vectorDatabaseService.storeDocumentChunks(
        documentId,
        parseResult.document.content,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        documentId,
        message: 'Document processing failed',
        status: 'failed',
        error: errorMessage,
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
  getDocumentStatus(
    @Param('documentId') documentId: string,
  ): DocumentStatusResponse {
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
  getDocumentResults(@Param('documentId') documentId: string): {
    documentId: string;
    message: string;
    note: string;
  } {
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
  @ApiResponse({
    status: 200,
    description: 'Documents listed successfully',
  })
  listDocuments(): {
    documents: any[];
    total: number;
    limit: number;
    offset: number;
    message: string;
  } {
    // For now, return a simple response since we're not storing document metadata
    // In a real implementation, you'd query a database for document listings
    return {
      documents: [],
      total: 0,
      limit: 50, // Default limit
      offset: 0, // Default offset
      message: 'Document listing not yet implemented',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document processing statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getDocumentStats(): {
    totalProcessed: number;
    totalFailed: number;
    averageProcessingTime: number;
    message: string;
  } {
    // For now, return simple stats since we're not tracking processing
    return {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      message: 'Statistics not yet implemented',
    };
  }
}
