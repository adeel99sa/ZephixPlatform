import { ApiProperty } from '@nestjs/swagger';

export class DocumentUploadResponse {
  @ApiProperty({ description: 'Unique document identifier' })
  documentId: string;

  @ApiProperty({ description: 'Processing result message' })
  message: string;

  @ApiProperty({
    enum: ['completed', 'failed'],
    description: 'Processing status',
  })
  status: 'completed' | 'failed';

  @ApiProperty({ description: 'Processing result details', required: false })
  result?: {
    parsedDocument: {
      id: string;
      filename: string;
      content: Array<{
        content: string;
        type: string;
        metadata: Record<string, unknown>;
      }>;
      metadata: {
        fileSize: number;
        pageCount?: number;
        processingTime: number;
      };
    };
    vectorCount: number;
    processingTime: number;
  };

  @ApiProperty({
    description: 'Error message if processing failed',
    required: false,
  })
  error?: string;
}

export class DocumentStatusResponse {
  @ApiProperty({ description: 'Unique document identifier' })
  documentId: string;

  @ApiProperty({
    enum: ['completed', 'failed'],
    description: 'Processing status',
  })
  status: 'completed' | 'failed';

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Processing result details', required: false })
  result?: {
    parsedDocument: {
      id: string;
      filename: string;
      content: Array<{
        content: string;
        type: string;
        metadata: Record<string, unknown>;
      }>;
      metadata: {
        fileSize: number;
        pageCount?: number;
        processingTime: number;
      };
    };
    vectorCount: number;
    processingTime: number;
  };

  @ApiProperty({
    description: 'Error message if processing failed',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    required: false,
  })
  processingTime?: number;
}
