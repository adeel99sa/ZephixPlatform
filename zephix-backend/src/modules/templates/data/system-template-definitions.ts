/**
 * Wave 7: System template definitions — 12 templates, 3 per delivery method.
 *
 * This is the single source of truth for system template content.
 * Used by both the seed script and the test suite.
 * No runtime dependencies — pure data only.
 */

export interface SystemTemplateDef {
  name: string;
  code: string;
  description: string;
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid';
  deliveryMethod: string;
  packCode: string;
  workTypeTags: string[];
  defaultTabs: string[];
  defaultGovernanceFlags: Record<string, boolean>;
  phases: Array<{
    name: string;
    description: string;
    order: number;
    estimatedDurationDays: number;
  }>;
  taskTemplates: Array<{
    name: string;
    description: string;
    estimatedHours: number;
    phaseOrder: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  riskPresets?: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// ── Shared governance flag sets ──────────────────────────────────────

const SCRUM_GOV = {
  iterationsEnabled: true,
  costTrackingEnabled: false,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: false,
  changeManagementEnabled: false,
  waterfallEnabled: false,
};

const KANBAN_GOV = {
  iterationsEnabled: false,
  costTrackingEnabled: false,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: true,
  changeManagementEnabled: false,
  waterfallEnabled: false,
};

const WATERFALL_GOV = {
  iterationsEnabled: false,
  costTrackingEnabled: true,
  baselinesEnabled: true,
  earnedValueEnabled: true,
  capacityEnabled: true,
  changeManagementEnabled: true,
  waterfallEnabled: true,
};

const HYBRID_GOV = {
  iterationsEnabled: true,
  costTrackingEnabled: true,
  baselinesEnabled: false,
  earnedValueEnabled: false,
  capacityEnabled: true,
  changeManagementEnabled: true,
  waterfallEnabled: false,
};

// ── 12 system template definitions ───────────────────────────────────

export const SYSTEM_TEMPLATE_DEFS: SystemTemplateDef[] = [
  // ═══ SCRUM (3) ═══════════════════════════════════════════════════════

  {
    name: 'Scrum Software Delivery',
    code: 'scrum_software_v1',
    description:
      'Sprint-based software delivery with velocity tracking, WIP limits, and iterative planning. Best for development teams working in 1-4 week sprints.',
    methodology: 'agile',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['software', 'product', 'sprint', 'iterative'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks'],
    defaultGovernanceFlags: SCRUM_GOV,
    phases: [
      { name: 'Sprint Planning', description: 'Backlog refinement and sprint goal setting', order: 0, estimatedDurationDays: 1 },
      { name: 'Sprint Execution', description: 'Development, daily standups, and progress tracking', order: 1, estimatedDurationDays: 12 },
      { name: 'Sprint Review & Retro', description: 'Demo, review, and retrospective', order: 2, estimatedDurationDays: 1 },
    ],
    taskTemplates: [
      { name: 'Refine backlog', description: 'Groom and estimate backlog items', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Sprint goal', description: 'Define and agree on sprint goal', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Development work', description: 'Implement sprint items', estimatedHours: 40, phaseOrder: 1, priority: 'high' },
      { name: 'Sprint demo', description: 'Demonstrate completed work to stakeholders', estimatedHours: 2, phaseOrder: 2, priority: 'medium' },
      { name: 'Retrospective', description: 'Review process and identify improvements', estimatedHours: 1, phaseOrder: 2, priority: 'medium' },
    ],
  },
  {
    name: 'Scrum Product Launch',
    code: 'scrum_product_launch_v1',
    description:
      'Sprint-based product launch execution. Ideal for cross-functional teams preparing market releases, beta programs, or go-to-market sprints.',
    methodology: 'agile',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['product', 'launch', 'marketing', 'go-to-market'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: SCRUM_GOV,
    phases: [
      { name: 'Launch Planning', description: 'Define launch scope, channels, and milestones', order: 0, estimatedDurationDays: 5 },
      { name: 'Sprint 1 – Build', description: 'Core deliverables: landing pages, messaging, collateral', order: 1, estimatedDurationDays: 14 },
      { name: 'Sprint 2 – Polish', description: 'QA, final reviews, stakeholder sign-off', order: 2, estimatedDurationDays: 14 },
      { name: 'Launch Execution', description: 'Go-live, monitor, and iterate', order: 3, estimatedDurationDays: 3 },
    ],
    taskTemplates: [
      { name: 'Define launch goals', description: 'Align on success metrics and target audience', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Channel strategy', description: 'Plan distribution channels and timing', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Build core assets', description: 'Create landing pages, emails, and collateral', estimatedHours: 32, phaseOrder: 1, priority: 'high' },
      { name: 'Stakeholder review', description: 'Review and approve launch materials', estimatedHours: 4, phaseOrder: 2, priority: 'medium' },
      { name: 'Go-live checklist', description: 'Execute launch day activities', estimatedHours: 4, phaseOrder: 3, priority: 'critical' },
    ],
  },
  {
    name: 'Scrum Operations Improvement',
    code: 'scrum_ops_improvement_v1',
    description:
      'Sprint-based continuous improvement for operations teams. Ideal for kaizen events, process optimization, and operational efficiency programs.',
    methodology: 'agile',
    deliveryMethod: 'SCRUM',
    packCode: 'scrum_core',
    workTypeTags: ['operations', 'improvement', 'kaizen', 'process'],
    defaultTabs: ['overview', 'tasks', 'board', 'kpis', 'risks'],
    defaultGovernanceFlags: SCRUM_GOV,
    phases: [
      { name: 'Assess Current State', description: 'Map current processes and identify bottlenecks', order: 0, estimatedDurationDays: 5 },
      { name: 'Improvement Sprint 1', description: 'Implement highest-impact improvements', order: 1, estimatedDurationDays: 14 },
      { name: 'Improvement Sprint 2', description: 'Refine and extend improvements', order: 2, estimatedDurationDays: 14 },
      { name: 'Sustain & Measure', description: 'Validate improvements and standardize', order: 3, estimatedDurationDays: 5 },
    ],
    taskTemplates: [
      { name: 'Process mapping', description: 'Document current-state process flows', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Root cause analysis', description: 'Identify root causes of inefficiencies', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Implement quick wins', description: 'Execute highest-impact low-effort changes', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Standard work documentation', description: 'Document new standardized processes', estimatedHours: 8, phaseOrder: 3, priority: 'medium' },
    ],
  },

  // ═══ KANBAN (3) ═══════════════════════════════════════════════════════

  {
    name: 'Kanban Service Desk Intake',
    code: 'kanban_service_desk_v1',
    description:
      'Flow-based service desk and ticket intake management. Best for teams handling continuous inbound requests with SLA targets.',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    packCode: 'kanban_flow',
    workTypeTags: ['service-desk', 'support', 'tickets', 'intake'],
    defaultTabs: ['overview', 'board', 'tasks', 'kpis', 'risks'],
    defaultGovernanceFlags: KANBAN_GOV,
    phases: [
      { name: 'Continuous Intake', description: 'Ongoing ticket triage and processing', order: 0, estimatedDurationDays: 30 },
    ],
    taskTemplates: [
      { name: 'Set WIP limits', description: 'Define work-in-progress limits per service tier', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Define SLA targets', description: 'Set response and resolution time targets', estimatedHours: 2, phaseOrder: 0, priority: 'high' },
      { name: 'Triage process', description: 'Document intake classification and routing rules', estimatedHours: 2, phaseOrder: 0, priority: 'medium' },
    ],
  },
  {
    name: 'Kanban Continuous Improvement',
    code: 'kanban_continuous_improvement_v1',
    description:
      'Flow-based continuous improvement tracking. Ideal for teams running ongoing optimization initiatives without fixed sprints.',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    packCode: 'kanban_flow',
    workTypeTags: ['improvement', 'continuous', 'lean', 'optimization'],
    defaultTabs: ['overview', 'board', 'tasks', 'kpis'],
    defaultGovernanceFlags: KANBAN_GOV,
    phases: [
      { name: 'Continuous Flow', description: 'Ongoing improvement execution with pull-based work', order: 0, estimatedDurationDays: 90 },
    ],
    taskTemplates: [
      { name: 'Set WIP limits', description: 'Define work-in-progress limits per column', estimatedHours: 1, phaseOrder: 0, priority: 'high' },
      { name: 'Define flow policies', description: 'Document pull policies and done criteria', estimatedHours: 2, phaseOrder: 0, priority: 'medium' },
      { name: 'Weekly flow review', description: 'Recurring review of cycle time and bottlenecks', estimatedHours: 1, phaseOrder: 0, priority: 'medium' },
    ],
  },
  {
    name: 'Kanban Risk and Compliance Tracking',
    code: 'kanban_risk_compliance_v1',
    description:
      'Flow-based risk register and compliance action tracking. Best for GRC teams managing ongoing audit findings and risk mitigations.',
    methodology: 'kanban',
    deliveryMethod: 'KANBAN',
    packCode: 'kanban_flow',
    workTypeTags: ['risk', 'compliance', 'audit', 'grc'],
    defaultTabs: ['overview', 'board', 'tasks', 'kpis', 'risks', 'documents'],
    defaultGovernanceFlags: KANBAN_GOV,
    phases: [
      { name: 'Continuous Tracking', description: 'Ongoing risk and compliance action management', order: 0, estimatedDurationDays: 90 },
    ],
    taskTemplates: [
      { name: 'Risk register setup', description: 'Initialize risk categories and severity matrix', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Compliance checklist', description: 'Define compliance requirements and evidence needs', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Audit finding triage', description: 'Classify and route incoming audit findings', estimatedHours: 2, phaseOrder: 0, priority: 'medium' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Regulatory non-compliance', description: 'Failure to meet regulatory requirements', category: 'compliance', severity: 'critical' },
      { id: 'r2', title: 'Data breach exposure', description: 'Sensitive data exposed due to control gap', category: 'security', severity: 'critical' },
      { id: 'r3', title: 'Audit finding escalation', description: 'Open finding not resolved within SLA', category: 'compliance', severity: 'high' },
    ],
  },

  // ═══ WATERFALL (3) ═══════════════════════════════════════════════════

  {
    name: 'Waterfall Infrastructure Migration',
    code: 'waterfall_infra_migration_v1',
    description:
      'Plan-driven infrastructure migration with earned value tracking, formal baselines, and change control.',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['infrastructure', 'migration', 'cloud', 'datacenter'],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: WATERFALL_GOV,
    phases: [
      { name: 'Assessment', description: 'Inventory, dependency mapping, and readiness assessment', order: 0, estimatedDurationDays: 10 },
      { name: 'Planning', description: 'Migration plan, schedule baseline, cost baseline', order: 1, estimatedDurationDays: 15 },
      { name: 'Build & Test', description: 'Target environment build and validation', order: 2, estimatedDurationDays: 20 },
      { name: 'Migration Execution', description: 'Cutover execution with rollback plan', order: 3, estimatedDurationDays: 10 },
      { name: 'Hypercare', description: 'Post-migration support and stabilization', order: 4, estimatedDurationDays: 15 },
    ],
    taskTemplates: [
      { name: 'Inventory assessment', description: 'Document all systems, dependencies, and data flows', estimatedHours: 16, phaseOrder: 0, priority: 'high' },
      { name: 'Risk assessment', description: 'Identify migration risks and mitigation strategies', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Migration plan', description: 'Sequence of migration waves with rollback criteria', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Cost baseline', description: 'Set approved budget baseline for migration', estimatedHours: 8, phaseOrder: 1, priority: 'high' },
      { name: 'Environment build', description: 'Provision and configure target environment', estimatedHours: 40, phaseOrder: 2, priority: 'high' },
      { name: 'Cutover execution', description: 'Execute migration cutover per approved plan', estimatedHours: 16, phaseOrder: 3, priority: 'critical' },
      { name: 'Post-migration validation', description: 'Verify all services operational in target', estimatedHours: 8, phaseOrder: 4, priority: 'high' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Data loss during migration', description: 'Incomplete or corrupted data transfer', category: 'technical', severity: 'critical' },
      { id: 'r2', title: 'Extended downtime', description: 'Cutover exceeds planned maintenance window', category: 'operational', severity: 'high' },
      { id: 'r3', title: 'Rollback failure', description: 'Unable to revert to source in case of issues', category: 'technical', severity: 'critical' },
    ],
  },
  {
    name: 'Waterfall Vendor Implementation',
    code: 'waterfall_vendor_impl_v1',
    description:
      'Plan-driven vendor software implementation with formal scope, baselines, and change control.',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['vendor', 'implementation', 'erp', 'crm', 'saas'],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: WATERFALL_GOV,
    phases: [
      { name: 'Discovery & Scoping', description: 'Requirements gathering, vendor alignment, SOW sign-off', order: 0, estimatedDurationDays: 10 },
      { name: 'Design', description: 'Solution design, configuration specifications, data mapping', order: 1, estimatedDurationDays: 15 },
      { name: 'Build & Configure', description: 'Vendor configuration, customization, data migration', order: 2, estimatedDurationDays: 30 },
      { name: 'Test & Validate', description: 'UAT, integration testing, performance testing', order: 3, estimatedDurationDays: 15 },
      { name: 'Go-Live & Support', description: 'Deployment, training, and early-life support', order: 4, estimatedDurationDays: 10 },
    ],
    taskTemplates: [
      { name: 'Requirements workshop', description: 'Facilitate requirements sessions with stakeholders', estimatedHours: 16, phaseOrder: 0, priority: 'high' },
      { name: 'SOW review', description: 'Review and approve statement of work', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Solution design', description: 'Document target-state solution architecture', estimatedHours: 24, phaseOrder: 1, priority: 'high' },
      { name: 'Data migration plan', description: 'Map source to target data and define ETL approach', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'UAT execution', description: 'Execute user acceptance test cases', estimatedHours: 24, phaseOrder: 3, priority: 'high' },
      { name: 'Training delivery', description: 'Conduct end-user training sessions', estimatedHours: 16, phaseOrder: 4, priority: 'medium' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Vendor delivery delay', description: 'Vendor misses agreed milestones', category: 'vendor', severity: 'high' },
      { id: 'r2', title: 'Scope creep from customization', description: 'Uncontrolled feature requests increase cost', category: 'scope', severity: 'high' },
      { id: 'r3', title: 'Integration failure', description: 'System integration points fail during testing', category: 'technical', severity: 'critical' },
    ],
  },
  {
    name: 'Waterfall Regulatory Program',
    code: 'waterfall_regulatory_v1',
    description:
      'Plan-driven regulatory compliance program with formal documentation, baselines, and audit-ready evidence.',
    methodology: 'waterfall',
    deliveryMethod: 'WATERFALL',
    packCode: 'waterfall_evm',
    workTypeTags: ['regulatory', 'compliance', 'audit', 'governance'],
    defaultTabs: ['overview', 'plan', 'gantt', 'tasks', 'budget', 'change-requests', 'documents', 'kpis', 'risks'],
    defaultGovernanceFlags: WATERFALL_GOV,
    phases: [
      { name: 'Gap Analysis', description: 'Assess current compliance posture against requirements', order: 0, estimatedDurationDays: 10 },
      { name: 'Remediation Planning', description: 'Design controls, policies, and remediation actions', order: 1, estimatedDurationDays: 10 },
      { name: 'Implementation', description: 'Deploy controls, train staff, update processes', order: 2, estimatedDurationDays: 30 },
      { name: 'Testing & Evidence', description: 'Control effectiveness testing and evidence collection', order: 3, estimatedDurationDays: 15 },
      { name: 'Certification / Audit', description: 'External audit support and certification submission', order: 4, estimatedDurationDays: 10 },
    ],
    taskTemplates: [
      { name: 'Regulatory requirements mapping', description: 'Map regulations to internal controls', estimatedHours: 16, phaseOrder: 0, priority: 'high' },
      { name: 'Gap assessment', description: 'Identify control gaps and prioritize remediation', estimatedHours: 12, phaseOrder: 0, priority: 'high' },
      { name: 'Policy drafting', description: 'Draft or update required policies', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Control implementation', description: 'Deploy technical and procedural controls', estimatedHours: 40, phaseOrder: 2, priority: 'high' },
      { name: 'Evidence collection', description: 'Gather and organize audit evidence packages', estimatedHours: 16, phaseOrder: 3, priority: 'high' },
      { name: 'Audit preparation', description: 'Prepare documentation and brief audit team', estimatedHours: 8, phaseOrder: 4, priority: 'critical' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Regulatory deadline miss', description: 'Failure to meet compliance deadline', category: 'compliance', severity: 'critical' },
      { id: 'r2', title: 'Control gap discovered late', description: 'Critical control gap found during audit', category: 'compliance', severity: 'high' },
      { id: 'r3', title: 'Insufficient evidence', description: 'Audit evidence does not meet requirements', category: 'compliance', severity: 'high' },
    ],
  },

  // ═══ HYBRID (3) ═══════════════════════════════════════════════════════

  {
    name: 'Hybrid Program Delivery',
    code: 'hybrid_program_delivery_v1',
    description:
      'Mixed delivery combining agile execution with plan-driven governance. Tracks both flow metrics and financial KPIs.',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    packCode: 'hybrid_core',
    workTypeTags: ['enterprise', 'transformation', 'mixed', 'portfolio'],
    defaultTabs: ['overview', 'plan', 'tasks', 'board', 'budget', 'change-requests', 'kpis', 'risks'],
    defaultGovernanceFlags: HYBRID_GOV,
    phases: [
      { name: 'Discovery', description: 'Requirements and architecture spikes', order: 0, estimatedDurationDays: 5 },
      { name: 'Iterative Delivery', description: 'Sprint-based execution with governance gates', order: 1, estimatedDurationDays: 30 },
      { name: 'Stabilization', description: 'Integration testing and release readiness', order: 2, estimatedDurationDays: 5 },
      { name: 'Transition', description: 'Deployment, training, and handover', order: 3, estimatedDurationDays: 5 },
    ],
    taskTemplates: [
      { name: 'Architecture spike', description: 'Validate technical approach', estimatedHours: 16, phaseOrder: 0, priority: 'high' },
      { name: 'Governance gate review', description: 'Stage-gate approval checkpoint', estimatedHours: 2, phaseOrder: 1, priority: 'high' },
      { name: 'Release readiness', description: 'Verify deployment criteria', estimatedHours: 8, phaseOrder: 2, priority: 'high' },
      { name: 'Knowledge transfer', description: 'Document and train operations team', estimatedHours: 8, phaseOrder: 3, priority: 'medium' },
    ],
  },
  {
    name: 'Hybrid Enterprise Rollout',
    code: 'hybrid_enterprise_rollout_v1',
    description:
      'Large-scale enterprise rollout with agile workstreams and waterfall milestones.',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    packCode: 'hybrid_core',
    workTypeTags: ['enterprise', 'rollout', 'deployment', 'transformation'],
    defaultTabs: ['overview', 'plan', 'tasks', 'board', 'gantt', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: HYBRID_GOV,
    phases: [
      { name: 'Program Setup', description: 'Governance structure, stakeholder alignment, and planning', order: 0, estimatedDurationDays: 10 },
      { name: 'Pilot Wave', description: 'Initial rollout to pilot sites with agile execution', order: 1, estimatedDurationDays: 20 },
      { name: 'Scale Wave', description: 'Expand to remaining sites based on pilot learnings', order: 2, estimatedDurationDays: 30 },
      { name: 'Stabilization', description: 'Resolve issues, optimize, and standardize', order: 3, estimatedDurationDays: 10 },
      { name: 'Handover', description: 'Transfer to BAU operations and close program', order: 4, estimatedDurationDays: 5 },
    ],
    taskTemplates: [
      { name: 'Governance charter', description: 'Define program governance, RACI, and escalation paths', estimatedHours: 8, phaseOrder: 0, priority: 'high' },
      { name: 'Stakeholder mapping', description: 'Identify and engage key stakeholders across sites', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Pilot site selection', description: 'Select and onboard pilot sites', estimatedHours: 4, phaseOrder: 0, priority: 'high' },
      { name: 'Pilot execution', description: 'Execute rollout at pilot sites', estimatedHours: 40, phaseOrder: 1, priority: 'high' },
      { name: 'Pilot retrospective', description: 'Capture lessons learned and adjust plan', estimatedHours: 4, phaseOrder: 1, priority: 'medium' },
      { name: 'Scale execution', description: 'Execute rollout at remaining sites', estimatedHours: 60, phaseOrder: 2, priority: 'high' },
      { name: 'BAU handover', description: 'Document and transfer to operations team', estimatedHours: 8, phaseOrder: 4, priority: 'medium' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Site resistance to change', description: 'Local teams resist adoption', category: 'change-management', severity: 'high' },
      { id: 'r2', title: 'Pilot learnings not applied', description: 'Scale wave repeats pilot mistakes', category: 'process', severity: 'medium' },
      { id: 'r3', title: 'Resource contention', description: 'Shared resources spread too thin across waves', category: 'resource', severity: 'high' },
    ],
  },
  {
    name: 'Hybrid M&A Integration',
    code: 'hybrid_ma_integration_v1',
    description:
      'Merger and acquisition integration program combining structured milestones with agile workstreams.',
    methodology: 'hybrid',
    deliveryMethod: 'HYBRID',
    packCode: 'hybrid_core',
    workTypeTags: ['ma', 'integration', 'merger', 'acquisition'],
    defaultTabs: ['overview', 'plan', 'tasks', 'board', 'budget', 'change-requests', 'documents', 'kpis', 'risks', 'resources'],
    defaultGovernanceFlags: HYBRID_GOV,
    phases: [
      { name: 'Day 1 Readiness', description: 'Legal close requirements, communications, IT access', order: 0, estimatedDurationDays: 15 },
      { name: 'First 100 Days', description: 'Critical integration milestones and quick wins', order: 1, estimatedDurationDays: 100 },
      { name: 'Full Integration', description: 'Systems consolidation, process harmonization, org design', order: 2, estimatedDurationDays: 90 },
      { name: 'Synergy Realization', description: 'Track and validate deal synergy targets', order: 3, estimatedDurationDays: 60 },
    ],
    taskTemplates: [
      { name: 'Day 1 communications', description: 'Prepare internal and external communications', estimatedHours: 16, phaseOrder: 0, priority: 'critical' },
      { name: 'IT access provisioning', description: 'Ensure acquired team has system access', estimatedHours: 8, phaseOrder: 0, priority: 'critical' },
      { name: 'Culture integration plan', description: 'Plan culture alignment activities', estimatedHours: 8, phaseOrder: 1, priority: 'high' },
      { name: 'Systems integration roadmap', description: 'Define system consolidation sequence', estimatedHours: 16, phaseOrder: 1, priority: 'high' },
      { name: 'Process harmonization', description: 'Align key business processes across entities', estimatedHours: 24, phaseOrder: 2, priority: 'high' },
      { name: 'Synergy tracking setup', description: 'Define synergy metrics and tracking cadence', estimatedHours: 8, phaseOrder: 3, priority: 'high' },
    ],
    riskPresets: [
      { id: 'r1', title: 'Key talent attrition', description: 'Critical employees leave during integration', category: 'people', severity: 'critical' },
      { id: 'r2', title: 'Customer churn', description: 'Customers leave due to integration disruption', category: 'business', severity: 'high' },
      { id: 'r3', title: 'Synergy shortfall', description: 'Integration fails to deliver expected synergies', category: 'financial', severity: 'high' },
      { id: 'r4', title: 'Regulatory approval delay', description: 'Post-close regulatory requirements delay integration', category: 'compliance', severity: 'medium' },
    ],
  },
];
