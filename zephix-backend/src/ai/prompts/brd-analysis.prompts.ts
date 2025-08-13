export const BRD_ANALYSIS_PROMPTS = {
  analyzeBRD: `
You are an expert business analyst and project manager. Analyze this Business Requirements Document and extract key project elements.

BRD Content: {brdContent}

Extract and structure the following elements:

1. PROJECT OBJECTIVES:
   - Primary business goals
   - Success metrics and KPIs
   - Business value expected

2. SCOPE DEFINITION:
   - What's included in the project
   - What's explicitly excluded
   - Key assumptions being made
   - Dependencies on other projects/systems

3. DELIVERABLES:
   - Major deliverables and sub-deliverables
   - Acceptance criteria for each
   - Priority level (high/medium/low)
   - Quality standards required

4. STAKEHOLDERS:
   - Stakeholder name and role
   - Responsibilities and level of involvement
   - Influence level (high/medium/low)
   - Communication preferences

5. CONSTRAINTS:
   - Timeline constraints and key dates
   - Budget limitations
   - Resource constraints
   - Technology constraints
   - Regulatory/compliance requirements

6. RISKS:
   - Potential risks and issues
   - Impact level (high/medium/low)
   - Probability (high/medium/low)
   - Suggested mitigation strategies

7. SUCCESS CRITERIA:
   - How success will be measured
   - Specific metrics and targets
   - Quality gates and checkpoints

Return as JSON with confidence score (0-1) and any missing elements noted.
`,

  generateProjectPlan: `
Based on this BRD analysis, generate a comprehensive {methodology} project plan.

Analysis: {analysisData}
Methodology: {methodology}

Generate:

1. PROJECT STRUCTURE:
   For Waterfall methodology:
   - Sequential phases with clear gates
   - Detailed task breakdown structure
   - Dependencies and critical path
   - Milestones and deliverables
   
   For Agile methodology:
   - Epics from major requirements
   - User stories with acceptance criteria
   - Sprint structure and backlog
   - Definition of done criteria
   
   For Hybrid methodology:
   - High-level waterfall phases
   - Agile sprints within phases
   - Hybrid gates and checkpoints
   - Flexible execution approach

2. TASK BREAKDOWN:
   - Specific, actionable tasks
   - Realistic effort estimates (hours)
   - Required skills and roles
   - Task dependencies and sequencing

3. RESOURCE PLANNING:
   - Required roles and skills
   - Time commitment and duration
   - Team structure recommendations
   - External resource needs

4. TIMELINE:
   - Realistic project duration
   - Buffer time for risks
   - Critical path identification
   - Key milestone dates

5. RISK REGISTER:
   - Project-specific risks
   - Impact and probability scores
   - Mitigation and contingency plans
   - Risk owners and review dates

Return structured JSON with confidence score and alternative approaches considered.
`,

  validateBRD: `
You are a BRD quality assurance expert. Review this Business Requirements Document for completeness, clarity, and feasibility.

BRD Content: {brdContent}

Evaluate the following aspects:

1. COMPLETENESS CHECK:
   - Are all business objectives clearly stated?
   - Are success criteria measurable and specific?
   - Are all stakeholders identified with roles?
   - Are constraints and assumptions documented?
   - Are risks identified with mitigation strategies?

2. CLARITY ASSESSMENT:
   - Are requirements written in clear, unambiguous language?
   - Are technical terms defined for non-technical stakeholders?
   - Are acceptance criteria specific and testable?
   - Are dependencies clearly identified?

3. FEASIBILITY ANALYSIS:
   - Are timeline estimates realistic given scope?
   - Are resource requirements achievable?
   - Are technical requirements within current capabilities?
   - Are budget estimates reasonable?

4. CONSISTENCY VERIFICATION:
   - Do all sections align with project objectives?
   - Are there conflicting requirements?
   - Do stakeholder expectations align?
   - Are assumptions consistent throughout?

5. IMPLEMENTATION READINESS:
   - Can development team proceed with current information?
   - Are there missing technical specifications?
   - Are integration points clearly defined?
   - Are regulatory requirements addressed?

Return JSON with:
- Overall quality score (0-1)
- Critical gaps identified
- Recommendations for improvement
- Readiness assessment (ready/needs-work/not-ready)
`,

  extractRequirements: `
You are a requirements engineering specialist. Extract and categorize requirements from this BRD content.

BRD Content: {brdContent}

Categorize requirements into:

1. FUNCTIONAL REQUIREMENTS:
   - What the system must do
   - User interactions and workflows
   - Business processes to be supported
   - Data processing requirements

2. NON-FUNCTIONAL REQUIREMENTS:
   - Performance requirements (response time, throughput)
   - Security requirements (authentication, authorization, data protection)
   - Usability requirements (user experience, accessibility)
   - Reliability requirements (uptime, error handling)
   - Scalability requirements (user growth, data volume)

3. TECHNICAL REQUIREMENTS:
   - Technology stack preferences
   - Integration requirements
   - Data storage and retrieval needs
   - Deployment and hosting requirements

4. BUSINESS RULES:
   - Decision logic and calculations
   - Validation rules and constraints
   - Workflow rules and approvals
   - Compliance and regulatory requirements

5. INTERFACE REQUIREMENTS:
   - User interface specifications
   - API requirements
   - External system integrations
   - Reporting and analytics needs

Return JSON with:
- Categorized requirements
- Priority levels (critical/high/medium/low)
- Dependencies between requirements
- Acceptance criteria for each
- Confidence in requirement clarity (0-1)
`,

  estimateEffort: `
Based on the BRD analysis and requirements, provide realistic effort estimates for project delivery.

Analysis: {analysisData}
Requirements: {requirementsData}
Team Size: {teamSize}
Experience Level: {experienceLevel}

Provide estimates for:

1. DEVELOPMENT EFFORT:
   - Frontend development (hours)
   - Backend development (hours)
   - Database design and implementation (hours)
   - API development and integration (hours)
   - Testing and quality assurance (hours)

2. PROJECT MANAGEMENT:
   - Planning and coordination (hours)
   - Stakeholder communication (hours)
   - Risk management and mitigation (hours)
   - Progress tracking and reporting (hours)

3. INFRASTRUCTURE:
   - Environment setup (hours)
   - Deployment configuration (hours)
   - Security implementation (hours)
   - Performance optimization (hours)

4. DOCUMENTATION:
   - Technical documentation (hours)
   - User documentation (hours)
   - Training materials (hours)
   - Knowledge transfer (hours)

5. CONTINGENCY:
   - Buffer for unknowns (percentage)
   - Risk mitigation time (hours)
   - Integration complexity factor
   - Learning curve adjustment

Return JSON with:
- Detailed effort breakdown
- Confidence intervals for estimates
- Risk factors affecting estimates
- Recommendations for reducing effort
- Total project duration estimate
`,

  generateStakeholderMatrix: `
Based on the BRD analysis, create a comprehensive stakeholder management matrix.

Analysis: {analysisData}
Stakeholder Data: {stakeholderData}

Generate:

1. STAKEHOLDER CATEGORIZATION:
   - Power/Interest Grid placement
   - Influence level assessment
   - Engagement strategy recommendations
   - Communication frequency and method

2. STAKEHOLDER ENGAGEMENT PLAN:
   - Communication plan for each stakeholder
   - Meeting schedules and formats
   - Escalation procedures
   - Feedback collection methods

3. STAKEHOLDER RISK ASSESSMENT:
   - Potential resistance points
   - Support level assessment
   - Risk mitigation strategies
   - Relationship building activities

Return JSON with:
- Stakeholder matrix with power/interest placement
- Engagement strategies for each stakeholder
- Communication plan details
- Risk assessment and mitigation
`,

  analyzeDependencies: `
Analyze the BRD content and identify all project dependencies and their criticality.

BRD Content: {brdContent}
Project Context: {projectContext}

Identify:

1. INTERNAL DEPENDENCIES:
   - Task-to-task dependencies
   - Resource dependencies
   - Knowledge transfer dependencies
   - Approval dependencies

2. EXTERNAL DEPENDENCIES:
   - Vendor deliverables
   - Third-party integrations
   - Regulatory approvals
   - Infrastructure readiness

3. CRITICAL PATH ANALYSIS:
   - Dependencies affecting timeline
   - Float/slack time available
   - Critical path identification
   - Risk impact on critical path

4. DEPENDENCY MANAGEMENT:
   - Monitoring strategies
   - Escalation procedures
   - Contingency planning
   - Communication requirements

Return JSON with:
- Complete dependency map
- Critical path analysis
- Risk assessment for each dependency
- Management recommendations
`,

  generateQualityPlan: `
Based on the BRD requirements, create a comprehensive quality management plan.

BRD Content: {brdContent}
Quality Standards: {qualityStandards}

Develop:

1. QUALITY OBJECTIVES:
   - Quality metrics and targets
   - Acceptance criteria
   - Quality gates and checkpoints
   - Performance benchmarks

2. QUALITY ASSURANCE ACTIVITIES:
   - Review and inspection processes
   - Testing strategies and approaches
   - Documentation standards
   - Training requirements

3. QUALITY CONTROL MEASURES:
   - Monitoring and measurement
   - Defect management process
   - Corrective action procedures
   - Continuous improvement

4. QUALITY TOOLS AND TECHNIQUES:
   - Testing tools and frameworks
   - Code review processes
   - Automated quality checks
   - Performance monitoring

Return JSON with:
- Quality objectives and metrics
- Assurance and control activities
- Tools and techniques
- Implementation timeline
`,
};
