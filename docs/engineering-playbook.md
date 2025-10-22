# Zephix Engineering Playbook

## 🚀 **Quick Start for New Developers**

### **1. Development Setup**
```bash
git clone <repo>
cd zephix-frontend
npm ci
npm run dev
```

### **2. Core Rules (Non-Negotiable)**
- ✅ **Never use `fetch()`** - Use `apiClient` only
- ✅ **Never use raw `axios`** - Use `apiClient` only  
- ✅ **Always use `getErrorText()`** for error display
- ✅ **One commit per logical change**
- ✅ **Run guardrails before committing**

---

## 🛡️ **Self-Protecting Architecture**

### **What Protects You**
1. **ESLint** - Blocks `fetch()` in your IDE instantly
2. **Pre-commit Hook** - Runs `lint + guardrails` before commit
3. **CI Pipeline** - Runs `build + guardrails + smoke` on every PR
4. **Guardrail Test** - Fails if any raw `fetch` calls exist

### **What You Cannot Break**
- API path normalization (`/api` prefix)
- Authentication headers (`Authorization`, `X-Workspace-Id`)
- Token refresh flow (single-flight, loop-proof)
- Error handling standardization

---

## 📝 **Copy-Paste Templates**

### **API Call Pattern**
```typescript
import { apiClient } from '@/lib/api/client';

// GET with params
export async function getTeams(params: { limit?: number; search?: string }) {
  const { data } = await apiClient.get('/teams', { params });
  return data;
}

// POST with body
export async function createTeam(team: { name: string; description?: string }) {
  const { data } = await apiClient.post('/teams', team);
  return data;
}

// File upload
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
```

### **React Component Pattern**
```typescript
import { useQuery } from '@tanstack/react-query';
import { getErrorText } from '@/lib/api/errors';
import { getTeams } from '@/features/teams/api';

export default function TeamsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams
  });

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">{getErrorText(error)}</div>;
  
  return (
    <div>
      {data?.map(team => (
        <div key={team.id}>{team.name}</div>
      ))}
    </div>
  );
}
```

### **Error Handling Pattern**
```typescript
import { getErrorText } from '@/lib/api/errors';

// In components
const [error, setError] = useState<string | null>(null);

try {
  await apiClient.post('/endpoint', data);
} catch (err) {
  setError(getErrorText(err)); // Safe error display
}

// In forms
const handleSubmit = async (formData: FormData) => {
  try {
    await apiClient.post('/submit', formData);
    toast.success('Success!');
  } catch (error) {
    toast.error(getErrorText(error));
  }
};
```

---

## 🔧 **Development Workflow**

### **Before You Start**
```bash
# Check current branch
git status

# Pull latest
git pull origin main

# Install dependencies
npm ci
```

### **Making Changes**
1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** using the patterns above
3. **Test locally**: `npm run dev`
4. **Run guardrails**: `npm run test:guardrails`
5. **Commit**: `git commit -m "feat: your change"`
6. **Push**: `git push origin feature/your-feature`
7. **Create PR** - CI will run automatically

### **What CI Checks**
- ✅ **Lint** - Code style and rules
- ✅ **Build** - TypeScript compilation
- ✅ **Guardrails** - No raw `fetch` calls
- ✅ **Smoke Tests** - Login → Hub → Projects → Admin → Logout

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"fetch is not defined" ESLint Error**
```typescript
// ❌ DON'T DO THIS
const response = await fetch('/api/users');

// ✅ DO THIS
import { apiClient } from '@/lib/api/client';
const { data } = await apiClient.get('/users');
```

#### **Double `/api/api` in URLs**
```typescript
// ❌ DON'T DO THIS
await apiClient.get('/api/users'); // Results in /api/api/users

// ✅ DO THIS  
await apiClient.get('/users'); // Results in /api/users
```

#### **Missing Auth Headers**
```typescript
// ❌ DON'T DO THIS
const response = await fetch('/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// ✅ DO THIS
// Headers are added automatically by apiClient
const { data } = await apiClient.get('/users');
```

