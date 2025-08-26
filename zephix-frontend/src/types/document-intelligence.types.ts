// Frontend Types for Document Intelligence Feature
// Based on backend interfaces with React-specific adaptations

export interface ProjectDocument {
  id?: string;
  type: 'PROJECT_CHARTER' | 'REQUIREMENTS' | 'TECHNICAL_SPEC' | 'MEETING_NOTES' | 'OTHER';
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

// PM Document Analysis Types
export interface PMDocumentAnalysis {
  peopleAnalysis: {
    stakeholderMap: StakeholderProfile[];
    teamRequirements: TeamSkill[];
    leadershipNeeds: LeadershipRequirement[];
    communicationStrategy: CommunicationPlan[];
    organizationalFactors: OrgFactor[];
  };
  
  processAnalysis: {
    projectOverview: ProjectSummary;
    integrationPoints: IntegrationNeed[];
    scopeDefinition: ScopeElement[];
    deliverables: Deliverable[];
    workBreakdown: WBSRecommendation;
    activities: Activity[];
    dependencies: Dependency[];
    timelineEstimate: TimelineAnalysis;
    criticalFactors: CriticalElement[];
    budgetAnalysis: BudgetBreakdown;
    resourceCosts: ResourceCost[];
    financialRisks: FinancialRisk[];
    qualityRequirements: QualityStandard[];
    qualityMetrics: QualityMeasure[];
    identifiedRisks: RiskItem[];
    riskAssessment: RiskAnalysis[];
    mitigationPlans: MitigationStrategy[];
    resourceNeeds: ResourceRequirement[];
    skillGaps: SkillGap[];
    communicationPlan: CommunicationStrategy;
    reportingNeeds: ReportingRequirement[];
    vendorNeeds: VendorRequirement[];
    contractStrategy: ContractApproach[];
  };
  
  businessAnalysis: {
    businessValue: ValueProposition[];
    complianceNeeds: ComplianceRequirement[];
    organizationalImpact: OrgImpact[];
    changeManagement: ChangeStrategy[];
    environmentalFactors: EnvironmentalFactor[];
  };
  
  methodologyAnalysis: {
    recommendedApproach: 'PLAN_DRIVEN' | 'AGILE' | 'HYBRID';
    reasoning: string[];
    lifecyclePhases: LifecyclePhase[];
    adaptiveElements: AdaptiveElement[];
  };
}

// Supporting Types
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
  leadershipType: 'project_manager' | 'technical_lead' | 'business_analyst' | 'stakeholder_manager';
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
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag: number;
  critical: boolean;
}

export interface TimelineAnalysis {
  estimatedDuration: number;
  criticalPath: string[];
  milestones: Milestone[];
  riskFactors: string[];
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  deliverables: string[];
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
  category: 'technical' | 'schedule' | 'cost' | 'quality' | 'resource' | 'external';
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

// API Request/Response Types
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
  file: File;
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

// Component State Types
export interface DocumentIntelligenceState {
  document: File | null;
  analysis: PMDocumentAnalysis | null;
  processing: boolean;
  error: string | null;
  activeTab: 'people' | 'process' | 'business' | 'methodology';
}

export interface DocumentIntelligenceProps {
  onAnalysisComplete?: (analysis: PMDocumentAnalysis) => void;
  onError?: (error: string) => void;
}

// Chart and Visualization Types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

export interface RiskMatrixData {
  risks: {
    id: string;
    name: string;
    probability: number;
    impact: number;
    category: string;
  }[];
}

export interface TimelineData {
  activities: {
    id: string;
    name: string;
    start: Date;
    end: Date;
    dependencies: string[];
    critical: boolean;
  }[];
}

// Form Types
export interface OrganizationContextForm {
  industry: string;
  projectComplexity: 'low' | 'medium' | 'high';
  organizationalMaturity: 'beginner' | 'intermediate' | 'advanced';
  preferredMethodology: 'agile' | 'waterfall' | 'hybrid' | 'lean';
  teamSize?: number;
  budgetConstraints?: string[];
  timelineConstraints?: string[];
}

// Filter and Search Types
export interface AnalysisFilter {
  dimension: 'people' | 'process' | 'business' | 'all';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'all';
  category: string | 'all';
}

export interface SearchCriteria {
  keyword: string;
  filter: AnalysisFilter;
  sortBy: 'priority' | 'category' | 'name' | 'date';
  sortOrder: 'asc' | 'desc';
}
