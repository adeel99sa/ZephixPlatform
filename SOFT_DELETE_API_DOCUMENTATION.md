# Soft Delete API Documentation

## Overview

The Zephix platform implements soft delete functionality for Projects and Tasks, allowing users to recover accidentally deleted items. Deleted items are moved to a trash system where they can be restored by administrators.

## How Soft Delete Works

### 1. **Soft Delete Process**
- When a project or task is "deleted", it's not actually removed from the database
- Instead, the `deletedAt` field is set to the current timestamp
- The `deletedBy` field is set to the user who performed the deletion
- The item is excluded from normal queries but remains in the database

### 2. **Undo System**
- Users have 10 seconds to undo a deletion using the undo banner
- After 10 seconds, only administrators can restore items from the trash page
- The undo banner appears automatically after deletion

### 3. **Trash Management**
- Administrators can view all soft-deleted items in `/admin/trash`
- Items can be restored individually or in bulk
- Items can be permanently deleted (irreversible)
- The entire trash can be emptied at once

## API Endpoints

### Projects

#### Delete Project (Soft Delete)
```http
DELETE /api/projects/{id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "page": 1,
  "timestamp": "2025-10-03T03:50:36.019Z"
}
```

#### Bulk Restore Projects
```http
POST /api/projects/bulk-restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "ids": ["project-id-1", "project-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restored 2/2 projects",
  "results": [
    {
      "id": "project-id-1",
      "success": true,
      "data": { /* restored project data */ }
    },
    {
      "id": "project-id-2", 
      "success": true,
      "data": { /* restored project data */ }
    }
  ]
}
```

### Trash Management

#### Get Trash Items (Paginated)
```http
GET /api/trash?page=1&limit=50
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "c1bc5cc7-6851-4197-a539-a4dbd56f4f72",
        "itemType": "project",
        "itemName": "Test Soft Delete Project",
        "deletedAt": "2025-10-03T03:50:35.986Z",
        "deletedBy": "8f83a908-abe3-4569-94af-8ca0b0629c57",
        "deletedByUser": {
          "name": "Adeel Aslam",
          "email": "adeel99sa@yahoo.com"
        },
        "organizationId": "06b54693-2b4b-4c10-b553-6dea5c5631c9"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  },
  "total": 1,
  "timestamp": "2025-10-03T03:50:41.020Z"
}
```

#### Restore Item
```http
POST /api/trash/restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemType": "project",
  "id": "project-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item restored successfully"
}
```

#### Bulk Restore Items
```http
POST /api/trash/bulk-restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    { "itemType": "project", "id": "project-id-1" },
    { "itemType": "task", "id": "task-id-1" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2/2 items restored successfully",
  "results": [
    { "id": "project-id-1", "success": true },
    { "id": "task-id-1", "success": true }
  ]
}
```

#### Permanent Delete
```http
DELETE /api/trash/permanent/{itemType}/{id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Item permanently deleted"
}
```

#### Empty Trash
```http
DELETE /api/trash/empty
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "5 items permanently deleted"
}
```

#### Get Trash Statistics
```http
GET /api/trash/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 5,
    "byType": {
      "project": 3,
      "task": 2
    },
    "oldestItem": "2025-10-01T10:00:00.000Z",
    "newestItem": "2025-10-03T03:50:35.986Z"
  }
}
```

## Supported Entity Types

Currently, soft delete is implemented for:
- ✅ **Projects** - Full soft delete with undo banner
- ✅ **Tasks** - Full soft delete with undo banner

## Frontend Integration

### Undo Banner
The undo banner appears automatically after deletion and provides:
- 10-second countdown timer
- One-click undo functionality
- Automatic dismissal after timeout
- Error handling for failed undo attempts

### Trash Page
Administrators can access the trash page at `/admin/trash` to:
- View all soft-deleted items with pagination
- Restore items individually or in bulk
- Permanently delete items
- Empty the entire trash
- View deletion statistics

## Error Handling

### Common Error Responses

#### Item Not Found in Trash
```json
{
  "success": false,
  "message": "Project {id} not found in trash for organization {orgId}"
}
```

#### Invalid Item Type
```json
{
  "success": false,
  "message": "Invalid item type"
}
```

#### Unauthorized Access
```json
{
  "success": false,
  "message": "Unauthorized - Admin access required"
}
```

## Security Considerations

- Only administrators can access the trash page
- All operations are scoped to the user's organization
- Soft-deleted items are excluded from normal queries
- Permanent deletion requires explicit confirmation
- All operations are logged for audit purposes

## Performance Notes

- Trash queries use pagination to handle large datasets
- Soft-deleted items are excluded from normal queries using database indexes
- Bulk operations are optimized for multiple items
- The undo banner uses a 10-second timeout to prevent UI clutter





