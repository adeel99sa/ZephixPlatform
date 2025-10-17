# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-12-19

### 🚀 Sprint 1: Frontend Foundation

#### ✨ Added
- **UI Primitives**: Button, Card, Input, PageHeader, EmptyState, ErrorBanner, Skeleton, DataTable
- **Form Controls**: Select, Textarea, Checkbox, Radio, Switch, DatePicker, FormField, FormGroup
- **Overlays**: Modal, Drawer, Tabs, Pagination with focus management and keyboard navigation
- **State Management**: Zustand stores for auth and UI state
- **API Client**: Axios-based client with interceptors and error handling
- **React Query Integration**: Query provider with sensible defaults and retry logic
- **Accessibility**: ARIA roles, labels, focus management, keyboard navigation
- **Testing**: Vitest + React Testing Library setup with component tests

#### 🔄 Changed
- **Projects Page**: Refactored to use DataTable with sorting, filtering, and pagination
- **Templates Page**: Refactored to use DataTable with React Query integration
- **Settings Page**: Refactored to use form primitives with proper labeling and validation
- **Build System**: Enhanced TypeScript strict mode and ESLint configuration
- **CI/CD**: Split lint/tests with `lint:new` and `test:foundation` for new code enforcement

#### 🐛 Fixed
- **TypeScript**: Resolved export issues and component prop types
- **Build**: Fixed Tabs component API compatibility
- **Linting**: Resolved react-refresh export issues
- **Accessibility**: Added proper ARIA attributes and keyboard navigation

#### 📊 Performance
- **Bundle Size**: Main bundle ~497KB (target: <700KB)
- **Code Splitting**: Route-level splitting implemented
- **Tree Shaking**: Optimized imports and exports

#### 🧪 Testing
- **Coverage**: Core UI components and API client tested
- **Accessibility**: Keyboard navigation and ARIA compliance verified
- **Integration**: React Query mutations and cache invalidation tested

#### 🔧 Technical Debt
- **Legacy Code**: Isolated legacy lint/test debt (non-blocking)
- **Type Safety**: Strict TypeScript configuration
- **Code Quality**: ESLint rules for new code paths

### 🎯 Sprint 1 Goals Achieved
- ✅ Zero ESLint errors on new code paths
- ✅ TypeScript strict mode compliance
- ✅ Accessible UI components with keyboard navigation
- ✅ React Query integration with proper error handling
- ✅ DataTable implementation with sorting/filtering
- ✅ Form controls with proper labeling and validation
- ✅ Build and typecheck passing
- ✅ Core component test coverage

### 📋 Next Steps (Sprint 2)
- Performance analysis and bundle optimization
- A11y sweep and Lighthouse audit
- Repo-wide lint cleanup
- Additional page refactors
