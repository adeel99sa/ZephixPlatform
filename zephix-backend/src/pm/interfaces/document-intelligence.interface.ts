// Document Intelligence Interfaces for Zephix PM Platform
// Based on PMI Standards, Industry Best Practices, and Professional PM Experience

export interface ProjectDocument {
  id?: string;
  type:
    | 'BRD'
    | 'PROJECT_CHARTER'
    | 'REQUIREMENTS'
    | 'TECHNICAL_SPEC'
    | 'MEETING_NOTES'
    | 'OTHER';
  content: string;
  metadata: {
    source: string;
    uploadDate: Date;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface OrganizationContext {
  industry: string;
  projectComplexity: 'low' | 'medium' | 'high';
  organizationalMaturity: 'beginner' | 'intermediate' | 'advanced';
  preferredMethodology: 'agile' | 'waterfall' | 'hybrid' | 'lean';
  teamSize?: number;
  budgetConstraints?: string[];
  timelineConstraints?: string[];
}

// Enhanced BRD Component Analysis (Industry Standard 7 Components)
export interface BRDAnalysis {
  // Standard BRD Components (Industry Best Practice)
  executiveSummary: {
    businessJustification: string;
    strategicAlignment: string;
    expectedOutcomes: string[];
    sponsorship: string;
  };

  projectObjectives: {
    businessObjectives: string[];
    technicalObjectives: string[];
    successCriteria: string[];
    kpis: KPI[];
  };

  projectScope: {
    inScope: string[];
    outOfScope: string[];
    assumptions: string[];
    boundaries: string[];
  };

  businessRequirements: {
    functionalRequirements: Requirement[];
    nonFunctionalRequirements: Requirement[];
    businessRules: BusinessRule[];
    acceptanceCriteria: AcceptanceCriteria[];
  };

  keyStakeholders: {
    sponsors: Stakeholder[];
    businessUsers: Stakeholder[];
    technicalTeam: Stakeholder[];
    externalParties: Stakeholder[];
  };

  projectConstraints: {
    timeConstraints: TimeConstraint[];
    budgetConstraints: BudgetConstraint[];
    resourceConstraints: ResourceConstraint[];
    technicalConstraints: TechnicalConstraint[];
    regulatoryConstraints: RegulatoryConstraint[];
  };

  costBenefitAnalysis: {
    implementationCosts: Cost[];
    operationalCosts: Cost[];
    benefits: Benefit[];
    roi: ROIAnalysis;
    paybackPeriod: PaybackAnalysis;
  };
}

// Based on Public PMI Standards and Industry Best Practices
export interface PMDocumentAnalysis {
  // PEOPLE MANAGEMENT (Team, Stakeholders, Leadership)
  peopleAnalysis: {
    stakeholderMap: StakeholderProfile[];
    teamRequirements: TeamSkill[];
    leadershipNeeds: LeadershipRequirement[];
    communicationStrategy: CommunicationPlan[];
    organizationalFactors: OrgFactor[];
  };

  // PROJECT PROCESSES (Planning, Execution, Control)
  processAnalysis: {
    // Project Integration
    projectOverview: ProjectSummary;
    integrationPoints: IntegrationNeed[];

    // Scope Management
    scopeDefinition: ScopeElement[];
    deliverables: Deliverable[];
    workBreakdown: WBSRecommendation;

    // Time Management
    activities: Activity[];
    dependencies: Dependency[];
    timelineEstimate: TimelineAnalysis;
    criticalFactors: CriticalElement[];

    // Cost Management
    budgetAnalysis: BudgetBreakdown;
    resourceCosts: ResourceCost[];
    financialRisks: FinancialRisk[];

    // Quality Management
    qualityRequirements: QualityStandard[];
    qualityMetrics: QualityMeasure[];

    // Risk Management
    identifiedRisks: RiskItem[];
    riskAssessment: RiskAnalysis[];
    mitigationPlans: MitigationStrategy[];

    // Resource Management
    resourceNeeds: ResourceRequirement[];
    skillGaps: SkillGap[];

    // Communications
    communicationPlan: CommunicationStrategy;
    reportingNeeds: ReportingRequirement[];

    // Procurement
    vendorNeeds: VendorRequirement[];
    contractStrategy: ContractApproach[];
  };

  // BUSINESS CONTEXT (Value, Compliance, Environment)
  businessAnalysis: {
    businessValue: ValueProposition[];
    complianceNeeds: ComplianceRequirement[];
    organizationalImpact: OrgImpact[];
    changeManagement: ChangeStrategy[];
    environmentalFactors: EnvironmentalFactor[];
  };

  // METHODOLOGY RECOMMENDATIONS
  methodologyAnalysis: {
    recommendedApproach: 'PLAN_DRIVEN' | 'AGILE' | 'HYBRID';
    reasoning: string[];
    lifecyclePhases: LifecyclePhase[];
    adaptiveElements: AdaptiveElement[];
  };
}

// Supporting Interfaces
export interface KPI {
  name: string;
  description: string;
  target: number;
  unit: string;
  measurementFrequency: string;
}

export interface Requirement {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'functional' | 'non-functional' | 'business' | 'technical';
  acceptanceCriteria: string[];
}

export interface BusinessRule {
  id: string;
  rule: string;
  category: 'validation' | 'calculation' | 'authorization' | 'workflow';
  impact: string;
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testable: boolean;
  successCriteria: string[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  communicationNeeds: string[];
}

export interface TimeConstraint {
  id: string;
  description: string;
  deadline: Date;
  flexibility: 'none' | 'low' | 'medium' | 'high';
  impact: string;
}

export interface BudgetConstraint {
  id: string;
  description: string;
  amount: number;
  currency: string;
  flexibility: 'none' | 'low' | 'medium' | 'high';
}

export interface ResourceConstraint {
  id: string;
  description: string;
  resourceType: 'human' | 'technical' | 'financial' | 'physical';
  availability: number;
  impact: string;
}

export interface TechnicalConstraint {
  id: string;
  description: string;
  technology: string;
  impact: string;
  alternatives: string[];
}

export interface RegulatoryConstraint {
  id: string;
  description: string;
  regulation: string;
  complianceLevel: 'required' | 'recommended' | 'optional';
  impact: string;
}

export interface Cost {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category:
    | 'development'
    | 'infrastructure'
    | 'licensing'
    | 'training'
    | 'maintenance';
  timing: string;
}

export interface Benefit {
  id: string;
  description: string;
  value: number;
  currency: string;
  category: 'financial' | 'operational' | 'strategic' | 'compliance';
  timing: string;
}

export interface ROIAnalysis {
  totalInvestment: number;
  totalBenefits: number;
  roi: number;
  paybackPeriod: number;
  netPresentValue: number;
}

export interface PaybackAnalysis {
  paybackPeriod: number;
  breakEvenPoint: Date;
  sensitivityAnalysis: string[];
}

// PM Analysis Supporting Interfaces
export interface StakeholderProfile {
  id: string;
  name: string;
  role: string;
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  communicationPreferences: string[];
  engagementStrategy: string;
}

export interface TeamSkill {
  skillName: string;
  requiredLevel: 'beginner' | 'intermediate' | 'expert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  trainingNeeds: string[];
}

export interface LeadershipRequirement {
  leadershipType:
    | 'project_manager'
    | 'technical_lead'
    | 'business_analyst'
    | 'stakeholder_manager';
  skills: string[];
  experience: string;
  responsibilities: string[];
}

export interface CommunicationPlan {
  stakeholderGroup: string;
  communicationType: string;
  frequency: string;
  channels: string[];
  content: string[];
}

export interface OrgFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  mitigationStrategy?: string;
}

export interface ProjectSummary {
  projectName: string;
  description: string;
  objectives: string[];
  successCriteria: string[];
  keyDeliverables: string[];
}

export interface IntegrationNeed {
  component: string;
  integrationType: string;
  dependencies: string[];
  coordinationNeeds: string[];
}

export interface ScopeElement {
  element: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptanceCriteria: string[];
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  qualityCriteria: string[];
  dependencies: string[];
}

export interface WBSRecommendation {
  level1: string[];
  level2: Record<string, string[]>;
  level3: Record<string, string[]>;
  recommendations: string[];
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  duration: number;
  dependencies: string[];
  resources: string[];
  critical: boolean;
}

export interface Dependency {
  from: string;
  to: string;
  type:
    | 'finish_to_start'
    | 'start_to_start'
    | 'finish_to_finish'
    | 'start_to_finish';
  lag: number;
  critical: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  deliverables: string[];
}

export interface TimelineAnalysis {
  estimatedDuration: number;
  criticalPath: string[];
  milestones: Milestone[];
  riskFactors: string[];
}

export interface CriticalElement {
  element: string;
  impact: string;
  mitigationStrategy: string;
  monitoringApproach: string;
}

export interface BudgetBreakdown {
  totalBudget: number;
  categories: BudgetCategory[];
  contingency: number;
  riskFactors: string[];
}

export interface BudgetCategory {
  category: string;
  amount: number;
  percentage: number;
  description: string;
}

export interface ResourceCost {
  resource: string;
  cost: number;
  duration: number;
  totalCost: number;
}

export interface FinancialRisk {
  risk: string;
  probability: number;
  impact: number;
  mitigationStrategy: string;
}

export interface QualityStandard {
  standard: string;
  description: string;
  measurementMethod: string;
  target: number;
}

export interface QualityMeasure {
  measure: string;
  currentValue: number;
  targetValue: number;
  status: 'on_target' | 'below_target' | 'above_target';
}

export interface RiskItem {
  id: string;
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'technical'
    | 'schedule'
    | 'cost'
    | 'quality'
    | 'resource'
    | 'external';
}

export interface RiskAnalysis {
  riskId: string;
  analysis: string;
  triggers: string[];
  earlyWarningSignals: string[];
}

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  actions: string[];
  responsible: string;
  timeline: string;
}

export interface ResourceRequirement {
  resource: string;
  quantity: number;
  skills: string[];
  availability: string;
  cost: number;
}

export interface SkillGap {
  skill: string;
  requiredLevel: string;
  availableLevel: string;
  gap: string;
  trainingNeeds: string[];
}

export interface CommunicationStrategy {
  approach: string;
  stakeholders: string[];
  channels: string[];
  frequency: string;
  escalation: string;
}

export interface ReportingRequirement {
  report: string;
  audience: string;
  frequency: string;
  content: string[];
  format: string;
}

export interface VendorRequirement {
  vendor: string;
  services: string[];
  selectionCriteria: string[];
  contractType: string;
}

export interface ContractApproach {
  approach: string;
  terms: string[];
  riskAllocation: string;
  performanceMetrics: string[];
}

export interface ValueProposition {
  value: string;
  description: string;
  beneficiaries: string[];
  measurement: string;
}

export interface ComplianceRequirement {
  requirement: string;
  regulation: string;
  impact: string;
  actions: string[];
}

export interface OrgImpact {
  area: string;
  impact: string;
  changeType: string;
  resistance: string;
}

export interface ChangeStrategy {
  strategy: string;
  stakeholders: string[];
  communication: string[];
  training: string[];
  timeline: string;
}

export interface EnvironmentalFactor {
  factor: string;
  impact: string;
  influence: 'positive' | 'negative' | 'neutral';
  mitigation?: string;
}

export interface LifecyclePhase {
  name: string;
  description: string;
  duration: number;
  deliverables: string[];
  activities: string[];
}

export interface AdaptiveElement {
  element: string;
  adaptation: string;
  trigger: string;
  impact: string;
}

// Internal Processing Interfaces
export interface PMFrameworkAnalysis {
  integration: IntegrationAnalysis;
  scope: ScopeAnalysis;
  time: TimeAnalysis;
  cost: CostAnalysis;
  quality: QualityAnalysis;
  resources: ResourceAnalysis;
  communications: CommunicationAnalysis;
  risks: RiskAnalysis;
  procurement: ProcurementAnalysis;
}

export interface IntegrationAnalysis {
  coordinationNeeds: string[];
  changeManagement: string[];
  stakeholderAlignment: string[];
}

export interface ScopeAnalysis {
  wbsRecommendation: string[];
  scopeControl: string[];
  validationApproach: string[];
}

export interface TimeAnalysis {
  activities: string[];
  dependencies: string[];
  criticalPath: string[];
  scheduleRisks: string[];
}

export interface CostAnalysis {
  estimationApproach: string[];
  budgetControl: string[];
  financialRisks: string[];
}

export interface QualityAnalysis {
  requirements: string[];
  assuranceApproach: string[];
  controlMeasures: string[];
}

export interface ResourceAnalysis {
  teamComposition: string[];
  acquisitionStrategy: string[];
  optimizationOpportunities: string[];
}

export interface CommunicationAnalysis {
  planningNeeds: string[];
  engagementStrategy: string[];
  reportingRequirements: string[];
}

export interface RiskAnalysis {
  identification: string[];
  assessment: string[];
  mitigationApproach: string[];
}

export interface ProcurementAnalysis {
  vendorNeeds: string[];
  contractManagement: string[];
  makeBuyDecisions: string[];
}

export interface DimensionAnalysis {
  people: {
    leadership: string[];
    teamBuilding: string[];
    stakeholderEngagement: string[];
    communication: string[];
    conflictResolution: string[];
    changeManagement: string[];
  };
  process: {
    lifecycle: string[];
    planning: string[];
    monitoring: string[];
    riskManagement: string[];
    qualityAssurance: string[];
    changeControl: string[];
  };
  business: {
    valueDelivery: string[];
    organizationalImpact: string[];
    compliance: string[];
    environment: string[];
    strategicAlignment: string[];
    benefitsRealization: string[];
  };
}

export interface MethodologyRecommendation {
  recommendedApproach: 'PLAN_DRIVEN' | 'AGILE' | 'HYBRID';
  reasoning: string[];
  lifecyclePhases: LifecyclePhase[];
  adaptiveElements: AdaptiveElement[];
  implementationGuidance: string[];
}

// API Request/Response Interfaces
export interface DocumentAnalysisRequest {
  document: ProjectDocument;
  organizationContext: OrganizationContext;
}

export interface DocumentAnalysisResponse {
  success: boolean;
  analysis: PMDocumentAnalysis;
  processingTime: number;
  timestamp: Date;
}

export interface DocumentUploadRequest {
  file: Express.Multer.File;
  documentType: ProjectDocument['type'];
  organizationContext: OrganizationContext;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId: string;
  analysis: PMDocumentAnalysis;
  processingTime: number;
  timestamp: Date;
}
