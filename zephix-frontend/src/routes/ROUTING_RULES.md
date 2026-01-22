# Zephix Frontend Routing Rules

## URL Strategy

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page
- `/invite` - Invite page
- `/invites/accept` - Accept invite page
- `/verify-email` - Email verification page
- `/w/:slug` - Public redirect helper only, never a real page

### Protected Routes (Org-level)
- `/home` - Home dashboard
- `/projects` - Projects list
- `/template-center` - Template center (redirects from `/templates`)
- `/settings` - Settings page
- `/my-work` - My work page (paid feature)
- `/inbox` - Inbox (paid feature)

### Protected Routes (Workspace-scoped)
All workspace pages use slug-based routing:
- `/w/:slug/home` - Workspace home
- `/w/:slug/overview` - Workspace overview
- `/w/:slug/members` - Workspace members
- `/w/:slug/programs` - Workspace programs
- `/w/:slug/portfolios` - Workspace portfolios

### Legacy Routes (Redirects Only)
- `/workspaces/:id/*` - Catch-all redirect to slug-based routes
  - `/workspaces/:id` → `/w/:slug/home`
  - `/workspaces/:id/members` → `/w/:slug/members`
  - `/workspaces/:id/programs` → `/w/:slug/programs`
  - etc.

### Admin Routes
- `/admin/*` - All admin pages

## Routing Helpers

**Always use helpers from `@/routes/workspaceRoutes.ts`:**

```ts
import { workspaceHome, workspaceMembers, workspacePrograms, workspacePortfolios } from "@/routes/workspaceRoutes";

// ✅ Correct
navigate(workspaceHome(slug), { replace: true });

// ❌ Wrong
navigate(`/w/${slug}/home`, { replace: true });
```

## Post-Login Routing

1. Check for `redirect` query parameter first
2. If admin role, go to `/admin/overview`
3. Otherwise, go to `/home`

**Implementation:** `LoginPage.tsx` handles all post-login routing logic.

## Workspace Selection

- Auto-select sets workspace but does NOT navigate
- Manual selection navigates to `workspaceHome(slug)`
- Workspace creation navigates to `workspaceHome(slug)` after refresh

## Testing

Use `/dev/routes` page to verify routing state:
- Current pathname
- Active workspace ID
- Current workspace slug
- User role
