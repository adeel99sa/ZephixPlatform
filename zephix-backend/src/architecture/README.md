# Architecture Derivation Service

## Overview

The Architecture Derivation Service is an AI-powered system that acts as a principal architect to analyze Business Requirements Documents (BRDs) and generate comprehensive architectural artifacts. This service implements **Prompt 6** from the BRD system specification.

## Features

### 🔍 **BRD Analysis**
- Extracts key business, technical, and operational drivers
- Identifies constraints (technical, business, regulatory, resource)
- Analyzes functional and non-functional requirements
- Evaluates stakeholder requirements and project context

### 🏗️ **Architecture Generation**
- **Option Generation**: Creates 3 distinct architecture options (A, B, C) with trade-offs
- **Decision Support**: Recommends optimal option with detailed rationale
- **C4 Diagrams**: Generates context, container, and component diagrams in PlantUML
- **ADRs**: Creates Architecture Decision Records with proper structure
- **Threat Model**: Performs STRIDE analysis with mitigation strategies
- **Open Questions**: Identifies clarification needs for stakeholders

### 📋 **Output Artifacts**
- **architecture_summary.md**: Complete analysis summary
- **diagrams/**: PlantUML files for C4 diagrams
- **adrs/**: Individual ADR markdown files
- **risks.json**: Threat model and open questions

## API Endpoints

### `POST /api/architecture/derive`
Analyze a BRD and generate architecture artifacts.

**Input:** Complete BRD JSON structure
**Output:** Comprehensive architecture analysis
**Auth:** JWT required

### `GET /api/architecture/:id/bundle`
Retrieve complete architecture bundle with all artifacts.

**Output:** Structured bundle with summary, diagrams, ADRs, and risks
**Auth:** JWT required

### `POST /api/architecture/:id/review`
Submit review feedback for architecture derivation.

**Input:** Review decision (approve/request_changes/reject) with comments
**Output:** Review confirmation
**Auth:** JWT required

### `POST /api/architecture/:id/publish`
Publish approved architecture for project creation.

**Output:** Publication confirmation with artifact URLs
**Auth:** JWT required

## Implementation Details

### Architecture Service (`ArchitectureDerivationService`)

The core service orchestrates the AI-powered analysis through multiple steps:

1. **Driver & Constraint Extraction**
   - Analyzes business objectives and constraints
   - Categorizes by business, technical, operational impact
   - Identifies architectural influence factors

2. **Option Generation**
   - Creates 3 architecturally distinct approaches
   - Evaluates complexity, cost, and risk for each
   - Provides balanced pros/cons analysis

3. **Option Selection**
   - Applies decision criteria based on project context
   - Considers timeline, risk tolerance, and constraints
   - Provides detailed selection rationale

4. **Diagram Generation**
   - Generates C4 Context diagrams (system environment)
   - Creates C4 Container diagrams (service boundaries)
   - Produces C4 Component diagrams (internal structure)
   - Uses standard PlantUML syntax for compatibility

5. **ADR Creation**
   - Documents significant architectural decisions
   - Follows standard ADR format (Context, Decision, Consequences)
   - Links decisions to business requirements

6. **Threat Modeling**
   - Applies STRIDE methodology systematically
   - Maps threats to assets and components
   - Provides practical mitigation strategies

7. **Bundle Generation**
   - Assembles all artifacts into structured package
   - Creates navigation and cross-references
   - Formats for human readability and tool consumption

### Data Flow

```
BRD JSON → AI Analysis → Architecture Options → Selection → Artifacts → Bundle
```

### Integration Points

- **LLM Provider**: Uses `LLMProviderService` for AI analysis
- **Observability**: Integrated with metrics, logging, and tracing
- **Validation**: DTOs with class-validator for input validation
- **Security**: JWT authentication and tenant isolation
- **Error Handling**: Structured error responses with context

## Usage Example

```typescript
// Input BRD structure
const brd = {
  id: "uuid",
  title: "E-commerce Platform",
  overview: { /* project details */ },
  scope: { /* in/out scope, constraints */ },
  stakeholders: { /* roles and responsibilities */ },
  functional_requirements: [ /* prioritized features */ ],
  non_functional_requirements: { /* performance, security, etc */ },
  timeline: { /* milestones and deadlines */ },
  risks: [ /* identified risks and mitigations */ ]
};

// Generate architecture
const result = await architectureService.deriveArchitecture(brd);

// Get complete bundle
const bundle = await architectureService.generateArchitectureBundle(result);
```

## Key Design Principles

### 🎯 **Vendor Neutrality**
- No company-specific technologies or solutions
- Generic patterns and approaches
- Avoids proprietary architectural decisions

### 🔒 **Security First**
- STRIDE threat modeling methodology
- PII and sensitive data protection
- Audit trail for all decisions

### 📏 **Industry Standards**
- C4 model for architecture visualization
- ADR format for decision documentation
- PlantUML for diagram generation

### 🚀 **Scalability**
- Async processing for large BRDs
- Stateless service design
- Observable and measurable performance

## Error Handling

The service implements comprehensive error handling:

- **Input Validation**: DTO validation with detailed error messages
- **LLM Failures**: Graceful degradation with fallback responses
- **JSON Parsing**: Robust handling of malformed AI responses
- **Rate Limiting**: Built-in protection against abuse
- **Circuit Breaking**: Protects against cascading failures

## Metrics & Observability

Integrated observability features:

- **Request Tracing**: OpenTelemetry spans for full request lifecycle
- **Metrics Collection**: Prometheus metrics for performance monitoring
- **Structured Logging**: JSON logs with request IDs and context
- **Error Tracking**: Detailed error categorization and counting

## Testing

Comprehensive test coverage:

- **Unit Tests**: Service logic and error handling
- **Integration Tests**: End-to-end API functionality
- **E2E Tests**: Full request/response cycles
- **Mock Services**: Isolated testing of AI interactions

## Future Enhancements

### Planned Features
- **Template Library**: Reusable architecture patterns
- **Compliance Checking**: Industry-specific validations
- **Cost Estimation**: Resource and operational cost modeling
- **Performance Simulation**: Load and scalability analysis

### Extension Points
- **Custom Evaluators**: Domain-specific analysis plugins
- **Export Formats**: Additional output formats (PDF, Word, etc.)
- **Integration APIs**: Third-party tool connectivity
- **ML Enhancement**: Improved pattern recognition

## Security Considerations

### Data Protection
- No storage of proprietary business information
- Redaction of sensitive data in logs
- Encrypted communication with LLM providers
- Audit trail for all architectural decisions

### Access Control
- JWT-based authentication required
- Tenant isolation for multi-tenancy
- Role-based access to review functions
- API rate limiting and abuse prevention

## Compliance

### Data Retention
- LLM provider configured for no data retention
- Startup validation of privacy settings
- Audit logging of compliance status
- Regular compliance verification

### Standards Adherence
- ISO 42010 architecture description principles
- NIST Cybersecurity Framework alignment
- SOC 2 Type II compliance readiness
- GDPR data protection compliance

---

*This service represents the core AI-powered architecture intelligence capability of the Zephix platform, enabling automated yet thoughtful architectural analysis and decision support.*