#### **Error Display Crashes**
```typescript
// ❌ DON'T DO THIS
<div>{error}</div> // Crashes if error is an object

// ✅ DO THIS
import { getErrorText } from '@/lib/api/errors';
<div>{getErrorText(error)}</div> // Safe string display
```

### **Debugging API Calls**
1. **Open DevTools** → Network tab
2. **Look for headers**: `x-request-id`, `x-correlation-id`, `Authorization`
3. **Check URLs**: Should be `/api/...` not `/api/api/...`
4. **Error responses**: Should have standardized format

---

## 🧪 **Testing**

### **Running Tests**
```bash
# Unit tests
npm run test

# Guardrail tests (prevents regressions)
npm run test:guardrails

# Smoke tests (full user journey)
npm run test:smoke

# All tests
npm run ci:verify
```

### **Adding New Tests**
```typescript
// Guardrail test (prevents raw fetch)
test("no raw fetch outside tests/mocks", () => {
  // This test runs in CI and fails if raw fetch is found
});

// Smoke test (user journey)
test("user can login and navigate", async ({ page }) => {
  await page.goto("/login");
  // ... test steps
});
```

---

## 🚀 **Deployment**

### **Production Build**
```bash
# From stable tag
git checkout v0.2-stable
npm ci
npm run build

# Deploy dist/ folder to your hosting
```

### **Environment Variables**
```bash
# Development (default)
VITE_API_BASE=  # Empty = localhost:3000

# Production
VITE_API_BASE=https://api.yourdomain.com
```

### **Post-Deploy Verification**
1. **Network tab**: No `/api/api/...` URLs
2. **Auth flow**: Login works, headers present
3. **Error handling**: 500s show toast, logs captured
4. **Admin routes**: Lazy loading works

---

## 📊 **Observability**

### **Request Tracking**
Every API call includes:
- `x-request-id`: Unique request identifier
- `x-correlation-id`: Request correlation for tracing
- `Authorization`: Bearer token (if authenticated)
- `X-Workspace-Id`: Workspace context

### **Error Logging**
All errors are logged with:
```json
{
  "status": 500,
  "url": "/api/users",
  "message": "Internal server error",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req_1234567890_abc123",
  "correlationId": "corr_1234567890_def456"
}
```

### **Debugging User Issues**
1. **Get correlation ID** from browser DevTools
2. **Search backend logs** for that correlation ID
3. **Trace full request flow** from frontend to backend

---

## 🔄 **Rollback Procedures**

### **Frontend Rollback**
```bash
# Roll back to previous stable version
git checkout v0.1-stable
npm ci && npm run build
# Deploy new build
```

### **Backend Rollback**
```bash
# Redeploy previous backend image
# Frontend will degrade gracefully (401s → logout)
```

---

## 📚 **Resources**

### **Documentation**
- [API Client Guide](./api-client.md) - Complete API patterns
- [This Playbook](./engineering-playbook.md) - Development workflow

### **Key Files**
- `src/lib/api/client.ts` - Centralized API client
- `src/lib/api/errors.ts` - Error handling utilities
- `src/test/guardrails/` - Regression prevention tests
- `tests/smoke.login.spec.ts` - User journey tests

### **Commands Reference**
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Code linting
npm run test:guardrails  # Prevent regressions
npm run test:smoke   # User journey tests
npm run ci:verify    # Full CI pipeline
```

---

## 🎯 **Success Metrics**

### **Code Quality**
- ✅ Zero raw `fetch` calls
- ✅ All API calls through `apiClient`
- ✅ Consistent error handling
- ✅ All tests passing

### **User Experience**
- ✅ Fast page loads
- ✅ Reliable authentication
- ✅ Clear error messages
- ✅ Smooth navigation

### **Developer Experience**
- ✅ Instant feedback (ESLint)
- ✅ Automated testing (CI)
- ✅ Clear patterns (templates)
- ✅ Easy debugging (observability)

---

**Welcome to Zephix! 🚀 You're now equipped with a self-protecting, enterprise-grade development environment.**
