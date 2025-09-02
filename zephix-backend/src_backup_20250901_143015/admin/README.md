# Admin Module

## Overview

The Admin Module provides comprehensive administrative functionality for the Zephix platform, including user management, system statistics, and audit logging.

## Features

- **User Management**: View, search, and paginate users
- **System Statistics**: Real-time platform metrics
- **Audit Logging**: Track administrative actions
- **Role-Based Access Control**: Admin-only endpoints

## Architecture

```
admin/
├── admin.module.ts          # Module configuration
├── admin.controller.ts      # HTTP endpoints
├── admin.service.ts         # Business logic
├── guards/
│   └── admin.guard.ts      # Admin access control
└── dto/
    ├── admin-stats.dto.ts      # Statistics response DTO
    ├── create-audit-log.dto.ts # Audit log creation DTO
    └── pagination.dto.ts       # Pagination parameters DTO
```

## API Endpoints

### GET /admin/stats
Returns comprehensive system statistics.

**Response:**
```json
{
  "userCount": 150,
  "templateCount": 25,
  "projectCount": 75,
  "activeUsers": 120,
  "lastActivity": "2024-01-15T10:30:00Z",
  "recentActivities": [...]
}
```

### GET /admin/users
Returns paginated list of users with search functionality.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for email, firstName, or lastName

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "organizationId": "org-uuid",
      "organization": "Organization Name"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

### POST /admin/audit
Creates an audit log entry.

**Request Body:**
```json
{
  "action": "user.updated",
  "entityType": "user",
  "entityId": "user-uuid",
  "oldValues": { "role": "user" },
  "newValues": { "role": "admin" },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### GET /admin/audit
Returns audit logs (placeholder implementation).

## Security

### Admin Guard
The `AdminGuard` ensures only admin users can access these endpoints:

- Users with `role: 'admin'`
- Users with email `admin@zephix.ai`

### Authentication
All endpoints require valid JWT authentication via `Authorization: Bearer <token>` header.

## Database Schema

### User Entity Updates
Added `lastLoginAt` field to track user login activity:

```sql
ALTER TABLE users ADD COLUMN "lastLoginAt" TIMESTAMP;
CREATE INDEX "IDX_USERS_LAST_LOGIN" ON users ("lastLoginAt");
```

## Usage Examples

### Frontend Integration

```typescript
import { adminApi } from '../services/adminApi';

// Get statistics
const stats = await adminApi.getStats();

// Get users with pagination
const users = await adminApi.getUsers({ 
  page: 1, 
  limit: 20, 
  search: 'john' 
});

// Create audit log
await adminApi.createAuditLog({
  action: 'user.deleted',
  entityType: 'user',
  entityId: 'user-uuid'
});
```

### Backend Service Usage

```typescript
import { AdminService } from './admin.service';

@Injectable()
export class SomeService {
  constructor(private adminService: AdminService) {}

  async someMethod() {
    // Get admin statistics
    const stats = await this.adminService.getStats();
    
    // Get users
    const users = await this.adminService.getUsers({ 
      page: 1, 
      limit: 10 
    });
  }
}
```

## Testing

### Run E2E Tests
```bash
npm run test:e2e -- --testNamePattern="Admin Endpoints"
```

### Test Admin Endpoints
```bash
npm run test:admin
```

### Run Migration
```bash
npm run migrate:add-last-login
```

## Development

### Adding New Endpoints

1. Add method to `AdminService`
2. Add endpoint to `AdminController`
3. Create/update DTOs if needed
4. Add tests
5. Update documentation

### Adding New Statistics

1. Update `AdminService.getStats()` method
2. Update `AdminStatsDto`
3. Update frontend dashboard
4. Add tests

## Dependencies

- `@nestjs/common`: Core NestJS functionality
- `@nestjs/typeorm`: Database integration
- `@nestjs/swagger`: API documentation
- `class-validator`: Input validation
- `class-transformer`: Data transformation

## Error Handling

All endpoints include comprehensive error handling:

- **400**: Invalid input data
- **401**: Unauthenticated requests
- **403**: Non-admin users
- **500**: Internal server errors

## Performance Considerations

- Database queries use proper indexing
- Pagination limits prevent large result sets
- Search queries use database-level filtering
- Audit logging is asynchronous where possible

## Future Enhancements

- [ ] Full audit log entity and storage
- [ ] User activity tracking
- [ ] Advanced analytics dashboard
- [ ] Bulk user operations
- [ ] User role management
- [ ] System health monitoring
