# Document Processing Pipeline

## Overview

The Document Processing Pipeline is the core AI infrastructure that enables Zephix to ingest, parse, and vectorize Business Requirements Documents (BRDs) for intelligent analysis and retrieval.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload  │───▶│  Document Parser │───▶│  Embedding     │───▶│ Vector Database │
│   (Controller) │    │   Service        │    │   Service       │    │   (Pinecone)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Job Queue     │    │   Structured     │    │   Vector        │    │   Semantic      │
│   (BullMQ)      │    │   Chunks         │    │   Embeddings    │    │   Search        │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. Document Upload Controller

**Endpoint**: `POST /api/v1/documents/upload`

**Features**:
- File validation (.docx, .pdf)
- Size limits (10MB max)
- JWT authentication required
- Organization scoping
- Returns job ID for async processing

**Response**:
```json
{
  "jobId": "uuid",
  "documentId": "uuid",
  "message": "Document accepted for processing. Use the job ID to check status."
}
```

### 2. Document Parser Service

**Supported Formats**:
- `.docx` - Using mammoth.js
- `.pdf` - Using pdf-parse

**Output Structure**:
```typescript
interface DocumentChunk {
  content: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'list_item' | 'table_cell' | 'heading';
  metadata: {
    source_document_id: string;
    page_number?: number;
    preceding_heading?: string;
    section_level?: number;
    list_type?: 'bullet' | 'numbered';
    table_position?: { row: number; col: number };
  };
}
```

**Intelligent Parsing**:
- Automatic heading detection
- List item identification
- Structural metadata extraction
- Content chunking optimization

### 3. Embedding Service

**Model**: OpenAI `text-embedding-3-large`
**Dimensions**: 1536
**Features**:
- Batch processing (100 texts per request)
- Rate limit handling
- Text validation and truncation
- Token usage tracking

### 4. Vector Database Service

**Platform**: Pinecone
**Features**:
- Automatic index creation
- Batch vector storage
- Metadata filtering
- Semantic search capabilities

**Index Configuration**:
```typescript
{
  name: 'zephix-documents',
  dimension: 1536,
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1',
    },
  },
}
```

### 5. Document Processing Queue

**Queue System**: BullMQ with Redis
**Features**:
- Asynchronous processing
- Job progress tracking
- Retry logic (3 attempts)
- Concurrent processing (2 jobs)
- Job cancellation support

## API Endpoints

### Document Upload
```http
POST /api/v1/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

file: <document_file>
```

### Job Status
```http
GET /api/v1/documents/status/{jobId}
Authorization: Bearer <JWT_TOKEN>
```

### Organization Jobs
```http
GET /api/v1/documents/organization/{organizationId}/jobs
Authorization: Bearer <JWT_TOKEN>
```

### Queue Statistics
```http
GET /api/v1/documents/queue/stats
Authorization: Bearer <JWT_TOKEN>
```

### Vector Database Status
```http
GET /api/v1/documents/vector-database/status
Authorization: Bearer <JWT_TOKEN>
```

### Services Status
```http
GET /api/v1/documents/services/status
Authorization: Bearer <JWT_TOKEN>
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_BASE_URL=https://api.openai.com/v1

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=zephix-documents

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Processing Configuration
DOCUMENT_PROCESSING_CONCURRENCY=2
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=2000
```

## Usage Examples

### 1. Upload and Process Document

```typescript
// Frontend example
const formData = new FormData();
formData.append('file', documentFile);

const response = await fetch('/api/v1/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const { jobId, documentId } = await response.json();

// Poll for status
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/v1/documents/status/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    console.log('Document processed successfully!');
    console.log(`Generated ${status.result.vectorCount} vectors`);
  } else if (status.status === 'failed') {
    console.error('Processing failed:', status.error);
  } else {
    // Still processing, check again in 2 seconds
    setTimeout(checkStatus, 2000);
  }
};

checkStatus();
```

