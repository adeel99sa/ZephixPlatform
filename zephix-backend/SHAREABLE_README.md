# Zephix - AI-Powered Project Status Reporting System

A comprehensive, enterprise-grade project management platform that automates status reporting, risk analysis, and stakeholder communication using AI.

## 🚀 Overview

Zephix transforms how project managers create and distribute status reports by leveraging AI to automatically generate insights, identify risks, and tailor content for different stakeholder audiences.

## ✨ Key Features

### 🤖 AI-Powered Status Reporting
- **Automated Report Generation** - Create comprehensive status reports in minutes, not hours
- **Multi-Stakeholder Content** - Tailored reports for executives, sponsors, teams, and clients
- **Predictive Analytics** - AI-driven insights about project trajectory and risks
- **Natural Language Processing** - Intelligent analysis of project data and updates

### 📊 Project Health Monitoring
- **Real-time Health Scoring** - Automated calculation of project health (0-100 scale)
- **Risk Radar** - Continuous monitoring and AI-powered risk assessment
- **Performance Metrics** - Schedule, budget, scope, and quality tracking
- **Trend Analysis** - Historical performance patterns and forecasting

### 🔐 Enterprise Security
- **Multi-tenant Architecture** - Isolated data per organization
- **Role-Based Access Control** - Owner, Admin, PM, and Viewer roles
- **JWT Authentication** - Secure, stateless authentication
- **Data Encryption** - At rest and in transit protection

### 📈 Advanced Analytics
- **Executive Dashboards** - High-level project portfolio views
- **Custom Report Formats** - Executive summary, detailed, dashboard, and presentation
- **Export Capabilities** - Multiple format support (planned: PDF, PPTX, Excel)
- **Stakeholder Communication** - Automated update distribution

## 🏗️ Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **State Management**: Zustand for lightweight state
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 with design system
- **Testing**: Vitest + Cypress for comprehensive coverage
- **Build Tool**: Vite for fast development and builds

### Backend
- **Framework**: NestJS with TypeScript
- **API Style**: RESTful with OpenAPI/Swagger documentation
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Class-validator with custom decorators
- **Testing**: Jest with E2E testing support

### Database
- **Engine**: PostgreSQL with JSONB support
- **ORM**: TypeORM with migrations
- **Multi-tenancy**: Schema-based isolation
- **Indexing**: Optimized for performance and search

### AI Integration
- **Provider**: Anthropic Claude (configurable)
- **Model**: Claude 3 Sonnet 2024-02-29
- **Features**: Risk analysis, predictive insights, content generation
- **Privacy**: Configurable data retention policies

## 🗂️ Core Modules

### Project Management
- **Status Reporting Service** - AI-powered report generation
- **Project Metrics** - Performance tracking and analysis
- **Risk Management** - Automated risk identification and assessment
- **Stakeholder Communication** - Update distribution and tracking

### Business Requirements (BRD)
- **Document Management** - JSON Schema validation with AJV
- **Workflow Engine** - Draft → Review → Approval → Published
- **Full-text Search** - PostgreSQL tsvector with GIN indexing
- **Version Control** - Document history and change tracking

### User Management
- **Organization Management** - Multi-tenant setup
- **User Roles** - Granular permission system
- **Team Collaboration** - Cross-project team management
- **Access Control** - Fine-grained permission management

## 🔌 Integration Capabilities

### Data Sources
- **Manual Updates** - Team member input and updates
- **Project Metrics** - Automated data collection
- **Stakeholder Feedback** - Communication tracking
- **Performance Baselines** - Historical data analysis

### Planned Integrations
- **Jira** - Project and issue synchronization
- **GitHub** - Repository and commit tracking
- **Slack** - Real-time notifications and updates
- **Email** - Automated intake and parsing
- **Financial Systems** - Budget and cost tracking

## 📱 User Experience

### Dashboard Views
- **Project Overview** - High-level project status
- **Status Inbox** - Centralized update management
- **Report Builder** - Interactive report creation
- **Risk Radar** - Visual risk assessment
- **Executive Brief** - Stakeholder-specific summaries

### Responsive Design
- **Mobile-First** - Optimized for all devices
- **Accessibility** - WCAG 2.1 AA compliance
- **Performance** - Fast loading and smooth interactions
- **Internationalization** - Multi-language support ready

## 🧪 Quality Assurance

### Testing Strategy
- **Unit Tests** - Component and service testing
- **Integration Tests** - API endpoint testing
- **E2E Tests** - User workflow validation
- **Performance Tests** - Load and stress testing

### Code Quality
- **ESLint** - Code style enforcement
- **Prettier** - Consistent formatting
- **TypeScript** - Type safety and IntelliSense
- **Git Hooks** - Pre-commit validation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional, for caching)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd zephix-backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Configure your environment variables

# Run database migrations
npm run db:migrate

# Start development server
npm run start:dev
```

### Frontend Setup
```bash
cd zephix-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📚 API Documentation

The API is fully documented with OpenAPI/Swagger and available at `/api/docs` when running the backend.

### Key Endpoints
- `POST /api/pm/status-reporting` - Generate status report
- `GET /api/pm/status-reporting/:id` - Retrieve report
- `GET /api/pm/projects/:id/metrics` - Get project metrics
- `POST /api/brd` - Create business requirements document

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database

# AI Service
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

## 🏭 Deployment

### Production Ready
- **Container Support** - Docker and Docker Compose ready
- **Environment Management** - Separate configs for dev/staging/prod
- **Health Checks** - Built-in monitoring endpoints
- **Logging** - Structured logging with Pino
- **Metrics** - Prometheus metrics endpoint
- **Tracing** - OpenTelemetry integration

### Platform Support
- **Cloud Platforms** - AWS, GCP, Azure ready
- **Container Orchestration** - Kubernetes manifests included
- **CI/CD** - GitHub Actions and GitLab CI templates
- **Monitoring** - Prometheus, Grafana, and Jaeger ready

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details on:
- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check our documentation
- Contact the development team

---

**Built with ❤️ using modern web technologies and AI innovation**
