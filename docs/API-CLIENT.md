# API Client Usage Patterns & Examples

## Core Rules

### ❌ Never Use Raw HTTP Calls
```typescript
// ❌ DON'T DO THIS
const response = await fetch('/api/users');
const data = await axios.get('/api/users');
```

### ✅ Always Use apiClient
```typescript
// ✅ DO THIS
import { apiClient } from '@/lib/api/client';
const { data } = await apiClient.get('/users');
```

## Usage Patterns

### GET Requests
```typescript
import { apiClient } from '@/lib/api/client';

// Simple GET
export async function getUsers() {
  const { data } = await apiClient.get('/users');
  return data;
}

// GET with query parameters
export async function getUsers(params: { page?: number; limit?: number; search?: string }) {
  const { data } = await apiClient.get('/users', { params });
  return data;
}
```

### POST Requests
```typescript
// POST with JSON body
export async function createUser(user: { name: string; email: string }) {
  const { data } = await apiClient.post('/users', user);
  return data;
}

// POST with form data
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
```

### PUT/PATCH/DELETE Requests
```typescript
// PUT for full updates
export async function updateUser(id: string, user: { name: string; email: string }) {
  const { data } = await apiClient.put(`/users/${id}`, user);
  return data;
}

// PATCH for partial updates
export async function updateUserStatus(id: string, status: string) {
  const { data } = await apiClient.patch(`/users/${id}`, { status });
  return data;
}

// DELETE
export async function deleteUser(id: string) {
  const { data } = await apiClient.delete(`/users/${id}`);
  return data;
}
```

## React Query Integration

### Query Hook Pattern
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useUsers(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Mutation Hook Pattern
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (user: { name: string; email: string }) => {
      const { data } = await apiClient.post('/users', user);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Error Handling

### Safe Error Display
```typescript
import { getErrorText } from '@/lib/api/errors';

// In components
const [error, setError] = useState<string | null>(null);

try {
  await apiClient.post('/endpoint', data);
} catch (err) {
  setError(getErrorText(err)); // Safe error display
}

// In JSX
if (error) {
  return <div className="text-red-600">{getErrorText(error)}</div>;
}
```

### Form Error Handling
```typescript
const handleSubmit = async (formData: FormData) => {
  try {
    await apiClient.post('/submit', formData);
    toast.success('Success!');
  } catch (error) {
    toast.error(getErrorText(error));
  }
};
```

## What apiClient Handles Automatically

### 1. Path Normalization
- Adds `/api` prefix to all relative URLs
- Prevents double `/api/api` prefixes
- Handles absolute URLs correctly

### 2. Authentication Headers
- Automatically adds `Authorization: Bearer <token>` when user is authenticated
- Handles token refresh on 401 responses
- Redirects to login on auth failure

### 3. Workspace Context
- Adds `X-Workspace-Id` header for multi-tenant support
- Adds `X-Organization-Id` header for organization context

### 4. Request Tracking
- Generates unique `x-request-id` for each request
- Generates `x-correlation-id` for observability
- Enables request tracing and debugging

### 5. Error Handling
- Standardizes error responses across the app
- Handles 401 → refresh → retry automatically
- Logs errors with full context for debugging
- Shows global toasts for server errors (500+)

### 6. Rate Limiting
- Automatically retries on 429 responses
- Respects `Retry-After` headers

## Common Patterns

### Feature-Based API Organization
```typescript
// src/features/users/api/users.ts
import { apiClient } from '@/lib/api/client';

export const usersApi = {
  list: (params?: { page?: number; search?: string }) =>
    apiClient.get('/users', { params }),
  
  get: (id: string) =>
    apiClient.get(`/users/${id}`),
  
  create: (user: { name: string; email: string }) =>
    apiClient.post('/users', user),
  
  update: (id: string, user: { name: string; email: string }) =>
    apiClient.put(`/users/${id}`, user),
  
  delete: (id: string) =>
    apiClient.delete(`/users/${id}`),
};
```

### Type-Safe API Calls
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export async function getUsers(params?: { page?: number; search?: string }): Promise<UserListResponse> {
  const { data } = await apiClient.get('/users', { params });
  return data;
}
```

## Troubleshooting

### Common Issues

#### Double `/api` prefix
```typescript
// ❌ Wrong - results in /api/api/users
await apiClient.get('/api/users');

// ✅ Correct - results in /api/users
await apiClient.get('/users');
```

#### Missing auth headers
```typescript
// ❌ Wrong - bypasses automatic auth
const response = await fetch('/api/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ✅ Correct - auth handled automatically
const { data } = await apiClient.get('/users');
```

#### Error display crashes
```typescript
// ❌ Wrong - crashes if error is an object
<div>{error}</div>

// ✅ Correct - safe string display
<div>{getErrorText(error)}</div>
```

## Migration Guide

### From Raw Fetch
```typescript
// Before
const response = await fetch('/api/users');
const data = await response.json();

// After
const { data } = await apiClient.get('/users');
```

### From Axios
```typescript
// Before
const response = await axios.get('/api/users');
const data = response.data;

// After
const { data } = await apiClient.get('/users');
```

## Best Practices

1. **Always import apiClient** from the centralized location
2. **Use getErrorText()** for safe error display
3. **Leverage React Query** for caching and state management
4. **Handle loading states** appropriately
5. **Test with the guardrail** to ensure compliance
6. **Use TypeScript** for type safety
7. **Organize by feature** for maintainability
