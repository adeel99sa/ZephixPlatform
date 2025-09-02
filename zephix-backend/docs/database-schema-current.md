      table_name       |       column_name        |          data_type          
-----------------------+--------------------------+-----------------------------
 email_verifications   | id                       | uuid
 email_verifications   | email                    | character varying
 email_verifications   | token                    | character varying
 email_verifications   | expires_at               | timestamp without time zone
 email_verifications   | createdAt                | timestamp without time zone
 gate_runs             | id                       | uuid
 gate_runs             | templateGateId           | uuid
 gate_runs             | projectId                | uuid
 gate_runs             | status                   | character varying
 gate_runs             | slaDeadline              | timestamp without time zone
 gate_runs             | approvers                | jsonb
 gate_runs             | evidence                 | jsonb
 gate_runs             | startedAt                | timestamp without time zone
 gate_runs             | completedAt              | timestamp without time zone
 gate_runs             | organizationId           | uuid
 gate_runs             | createdAt                | timestamp without time zone
 gate_runs             | updatedAt                | timestamp without time zone
 governance_audit_logs | id                       | uuid
 governance_audit_logs | action                   | character varying
 governance_audit_logs | entityType               | character varying
 governance_audit_logs | entityId                 | uuid
 governance_audit_logs | userId                   | uuid
 governance_audit_logs | organizationId           | uuid
 governance_audit_logs | metadata                 | jsonb
 governance_audit_logs | ipAddress                | character varying
 governance_audit_logs | userAgent                | text
 governance_audit_logs | createdAt                | timestamp without time zone
 governance_policies   | id                       | uuid
 governance_policies   | name                     | character varying
 governance_policies   | description              | text
 governance_policies   | rules                    | jsonb
 governance_policies   | scope                    | character varying
 governance_policies   | status                   | character varying
 governance_policies   | owner                    | uuid
 governance_policies   | publishedAt              | timestamp without time zone
 governance_policies   | targetCriteria           | jsonb
 governance_policies   | organizationId           | uuid
 governance_policies   | createdAt                | timestamp without time zone
 governance_policies   | updatedAt                | timestamp without time zone
 migrations            | id                       | integer
 migrations            | timestamp                | bigint
 migrations            | name                     | character varying
 organization_settings | id                       | uuid
 organization_settings | organizationId           | uuid
 organization_settings | name                     | character varying
 organization_settings | domain                   | character varying
 organization_settings | timezone                 | character varying
 organization_settings | language                 | character varying
 organization_settings | dateFormat               | character varying
 organization_settings | currency                 | character varying
 organization_settings | branding                 | jsonb
 organization_settings | businessHours            | jsonb
 organization_settings | createdAt                | timestamp without time zone
 organization_settings | updatedAt                | timestamp without time zone
 organizations         | id                       | uuid
 organizations         | name                     | character varying
 organizations         | createdAt                | timestamp without time zone
 organizations         | updatedAt                | timestamp without time zone
 organizations         | slug                     | character varying
 policy_exceptions     | id                       | uuid
 policy_exceptions     | policyId                 | uuid
 policy_exceptions     | projectId                | uuid
 policy_exceptions     | requestedBy              | uuid
 policy_exceptions     | approvedBy               | uuid
 policy_exceptions     | status                   | character varying
 policy_exceptions     | reason                   | text
 policy_exceptions     | approvedReason           | text
 policy_exceptions     | expiresAt                | timestamp without time zone
 policy_exceptions     | organizationId           | uuid
 policy_exceptions     | createdAt                | timestamp without time zone
 policy_exceptions     | updatedAt                | timestamp without time zone
 portfolios            | id                       | uuid
 portfolios            | organization_id          | uuid
 portfolios            | name                     | character varying
 portfolios            | description              | text
 portfolios            | status                   | character varying
 portfolios            | owner_id                 | uuid
 portfolios            | created_at               | timestamp without time zone
 portfolios            | updated_at               | timestamp without time zone
 programs              | id                       | uuid
 programs              | portfolio_id             | uuid
 programs              | name                     | character varying
 programs              | description              | text
 programs              | budget                   | numeric
 programs              | start_date               | date
 programs              | end_date                 | date
 programs              | status                   | character varying
 programs              | created_at               | timestamp without time zone
 programs              | updated_at               | timestamp without time zone
 project_dependencies  | id                       | uuid
 project_dependencies  | fromProjectId            | uuid
 project_dependencies  | toProjectId              | uuid
 project_dependencies  | type                     | character varying
 project_dependencies  | lagDays                  | integer
 project_dependencies  | status                   | character varying
 project_dependencies  | description              | text
 project_dependencies  | organizationId           | uuid
 project_dependencies  | createdAt                | timestamp without time zone
 project_dependencies  | updatedAt                | timestamp without time zone
 projects              | id                       | uuid
 projects              | name                     | character varying
 projects              | description              | text
 projects              | methodology              | character varying
 projects              | stages                   | json
 projects              | status                   | character varying
 projects              | priority                 | character varying
 projects              | start_date               | timestamp without time zone
 projects              | end_date                 | timestamp without time zone
 projects              | estimated_end_date       | timestamp without time zone
 projects              | organization_id          | uuid
 projects              | project_manager_id       | uuid
 projects              | budget                   | numeric
 projects              | actual_cost              | numeric
 projects              | risk_level               | character varying
 projects              | created_by_id            | uuid
 projects              | created_at               | timestamp without time zone
 projects              | updated_at               | timestamp without time zone
 projects              | current_phase            | character varying
 projects              | created_by               | uuid
 projects              | startDate                | date
 projects              | endDate                  | date
 projects              | templateId               | uuid
 projects              | program_id               | uuid
 refresh_tokens        | id                       | uuid
 refresh_tokens        | token                    | character varying
 refresh_tokens        | userId                   | uuid
 refresh_tokens        | expires_at               | timestamp without time zone
 refresh_tokens        | createdAt                | timestamp without time zone
 resource_allocations  | id                       | uuid
 resource_allocations  | resourceId               | uuid
 resource_allocations  | projectId                | uuid
 resource_allocations  | taskId                   | uuid
 resource_allocations  | startDate                | date
 resource_allocations  | endDate                  | date
 resource_allocations  | allocationPercentage     | numeric
 resource_allocations  | hoursPerDay              | integer
 resource_allocations  | createdAt                | timestamp without time zone
 resource_allocations  | work_item_id             | uuid
 resource_allocations  | workItemId               | uuid
 resource_allocations  | organization_id          | uuid
 resource_allocations  | user_id                  | uuid
 resource_allocations  | updated_at               | timestamp without time zone
 resource_conflicts    | id                       | uuid
 resource_conflicts    | resourceId               | uuid
 resource_conflicts    | conflictDate             | date
 resource_conflicts    | totalAllocation          | numeric
 resource_conflicts    | affectedProjects         | jsonb
 resource_conflicts    | severity                 | character varying
 resource_conflicts    | resolved                 | boolean
 resource_conflicts    | detectedAt               | timestamp without time zone
 resource_conflicts    | resolvedAt               | timestamp without time zone
 risk_assessments      | id                       | uuid
 risk_assessments      | projectId                | uuid
 risk_assessments      | assessmentDate           | date
 risk_assessments      | assessmentType           | USER-DEFINED
 risk_assessments      | assessmentTrigger        | text
 risk_assessments      | assessmentScope          | jsonb
 risk_assessments      | assessmentResults        | jsonb
 risk_assessments      | analysisSummary          | jsonb
 risk_assessments      | recommendations          | jsonb
 risk_assessments      | aiAnalysis               | jsonb
 risk_assessments      | stakeholderInput         | jsonb
 risk_assessments      | assessmentQuality        | jsonb
 risk_assessments      | nextAssessmentDate       | date
 risk_assessments      | followUpActions          | jsonb
 risk_assessments      | conductedBy              | uuid
 risk_assessments      | reviewedBy               | uuid
 risk_assessments      | reviewedAt               | timestamp without time zone
 risk_assessments      | status                   | USER-DEFINED
 risk_assessments      | createdAt                | timestamp without time zone
 risk_assessments      | updatedAt                | timestamp without time zone
 risk_monitoring       | id                       | uuid
 risk_monitoring       | riskId                   | uuid
 risk_monitoring       | monitoringDate           | date
 risk_monitoring       | monitoringFrequency      | USER-DEFINED
 risk_monitoring       | kpis                     | jsonb
 risk_monitoring       | monitoringData           | jsonb
 risk_monitoring       | alertLevel               | USER-DEFINED
 risk_monitoring       | alertStatus              | USER-DEFINED
 risk_monitoring       | alertDescription         | text
 risk_monitoring       | alertActions             | jsonb
 risk_monitoring       | updatedProbability       | numeric
 risk_monitoring       | updatedImpact            | numeric
 risk_monitoring       | assessmentChanges        | text
 risk_monitoring       | recommendedActions       | text
 risk_monitoring       | assignedTo               | uuid
 risk_monitoring       | reviewedBy               | uuid
 risk_monitoring       | reviewedAt               | timestamp without time zone
 risk_monitoring       | reviewNotes              | text
 risk_monitoring       | nextMonitoringDate       | date
 risk_monitoring       | escalationRequired       | boolean
 risk_monitoring       | escalationReason         | text
 risk_monitoring       | createdBy                | uuid
 risk_monitoring       | createdAt                | timestamp without time zone
 risk_monitoring       | updatedAt                | timestamp without time zone
 risk_responses        | id                       | uuid
 risk_responses        | riskId                   | uuid
 risk_responses        | strategy                 | USER-DEFINED
 risk_responses        | rationale                | text
 risk_responses        | description              | text
 risk_responses        | actions                  | jsonb
 risk_responses        | contingencyPlan          | jsonb
 risk_responses        | transferDetails          | jsonb
 risk_responses        | monitoring               | jsonb
 risk_responses        | effectiveness            | jsonb
 risk_responses        | status                   | USER-DEFINED
 risk_responses        | approvedDate             | date
 risk_responses        | approvedBy               | uuid
 risk_responses        | implementationDate       | date
 risk_responses        | completedDate            | date
 risk_responses        | responseData             | jsonb
 risk_responses        | createdBy                | uuid
 risk_responses        | lastUpdatedBy            | uuid
 risk_responses        | createdAt                | timestamp without time zone
 risk_responses        | updatedAt                | timestamp without time zone
 risk_signals          | id                       | uuid
 risk_signals          | organizationId           | uuid
 risk_signals          | projectId                | uuid
 risk_signals          | workItemId               | uuid
 risk_signals          | signalType               | character varying
 risk_signals          | severity                 | character varying
 risk_signals          | details                  | jsonb
 risk_signals          | status                   | character varying
 risk_signals          | acknowledgedBy           | uuid
 risk_signals          | acknowledgedAt           | timestamp with time zone
 risk_signals          | resolvedBy               | uuid
 risk_signals          | resolvedAt               | timestamp with time zone
 risk_signals          | createdAt                | timestamp with time zone
 risks                 | id                       | uuid
 risks                 | projectId                | uuid
 risks                 | organizationId           | uuid
 risks                 | title                    | character varying
 risks                 | description              | text
 risks                 | category                 | USER-DEFINED
 risks                 | subcategory              | character varying
 risks                 | probability              | numeric
 risks                 | impact                   | numeric
 risks                 | impactBreakdown          | jsonb
 risks                 | riskScore                | numeric
 risks                 | riskLevel                | USER-DEFINED
 risks                 | status                   | USER-DEFINED
 risks                 | statusNotes              | text
 risks                 | assignedTo               | uuid
 risks                 | expectedOccurrence       | date
 risks                 | closedDate               | date
 risks                 | scheduleImpactDays       | integer
 risks                 | budgetImpactAmount       | numeric
 risks                 | scopeImpactPercent       | numeric
 risks                 | qualityImpactDescription | text
 risks                 | triggers                 | jsonb
 risks                 | dependencies             | jsonb
 risks                 | source                   | USER-DEFINED
 risks                 | confidence               | numeric
 risks                 | probabilityRationale     | text
 risks                 | evidencePoints           | jsonb
 risks                 | riskData                 | jsonb
 risks                 | createdBy                | uuid
 risks                 | lastUpdatedBy            | uuid
 risks                 | lastAssessmentDate       | timestamp without time zone
 risks                 | createdAt                | timestamp without time zone
 risks                 | updatedAt                | timestamp without time zone
 roles                 | id                       | uuid
 roles                 | name                     | character varying
 roles                 | description              | character varying
 roles                 | permissions              | json
 roles                 | createdAt                | timestamp without time zone
 roles                 | updatedAt                | timestamp without time zone
 security_settings     | id                       | uuid
 security_settings     | organizationId           | uuid
 security_settings     | twoFactorEnabled         | boolean
 security_settings     | sessionTimeout           | integer
 security_settings     | passwordPolicy           | jsonb
 security_settings     | ipWhitelist              | ARRAY
 security_settings     | maxFailedAttempts        | integer
 security_settings     | lockoutDuration          | integer
 security_settings     | createdAt                | timestamp without time zone
 security_settings     | updatedAt                | timestamp without time zone
 templates             | id                       | uuid
 templates             | name                     | character varying
 templates             | methodology              | character varying
 templates             | structure                | jsonb
 templates             | metrics                  | jsonb
 templates             | isActive                 | boolean
 templates             | isSystem                 | boolean
 templates             | organizationId           | uuid
 templates             | version                  | integer
 templates             | createdAt                | timestamp with time zone
 templates             | updatedAt                | timestamp with time zone
 user_daily_capacity   | organizationId           | uuid
 user_daily_capacity   | userId                   | uuid
 user_daily_capacity   | capacityDate             | date
 user_daily_capacity   | allocatedPercentage      | integer
 user_organizations    | id                       | uuid
 user_organizations    | userId                   | uuid
 user_organizations    | organizationId           | uuid
 user_organizations    | role                     | character varying
 user_organizations    | createdAt                | timestamp without time zone
 user_organizations    | updatedAt                | timestamp without time zone
 user_settings         | id                       | uuid
 user_settings         | userId                   | uuid
 user_settings         | organizationId           | uuid
 user_settings         | preferences              | jsonb
 user_settings         | emailNotifications       | boolean
 user_settings         | pushNotifications        | boolean
 user_settings         | theme                    | character varying
 user_settings         | timezone                 | character varying
 user_settings         | language                 | character varying
 user_settings         | dateFormat               | character varying
 user_settings         | createdAt                | timestamp without time zone
 user_settings         | updatedAt                | timestamp without time zone
 users                 | id                       | uuid
 users                 | email                    | character varying
 users                 | password                 | character varying
 users                 | firstName                | character varying
 users                 | lastName                 | character varying
 users                 | role                     | character varying
 users                 | isActive                 | boolean
 users                 | isEmailVerified          | boolean
 users                 | createdAt                | timestamp without time zone
 users                 | updatedAt                | timestamp without time zone
 users                 | organizationId           | character varying
 users                 | profilePicture           | character varying
 users                 | resetToken               | character varying
 users                 | resetTokenExpiry         | timestamp with time zone
 users                 | verificationToken        | character varying
 users                 | emailVerified            | boolean
 users                 | lastLogin                | timestamp with time zone
 users                 | lastLoginAt              | timestamp without time zone
 waitlist              | id                       | uuid
 waitlist              | name                     | character varying
 waitlist              | email                    | character varying
 waitlist              | biggestChallenge         | text
 waitlist              | emailVerified            | boolean
 waitlist              | company                  | character varying
 waitlist              | source                   | character varying
 waitlist              | status                   | character varying
 waitlist              | invitedAt                | timestamp without time zone
 waitlist              | createdAt                | timestamp without time zone
 waitlist              | updatedAt                | timestamp without time zone
 work_items            | id                       | uuid
 work_items            | projectId                | uuid
 work_items            | type                     | character varying
 work_items            | title                    | character varying
 work_items            | description              | text
 work_items            | status                   | character varying
 work_items            | phaseOrSprint            | character varying
 work_items            | assignedTo               | uuid
 work_items            | plannedStart             | date
 work_items            | plannedEnd               | date
 work_items            | actualStart              | date
 work_items            | actualEnd                | date
 work_items            | effortPoints             | integer
 work_items            | priority                 | character varying
 work_items            | createdAt                | timestamp with time zone
 work_items            | updatedAt                | timestamp with time zone
(355 rows)

