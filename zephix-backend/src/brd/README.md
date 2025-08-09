# Business Requirements Document (BRD) System

A comprehensive BRD management system with JSON Schema validation, full-text search, and enterprise-grade features.

## Overview

This system provides:
- ✅ JSON Schema 2020-12 validation with AJV
- ✅ PostgreSQL JSONB storage with GIN indexing
- ✅ Full-text search with PostgreSQL tsvector
- ✅ Status workflow management (draft → in_review → approved → published)
- ✅ RBAC integration ready
- ✅ Comprehensive API endpoints
- ✅ Unit and E2E tests
- ✅ TypeORM migrations

## Quick Start

### 1. Install Dependencies
```bash
cd zephix-backend
npm install
```

### 2. Set Up Database
```bash
# Create PostgreSQL database
createdb zephix_dev

# Run migrations
npm run db:migrate
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure database URL
DATABASE_URL=postgresql://user:password@localhost:5432/zephix_dev
```

### 4. Test the System
```bash
# Run unit tests
npm test -- --testPathPattern=brd

# Run E2E tests
npm run test:e2e -- --testNamePattern=BRD
```

## API Endpoints

### Core Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brd` | Create new BRD |
| PUT | `/api/brd/:id` | Update BRD (draft only) |
| GET | `/api/brd/:id` | Get BRD by ID |
| GET | `/api/brd` | List BRDs with filters |
| DELETE | `/api/brd/:id` | Delete BRD (non-published only) |

### Status Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brd/:id/publish` | Change BRD status |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brd/:id/validation` | Get validation summary |
| GET | `/api/brd/schema` | Get JSON schema |
| GET | `/api/brd/search` | Full-text search |

## Usage Examples

### Create a BRD
```bash
curl -X POST http://localhost:3000/api/brd \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_id": "550e8400-e29b-41d4-a716-446655440001",
    "payload": {
      "metadata": {
        "title": "Customer Portal Enhancement",
        "summary": "Enhance customer portal with self-service features",
        "version": "1.0.0",
        "department": "Product",
        "industry": "Technology",
        "documentOwner": {
          "name": "John Doe",
          "email": "john.doe@company.com",
          "role": "Product Manager"
        }
      },
      "businessContext": {
        "problemStatement": "Current customer portal lacks self-service functionality",
        "businessObjective": "Improve customer experience and reduce support costs"
      },
      "functionalRequirements": [
        {
          "id": "FR-001",
          "title": "User Authentication",
          "description": "Users must be able to securely authenticate",
          "priority": "Must Have",
          "category": "Security",
          "acceptanceCriteria": ["Users can log in securely"]
        }
      ]
    }
  }'
```

### List BRDs with Filters
```bash
curl "http://localhost:3000/api/brd?tenantId=550e8400-e29b-41d4-a716-446655440000&status=draft&industry=Technology&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update BRD Status
```bash
curl -X POST http://localhost:3000/api/brd/123e4567-e89b-12d3-a456-426614174000/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review"}'
```

### Full-text Search
```bash
curl "http://localhost:3000/api/brd/search?tenantId=550e8400-e29b-41d4-a716-446655440000&q=customer%20portal&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Schema Structure

The BRD schema includes these main sections:

- **metadata** - Document information, owner, version
- **businessContext** - Problem statement, objectives, success criteria
- **stakeholders** - Primary stakeholders and end users
- **scope** - In/out of scope, assumptions, constraints
- **functionalRequirements** - Detailed functional requirements with acceptance criteria
- **nonFunctionalRequirements** - Performance, security, scalability requirements
- **timeline** - Project phases, milestones, dates
- **riskAssessment** - Risk identification and mitigation
- **approvals** - Required approvals and decision log

## Validation Features

### Strict Validation
- JSON Schema 2020-12 compliance
- Format validation (email, date, URI)
- Enum constraints
- String length limits
- Array size limits
- Required field checking

### Error Handling
```json
{
  "message": "BRD validation failed",
  "errors": [
    {
      "path": "metadata.title",
      "message": "Must be at least 3 characters long",
      "value": "ab"
    },
    {
      "path": "functionalRequirements.0.id",
      "message": "Must match the required pattern",
      "value": "INVALID-001"
    }
  ]
}
```

## Database Schema

### Table Structure
```sql
CREATE TABLE brds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  project_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  search_vector TSVECTOR,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Indexes
- GIN index on `payload` for JSON queries
- GIN index on `search_vector` for full-text search
- Composite indexes on `(tenant_id, status)` and `(tenant_id, project_id)`

### Full-text Search
Automatic search vector generation from:
- `metadata.title` (weight A)
- `metadata.summary` (weight B)
- `businessContext.*` (weight C)
- `functionalRequirements[].description` (weight D)

## Status Workflow

```
draft → in_review → approved → published
  ↑         ↓           ↓         ↓
  └─────────┴───────────┴─────────┘
```

### Transition Rules
- **draft**: Can move to `in_review`
- **in_review**: Can move to `draft` or `approved`
- **approved**: Can move to `published` or `in_review`
- **published**: Can move to `in_review` (for updates)

### Edit Permissions
- Only `draft` status BRDs can be edited
- `published` BRDs cannot be deleted

## Testing

### Unit Tests
```bash
# Test validation service
npm test -- src/brd/validation/__tests__/brd-validation.service.spec.ts

