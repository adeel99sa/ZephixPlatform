# Dashboard System

A comprehensive, customizable dashboard system for the Zephix application that provides maximum flexibility for organizations to build any dashboard structure they need.

## Features

### 🏗️ Dashboard Builder Interface
- **Admin Dashboard Creation**: Create and manage dashboards with drag-and-drop functionality
- **Custom Naming & Organization**: Flexible naming conventions and organizational structures
- **Dashboard Templates**: Pre-built templates and custom template creation
- **Layout Management**: Grid-based, flexible, and custom layout options

### 📊 Comprehensive Widget Library
- **Project Widgets**: Grid, timeline, cards, lists, and Kanban views
- **Analytics Widgets**: KPIs, charts (line, bar, pie, area), tables, heatmaps
- **AI Widgets**: Insights, predictions, alerts, and recommendations
- **Action Widgets**: Alerts, approvals, tasks, and notifications
- **Custom Widgets**: HTML, embedded content, and iframe support

### 🔍 Flexible Filtering & Classification
- **Custom Categories**: Project categories and criteria
- **Multi-criteria Filtering**: Advanced filtering system
- **AI-powered Classification**: Smart suggestions for categorization
- **Dynamic Rules**: Rule-based categorization system

### 👥 User Management & Permissions
- **Dashboard Assignment**: Assign dashboards to users, roles, teams, or organizations
- **Granular Permissions**: View, edit, delete, share, export, and manage settings
- **Sharing & Collaboration**: Easy sharing with permission controls
- **Usage Analytics**: Track usage patterns and optimize performance

### 🤖 AI Integration
- **Smart Recommendations**: AI-powered widget and dashboard suggestions
- **Automated Alerts**: Intelligent alert generation based on data patterns
- **Usage Pattern Analysis**: Learn from user behavior to suggest improvements
- **Dashboard Optimization**: AI suggestions for better performance and UX

## Architecture

### Entities

#### Dashboard
- Core dashboard information (name, description, slug, type, status)
- Layout configuration (grid, flexible, custom)
- Theme and styling options
- Refresh intervals and view tracking
- Organization and user relationships

#### DashboardWidget
- Widget configuration and properties
- Data source configuration
- Layout positioning and sizing
- Styling and theming options
- Refresh intervals and status tracking

#### DashboardPermission
- User, role, team, and organization-level permissions
- Granular permission controls
- Expiration dates and active status
- Audit trail for permission changes

#### DashboardTemplate
- Pre-built dashboard configurations
- Template categories and types
- Usage tracking and ratings
- Public and private template management

### Database Schema

The system uses PostgreSQL with the following key features:
- **UUIDv7** for all primary keys
- **JSONB** for flexible configuration storage
- **Soft deletes** for data preservation
- **Comprehensive indexing** for performance
- **Foreign key constraints** for data integrity

### API Endpoints

#### Dashboard Management
- `POST /api/dashboards` - Create dashboard
- `GET /api/dashboards` - List dashboards with filtering
- `GET /api/dashboards/:id` - Get dashboard by ID
- `PUT /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard
- `POST /api/dashboards/:id/duplicate` - Duplicate dashboard

#### Widget Management
- `POST /api/dashboards/:id/widgets` - Add widget to dashboard
- `PUT /api/dashboards/widgets/:id` - Update widget
- `DELETE /api/dashboards/widgets/:id` - Delete widget

#### Templates
- `POST /api/dashboards/from-template/:templateId` - Create from template

#### AI Features
- `GET /api/dashboards/ai/recommendations` - Get AI recommendations

#### Sharing & Permissions
- `POST /api/dashboards/:id/share` - Share dashboard
- `GET /api/dashboards/:id/analytics` - Get dashboard analytics

## Security Features

### Authentication & Authorization
- **JWT-based authentication** for all endpoints
- **Organization scoping** for multi-tenant security
- **Role-based access control** (RBAC) implementation
- **Permission validation** at entity and field levels

### Data Protection
- **Tenant isolation** through organization scoping
- **Soft deletes** for data recovery
- **Audit logging** for all changes
- **Input validation** with class-validator

### API Security
- **Rate limiting** behind feature flags
- **Input sanitization** and validation
- **SQL injection protection** through TypeORM
- **XSS protection** through proper output encoding

## Performance Features

### Database Optimization
- **Strategic indexing** on frequently queried fields
- **Query optimization** with TypeORM query builder
- **Connection pooling** for database efficiency
- **Lazy loading** for related entities

### Caching Strategy
- **Widget data caching** for improved performance
- **Dashboard configuration caching**
- **User permission caching**
- **Template caching** for frequently used templates

### Scalability
- **Horizontal scaling** support through stateless design
- **Database sharding** ready architecture
- **Microservice ready** design patterns
- **Queue-based processing** for heavy operations

## Usage Examples

### Creating a Dashboard

```typescript
const dashboardData = {
  name: 'Project Overview Dashboard',
  description: 'Comprehensive view of all active projects',
  type: DashboardType.TEAM,
  layout: DashboardLayout.GRID,
  config: {
    columns: 12,
    rowHeight: 30,
    margin: [10, 10],
    containerPadding: [10, 10]
  },
  tags: ['projects', 'overview', 'team'],
  isPublic: false,
  theme: 'light',
  refreshInterval: 300
};

