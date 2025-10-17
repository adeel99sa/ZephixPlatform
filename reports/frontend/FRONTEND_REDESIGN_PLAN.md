# Zephix Frontend Redesign Plan

**Based on:** `reports/frontend/FRONTEND_AUDIT.md`  
**Date:** October 17, 2025  
**Status:** Planning Phase - No Code Changes Yet

## 🎯 Objective

Design a modernization blueprint that addresses:
- 657 ESLint issues (style + unused vars)
- Bundle size above 700 KB target
- Missing WCAG 2.2 AA compliance
- Inconsistent state management patterns
- Performance bottlenecks and accessibility gaps

---

## 1. 📁 Folder Structure

### Proposed Clean Architecture

```
src/
├── components/
│   ├── ui/                    # Reusable UI primitives
│   │   ├── button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── input/
│   │   ├── card/
│   │   ├── modal/
│   │   ├── table/
│   │   ├── form/
│   │   ├── navigation/
│   │   ├── feedback/
│   │   └── layout/
│   ├── features/              # Feature-specific components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── index.ts
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── index.ts
│   │   ├── resources/
│   │   ├── analytics/
│   │   ├── ai/
│   │   └── settings/
│   ├── layouts/               # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── PublicLayout.tsx
│   │   └── index.ts
│   └── shared/                # Shared business components
│       ├── ErrorBoundary.tsx
│       ├── LoadingSpinner.tsx
│       ├── PageHeader.tsx
│       └── index.ts
├── features/                  # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── index.ts
│   ├── projects/
│   ├── resources/
│   ├── analytics/
│   ├── ai/
│   └── settings/
├── lib/                       # Utilities and configurations
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   ├── types.ts
│   │   └── interceptors.ts
│   ├── hooks/
│   │   ├── useApi.ts
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   └── index.ts
│   └── config/
│       ├── env.ts
│       ├── routes.ts
│       └── index.ts
├── stores/                    # Global state management
│   ├── authStore.ts
│   ├── projectStore.ts
│   ├── uiStore.ts
│   └── index.ts
├── pages/                     # Page components
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   ├── resources/
│   ├── analytics/
│   └── settings/
└── styles/                    # Global styles
    ├── globals.css
    ├── components.css
    └── utilities.css
```

### Shared Types Location
- **Global types:** `src/lib/types/`
- **Feature types:** `src/features/{feature}/types/`
- **Component types:** Co-located with components

### Hooks Location
- **Global hooks:** `src/lib/hooks/`
- **Feature hooks:** `src/features/{feature}/hooks/`
- **Component hooks:** Co-located with components

### Tests Location
- **Unit tests:** `__tests__/` folders alongside components
- **Integration tests:** `tests/integration/`
- **E2E tests:** `cypress/e2e/`

---

## 2. 🔌 API Client Contract

### Axios Instance Configuration

```typescript
// src/lib/api/client.ts
interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, any>;
  timestamp: string;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Standardized Error Shape

```typescript
// src/lib/api/types.ts
interface StandardError {
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  message: string;
  status: number;
  details?: {
    field?: string;
    value?: any;
    constraint?: string;
  };
  timestamp: string;
  requestId?: string;
}
```

### Interceptor Chain

1. **Request Interceptor:**
   - Add JWT token
   - Add organization context
   - Add request ID
   - Log request (dev only)

2. **Response Interceptor:**
   - Handle 401 (redirect to login)
   - Handle 403 (show permission error)
   - Handle 429 (rate limit retry)
   - Standardize error format
   - Log response (dev only)

3. **Retry Logic:**
   - Exponential backoff
   - Max 3 retries
   - Skip retry for 4xx errors

---

## 3. 🗃️ State Strategy

### Primary Pattern: Zustand + React Query Hybrid

**Zustand for:**
- Authentication state
- UI state (modals, sidebar, theme)
- User preferences
- Global notifications

**React Query for:**
- Server state caching
- Background refetching
- Optimistic updates
- Pagination state

### State Management Rules

```typescript
// Global state (Zustand)
interface GlobalState {
  auth: AuthState;
  ui: UIState;
  notifications: NotificationState;
}

// Feature state (React Query)
interface FeatureState {
  projects: UseQueryResult<Project[]>;
  resources: UseQueryResult<Resource[]>;
  analytics: UseQueryResult<AnalyticsData>;
}