# Test BRD service
npm test -- src/brd/services/__tests__/brd.service.spec.ts
```

### E2E Tests
```bash
# Test all BRD endpoints
npm run test:e2e -- test/brd.e2e-spec.ts
```

### Test Coverage
- ✅ Schema validation (positive and negative cases)
- ✅ CRUD operations
- ✅ Status transitions
- ✅ Error handling
- ✅ Authentication/authorization
- ✅ Filtering and pagination
- ✅ Full-text search

## Performance Considerations

### Database Optimization
- JSONB storage for efficient queries
- GIN indexes for fast JSON and full-text queries
- Connection pooling for scalability

### Query Performance
- Filtered queries use indexes effectively
- Pagination prevents large result sets
- Search ranking for relevant results

### Validation Performance
- Schema compiled once at startup
- Efficient AJV validation
- Early validation failure detection

## Security Features

### Input Validation
- Strict JSON schema validation
- SQL injection prevention via parameterized queries
- XSS prevention via input sanitization

### Access Control
- JWT authentication required
- Tenant-based data isolation
- RBAC ready for role-based permissions

### Data Protection
- No sensitive data in logs
- Secure error messages
- JSONB prevents NoSQL injection

## Integration Points

### Authentication
Integrates with existing JWT auth system:
```typescript
@UseGuards(JwtAuthGuard)
@Controller('api/brd')
```

### Project Management
Links to projects via `project_id`:
```sql
FOREIGN KEY (project_id) REFERENCES projects(id)
```

### Multi-tenancy
Tenant isolation via `tenant_id`:
```typescript
where: { tenant_id: userTenantId }
```

## Monitoring and Observability

### Logging
- Structured logging with request IDs
- Error tracking with stack traces
- Performance metrics for database operations

### Metrics
- API response times
- Validation error rates
- Database query performance
- Search query performance

### Health Checks
```bash
curl http://localhost:3000/health
```

## Deployment

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Application
NODE_ENV=production
JWT_SECRET=your-secret-key

# Optional: Enable debug logging
LOG_LEVEL=debug
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Railway Deployment
The system is optimized for Railway deployment with:
- Automatic DATABASE_URL detection
- IPv4 connection preferences
- Connection pooling for platform limits
- Retry logic for platform stability

## Development

### File Structure
```
src/brd/
├── controllers/
│   └── brd.controller.ts
├── dto/
│   ├── create-brd.dto.ts
│   ├── update-brd.dto.ts
│   ├── brd-query.dto.ts
│   ├── publish-brd.dto.ts
│   └── brd-response.dto.ts
├── entities/
│   └── brd.entity.ts
├── schema/
│   ├── brd.schema.json
│   └── brd.seed.json
├── services/
│   └── brd.service.ts
├── validation/
│   └── brd-validation.service.ts
└── brd.module.ts
```

### Adding New Features

1. **Update Schema**: Modify `brd.schema.json`
2. **Add Validation**: Update validation service if needed
3. **Update Entity**: Add TypeORM decorators if needed
4. **Add Tests**: Write unit and E2E tests
5. **Update Documentation**: Update this README

### Common Tasks

#### Add New BRD Field
1. Update `brd.schema.json`
2. Update seed data in `brd.seed.json`
3. Add tests for new field validation
4. Update documentation

#### Add New API Endpoint
1. Add method to `BRDService`
2. Add endpoint to `BRDController`
3. Add DTO for request/response
4. Add E2E tests
5. Update API documentation

#### Modify Status Workflow
1. Update `BRDStatus` enum
2. Update `canTransitionTo` method
3. Update validation rules
4. Add tests for new transitions
5. Update documentation

## Troubleshooting

### Common Issues

#### Validation Errors
```bash
# Check schema format
curl http://localhost:3000/api/brd/schema

# Validate against schema manually
node -e "
const Ajv = require('ajv');
const schema = require('./src/brd/schema/brd.schema.json');
const data = require('./src/brd/schema/brd.seed.json');
const ajv = new Ajv();
console.log(ajv.validate(schema, data));
"
```

#### Database Connection Issues
```bash
# Test database connection
psql -d your_database_url -c "SELECT 1;"

# Check migration status
npm run db:migrate
```

#### Search Not Working
```bash
# Check if pg_trgm extension is installed
psql -d your_database -c "SELECT * FROM pg_extension WHERE extname='pg_trgm';"

# Rebuild search vectors
psql -d your_database -c "UPDATE brds SET updated_at = updated_at;"
```

### Performance Issues

#### Slow Queries
1. Check query execution plans
2. Verify indexes are being used
3. Monitor connection pool usage
4. Check for N+1 query problems

#### Memory Issues
1. Monitor JSON payload sizes
2. Check for memory leaks in validation
3. Monitor connection pool size
4. Check for large result sets

## Support

For issues and questions:
1. Check this documentation
2. Review test cases for examples
3. Check application logs
4. Verify database schema and indexes

## Migration Notes

### From Previous BRD System
If migrating from an existing BRD system:

1. **Data Migration**: Convert existing BRDs to new schema format
2. **API Changes**: Update client code to use new endpoints
3. **Schema Validation**: Ensure existing data passes validation
4. **Status Mapping**: Map old statuses to new workflow
5. **Search Rebuild**: Regenerate search vectors for existing data

### Database Migrations
The system includes a comprehensive migration that:
- Creates the `brds` table
- Sets up all indexes
- Creates the search vector trigger
- Enables required PostgreSQL extensions

## License

Part of the Zephix project management platform.