### 2. Search Similar Content

```typescript
// Search for similar content in processed documents
const searchQuery = {
  query: "user authentication requirements",
  filter: {
    source_document_id: "specific-document-id",
    type: "paragraph"
  },
  topK: 5
};

const results = await vectorDatabaseService.searchSimilar(
  queryEmbedding,
  searchQuery
);
```

## Error Handling

### Common Error Scenarios

1. **File Validation Errors**:
   - Unsupported file type
   - File too large (>10MB)
   - Corrupted file

2. **Processing Errors**:
   - OpenAI API rate limits
   - Pinecone connection issues
   - Memory constraints

3. **Authentication Errors**:
   - Invalid JWT token
   - Organization access denied
   - Expired session

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed types: .docx, .pdf",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Performance Considerations

### Processing Times

- **Small documents** (<1MB): 5-15 seconds
- **Medium documents** (1-5MB): 15-45 seconds
- **Large documents** (5-10MB): 45-120 seconds

### Scalability

- **Concurrent processing**: 2 documents simultaneously
- **Queue capacity**: Unlimited (Redis-backed)
- **Vector storage**: Pinecone serverless (auto-scaling)

### Optimization Tips

1. **Batch processing**: Process multiple documents during off-peak hours
2. **File size**: Keep documents under 5MB for optimal performance
3. **Content quality**: Well-structured documents parse faster
4. **Rate limits**: Respect OpenAI API rate limits

## Security Features

### Authentication & Authorization

- JWT token validation
- Organization-level data isolation
- User permission checks
- Request rate limiting

### Data Protection

- No sensitive data in logs
- Secure file handling
- Vector database access controls
- Encrypted API communications

### Compliance

- GDPR-ready data handling
- Configurable data retention
- Audit logging
- Privacy controls

## Monitoring & Observability

### Health Checks

```http
GET /api/v1/documents/services/status
```

**Response**:
```json
{
  "documentParser": { "status": "ready" },
  "embedding": { 
    "status": "ready",
    "config": { "model": "text-embedding-3-large" }
  },
  "vectorDatabase": { "status": "ready" },
  "queue": { 
    "status": "ready",
    "stats": {
      "waiting": 0,
      "active": 1,
      "completed": 15,
      "failed": 0,
      "delayed": 0
    }
  }
}
```

### Metrics

- Document processing success rate
- Average processing time
- Queue depth and throughput
- API response times
- Error rates by type

### Logging

- Structured logging with request IDs
- Processing pipeline events
- Error tracking with stack traces
- Performance metrics

## Troubleshooting

### Common Issues

1. **Pinecone Connection Failed**
   - Check API key and environment
   - Verify network connectivity
   - Check index status

2. **OpenAI API Errors**
   - Verify API key
   - Check rate limits
   - Validate model configuration

3. **Redis Connection Issues**
   - Check Redis server status
   - Verify connection parameters
   - Check firewall settings

4. **File Processing Failures**
   - Validate file format
   - Check file size limits
   - Verify file integrity

### Debug Commands

```bash
# Check service status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/documents/services/status

# Check queue stats
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/documents/queue/stats

# Check vector database status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/documents/vector-database/status
```

## Future Enhancements

### Planned Features

1. **Advanced Parsing**:
   - Table structure recognition
   - Image text extraction (OCR)
   - Multi-language support

2. **Enhanced Embeddings**:
   - Domain-specific fine-tuning
   - Multi-modal embeddings
   - Context-aware chunking

3. **Search Improvements**:
   - Hybrid search (vector + keyword)
   - Semantic similarity scoring
   - Relevance feedback

4. **Processing Pipeline**:
   - Real-time streaming
   - Incremental updates
   - Batch optimization

## Support

For technical support or questions:
1. Check this documentation
2. Review application logs
3. Verify configuration
4. Test with sample documents
5. Contact development team