// Cross-feature data flow
// 1. Server data → React Query cache
// 2. UI state → Zustand store
// 3. User actions → Optimistic updates via React Query
// 4. Global events → Zustand actions
```

### State Flow Architecture

```
User Action → Component → Hook → Store/Query → API → Response → Cache Update → UI Update
```

---

## 4. 🎨 UI Library

### Core Component Inventory (30+ Components)

#### Layout Components
- `AppLayout` - Main application wrapper
- `DashboardLayout` - Dashboard-specific layout
- `AuthLayout` - Authentication pages layout
- `PageHeader` - Standardized page headers
- `Sidebar` - Navigation sidebar
- `Breadcrumbs` - Navigation breadcrumbs

#### Display Components
- `Card` - Content containers
- `Table` - Data tables with sorting/filtering
- `List` - Item lists
- `Grid` - Responsive grid layouts
- `Badge` - Status indicators
- `Avatar` - User avatars
- `Icon` - Icon wrapper component
- `Image` - Optimized image component

#### Form Components
- `Input` - Text inputs
- `Select` - Dropdown selects
- `Checkbox` - Checkboxes
- `Radio` - Radio buttons
- `Switch` - Toggle switches
- `Textarea` - Multi-line text
- `DatePicker` - Date selection
- `FileUpload` - File upload component
- `FormField` - Form field wrapper
- `FormGroup` - Form section wrapper

#### Feedback Components
- `Alert` - Alert messages
- `Toast` - Toast notifications
- `LoadingSpinner` - Loading indicators
- `ProgressBar` - Progress indicators
- `Skeleton` - Loading placeholders
- `EmptyState` - Empty state displays

#### Navigation Components
- `Button` - Action buttons
- `Link` - Navigation links
- `Tabs` - Tab navigation
- `Pagination` - Page navigation
- `Menu` - Dropdown menus
- `Modal` - Modal dialogs
- `Drawer` - Slide-out panels
- `Tooltip` - Hover tooltips

#### Overlay Components
- `Modal` - Modal dialogs
- `Drawer` - Slide-out panels
- `Popover` - Contextual popups
- `Tooltip` - Hover tooltips
- `Dropdown` - Dropdown menus

### Component Prop Contracts

```typescript
// Example: Button component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
```

---

## 5. ♿ A11y Standards

### WCAG 2.2 AA Compliance Checklist

#### Semantic HTML
- Use proper heading hierarchy (h1 → h2 → h3)
- Use semantic elements (`<main>`, `<nav>`, `<section>`, `<article>`)
- Use proper form labels and field associations
- Use list elements for lists (`<ul>`, `<ol>`)

#### ARIA Attributes
- `aria-label` for unlabeled interactive elements
- `aria-describedby` for additional context
- `aria-expanded` for collapsible content
- `aria-selected` for selectable items
- `aria-live` for dynamic content updates
- `aria-hidden` for decorative elements

#### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order throughout the application
- Skip links for main content navigation
- Focus trapping in modals and drawers
- Focus restoration after modal close

#### Color and Contrast
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text
- Color not the only means of conveying information
- High contrast mode support

#### Keyboard Navigation
- All interactive elements keyboard accessible
- Standard keyboard shortcuts (Enter, Space, Escape)
- Arrow key navigation for menus and lists
- Tab navigation for forms

#### Screen Reader Support
- Descriptive alt text for images
- Proper table headers and captions
- Form validation announcements
- Status updates and error messages

### Color Contrast Tokens

```css
/* src/styles/tokens.css */
:root {
  /* Text colors */
  --color-text-primary: #1f2937;    /* 4.5:1 on white */
  --color-text-secondary: #6b7280;  /* 4.5:1 on white */
  --color-text-muted: #9ca3af;      /* 3:1 on white */
  
  /* Background colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-muted: #f3f4f6;
  
  /* Interactive colors */
  --color-primary: #3b82f6;         /* 4.5:1 on white */
  --color-primary-hover: #2563eb;   /* 4.5:1 on white */
  --color-danger: #dc2626;          /* 4.5:1 on white */
  --color-success: #059669;         /* 4.5:1 on white */
  --color-warning: #d97706;         /* 4.5:1 on white */
}
```

---

## 6. ⚡ Performance Plan

### Code Splitting Strategy

#### Route-Based Splitting
```typescript
// Lazy load page components
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('../pages/projects/ProjectsPage'));
const ResourcesPage = lazy(() => import('../pages/resources/ResourcesPage'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
```

#### Feature-Based Splitting
```typescript
// Lazy load feature modules
const AIDashboard = lazy(() => import('../features/ai/AIDashboard'));
const RiskManagement = lazy(() => import('../features/risk/RiskManagement'));
const WorkflowBuilder = lazy(() => import('../features/workflows/WorkflowBuilder'));
```

#### Component-Based Splitting
```typescript
// Lazy load heavy components
const GanttChart = lazy(() => import('../components/charts/GanttChart'));
const ResourceHeatMap = lazy(() => import('../components/resources/ResourceHeatMap'));
const AnalyticsCharts = lazy(() => import('../components/analytics/AnalyticsCharts'));
```

### Bundle Size Targets

- **Main bundle:** < 700 KB (current: 708 KB)
- **Vendor bundle:** < 500 KB
- **Feature bundles:** < 200 KB each
- **Total initial load:** < 1.2 MB

### Optimization Techniques

#### Tree Shaking
- Use ES modules imports
- Avoid default exports for utilities
- Configure webpack for dead code elimination

#### Image Optimization
- WebP format with fallbacks
- Responsive images with srcset
- Lazy loading for below-fold images
- Image compression (target: 80% quality)

#### Caching Strategy
- Service worker for static assets
- HTTP caching headers
- React Query for API response caching
- Local storage for user preferences

#### Lazy Loading
- Route-based code splitting
- Component lazy loading
- Image lazy loading
- Data lazy loading for large lists

---

## 7. 🛡️ Quality Gates

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // React rules
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Accessibility rules
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    
    // Import rules
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
    }],
    'import/no-unused-modules': 'error',
  },
};
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ],
    "*.{css,scss}": [
      "stylelint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### Lighthouse Targets

- **Performance:** ≥ 90
- **Accessibility:** ≥ 95
- **Best Practices:** ≥ 90
- **SEO:** ≥ 90
- **PWA:** ≥ 80

### Testing Strategy

#### Unit Tests
- Component testing with React Testing Library
- Hook testing with @testing-library/react-hooks
- Utility function testing with Jest
- Target: 80% code coverage

#### Integration Tests
- API integration testing
- User flow testing
- Cross-browser testing

#### E2E Tests
- Critical user journeys
- Authentication flows
- Project management workflows
- Target: 95% user journey coverage

---

## 8. 📋 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up new folder structure
- [ ] Configure ESLint and TypeScript
- [ ] Create base UI components (Button, Input, Card)
- [ ] Set up API client with interceptors
- [ ] Implement Zustand stores

### Phase 2: Core Components (Week 3-4)
- [ ] Build layout components
- [ ] Create form components
- [ ] Implement navigation components
- [ ] Add feedback components
- [ ] Set up accessibility testing

### Phase 3: Feature Integration (Week 5-6)
- [ ] Migrate authentication features
- [ ] Update project management pages
- [ ] Integrate resource management
- [ ] Connect analytics dashboard
- [ ] Implement settings pages

### Phase 4: Performance & Polish (Week 7-8)
- [ ] Implement code splitting
- [ ] Optimize bundle size
- [ ] Add lazy loading
- [ ] Performance testing
- [ ] Accessibility audit

### Phase 5: Testing & Deployment (Week 9-10)
- [ ] Unit test coverage
- [ ] Integration testing
- [ ] E2E testing
- [ ] Lighthouse optimization
- [ ] Production deployment

---

## 9. 📊 Success Metrics

### Performance Metrics
- Bundle size reduction: 708 KB → < 700 KB
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

### Quality Metrics
- ESLint errors: 657 → 0
- TypeScript errors: 0
- Test coverage: > 80%
- Lighthouse score: > 90 (all categories)
- WCAG compliance: AA level

### User Experience Metrics
- Page load time improvement: > 30%
- Accessibility score: > 95%
- Mobile responsiveness: 100%
- Cross-browser compatibility: 100%

---

## 10. 🚀 Deliverables

### Documentation
- [ ] Component library documentation
- [ ] API client documentation
- [ ] State management guide
- [ ] Accessibility guidelines
- [ ] Performance optimization guide

### Code Assets
- [ ] 30+ reusable UI components
- [ ] Standardized API client
- [ ] State management stores
- [ ] Utility functions and hooks
- [ ] Type definitions

### Quality Assurance
- [ ] ESLint configuration
- [ ] TypeScript configuration
- [ ] Testing setup
- [ ] Pre-commit hooks
- [ ] CI/CD pipeline

---

**Next Step:** Review and approve this plan before beginning implementation in Step 3.