const dashboard = await dashboardService.createDashboard(dashboardData, userId);
```

### Adding a Widget

```typescript
const widgetData = {
  title: 'Project Status Overview',
  widgetType: WidgetType.PROJECT_GRID,
  size: WidgetSize.LARGE,
  config: {
    showFilters: true,
    maxItems: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  layout: {
    x: 0,
    y: 0,
    width: 6,
    height: 4
  },
  dashboardId: dashboard.id
};

const widget = await dashboardService.createWidget(widgetData, userId);
```

### Setting Permissions

```typescript
const permission = {
  dashboardId: dashboard.id,
  level: PermissionLevel.EDIT,
  scope: PermissionScope.USER,
  userId: targetUserId,
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: true,
    canExport: true,
    canManageUsers: false,
    canManageSettings: false
  },
  grantedById: currentUserId
};

await permissionService.createPermission(permission);
```

## Configuration

### Environment Variables

```bash
# Dashboard System Configuration
DASHBOARD_DEFAULT_REFRESH_INTERVAL=300
DASHBOARD_MAX_WIDGETS_PER_DASHBOARD=50
DASHBOARD_MAX_DASHBOARDS_PER_USER=100
DASHBOARD_AI_ENABLED=true
DASHBOARD_TEMPLATE_CACHE_TTL=3600
```

### Widget Configuration

```typescript
// Example widget configuration
const widgetConfig = {
  dataSource: {
    entity: 'Project',
    filters: { status: 'active' },
    aggregation: 'count',
    groupBy: 'department'
  },
  styling: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: '8px',
    shadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  refreshInterval: 60,
  filters: {
    status: ['active', 'pending'],
    priority: 'high'
  }
};
```

## Testing

### Unit Tests
- **Service layer testing** with mocked repositories
- **DTO validation testing** with class-validator
- **Business logic testing** for all operations
- **Error handling testing** for edge cases

### Integration Tests
- **API endpoint testing** with test database
- **Database operation testing** with real entities
- **Permission system testing** with various scenarios
- **Widget lifecycle testing** from creation to deletion

### E2E Tests
- **Complete dashboard workflow** testing
- **User permission scenarios** testing
- **Template creation and usage** testing
- **AI recommendation flow** testing

## Deployment

### Prerequisites
- PostgreSQL 13+ with UUID extension
- Node.js 18+ with TypeScript support
- Redis for caching (optional)
- Queue system for background jobs (optional)

### Migration
```bash
# Generate migration
npm run migration:generate -- -n CreateDashboardSystem

# Run migration
npm run migration:run

# Revert migration (if needed)
npm run migration:revert
```

### Health Checks
- **Database connectivity** verification
- **Entity creation** testing
- **Permission system** validation
- **Widget rendering** verification

## Monitoring & Observability

### Logging
- **Structured logging** with Pino
- **Request ID tracking** across all operations
- **Performance metrics** for dashboard operations
- **Error tracking** with stack traces

### Metrics
- **Dashboard creation/update rates**
- **Widget performance metrics**
- **User engagement analytics**
- **System performance indicators**

### Tracing
- **OpenTelemetry integration** for distributed tracing
- **Database query tracing** for performance analysis
- **API call tracing** for debugging
- **Widget rendering tracing** for optimization

## Future Enhancements

### Planned Features
- **Real-time collaboration** with WebSocket support
- **Advanced analytics** with machine learning
- **Mobile-responsive** dashboard layouts
- **Offline support** with service workers

### Scalability Improvements
- **Microservice architecture** for widget services
- **GraphQL API** for flexible data fetching
- **Edge computing** support for global deployments
- **Multi-region** database support

## Contributing

### Development Guidelines
- **TypeScript strict mode** enforcement
- **ESLint and Prettier** for code quality
- **Conventional commits** for version control
- **Comprehensive testing** for all changes

### Code Review Process
- **Security review** for all permission changes
- **Performance review** for database operations
- **Accessibility review** for UI components
- **Documentation review** for API changes

## Support

### Documentation
- **API documentation** with Swagger/OpenAPI
- **Component library** documentation
- **Architecture decision records** (ADRs)
- **Troubleshooting guides**

### Community
- **GitHub issues** for bug reports
- **Discussions** for feature requests
- **Contributing guidelines** for developers
- **Code of conduct** for community members

---

This dashboard system provides a robust, scalable, and secure foundation for building customizable dashboards that can adapt to any organization's needs. The comprehensive feature set, combined with strong security and performance characteristics, makes it suitable for enterprise-level deployments.
