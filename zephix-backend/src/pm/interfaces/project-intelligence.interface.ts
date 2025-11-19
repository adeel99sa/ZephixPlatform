// Core AI Intelligence Engine Interfaces
export interface ProjectIntelligence {
  projectType:
    | 'infrastructure'
    | 'software_development'
    | 'business_process'
    | 'compliance'
    | 'integration'
    | 'analytics'
    | 'custom';
  complexityFactors: {
    stakeholderCount: number;
    technicalComponents: string[];
    regulatoryRequirements: string[];
    timelineConstraints: string[];
    budgetConstraints: string[];
  };
  suggestedMethodology:
    | 'agile'
    | 'waterfall'
    | 'hybrid'
    | 'lean'
    | 'custom_blend';
  identifiedRisks: RiskPattern[];
  mitigationStrategies: string[];
  aiInsights: {
    similarProjectHistory: HistoricalProject[];
    potentialBottlenecks: string[];
    resourceOptimization: string[];
    qualityCheckpoints: string[];
    successPredictors: string[];
  };
}

export interface RiskPattern {
  patternId: string;
  patternName: string;
  probability: number;
  impact: 'high' | 'medium' | 'low';
  mitigationStrategy: string;
  earlyWarningSignals: string[];
}

export interface ProjectContext {
  projectId?: string;
  methodology?: string;
  domain?: string;
  processGroup?: string;
}

export interface OrgContext {
  organizationId: string;
  industry: string;
  size: 'small' | 'medium' | 'large';
  culture: 'agile' | 'traditional' | 'hybrid';
  constraints: string[];
  capabilities: string[];
}

export interface DocumentIntelligence {
  extractedElements: {
    requirements: string[];
    constraints: string[];
    stakeholders: string[];
    timelines: string[];
    budgets: string[];
    risks: string[];
  };
  crossDocumentAnalysis: {
    conflicts: ConflictAnalysis[];
    gaps: GapAnalysis[];
    dependencies: DependencyMap[];
  };
  smartInsights: {
    missingRequirements: string[];
    conflictingConstraints: string[];
    stakeholderConflicts: string[];
    timelineConflicts: string[];
    budgetConflicts: string[];
  };
}

export interface ConflictAnalysis {
  conflictId: string;
  conflictType:
    | 'requirement'
    | 'constraint'
    | 'timeline'
    | 'budget'
    | 'stakeholder';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: string;
  impact: string;
}

export interface GapAnalysis {
  gapId: string;
  gapType: 'requirement' | 'skill' | 'resource' | 'timeline' | 'budget';
  description: string;
  skillName?: string;
  requiredLevel?: string;
  availableLevel?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  trainingRecommendation?: string;
  recommendedAction: string;
}

export interface DependencyMap {
  dependencyId: string;
  source: string;
  target: string;
  type: 'requirement' | 'task' | 'resource' | 'timeline';
  strength: 'weak' | 'medium' | 'strong';
  description: string;
}

export interface AdaptivePlanner {
  workBreakdown: SmartTask[];
  dynamicTemplates: ProjectTemplate[];
  optimizationStrategies: OptimizationStrategy[];
  continuousLearning: LearningInsight[];
}

export interface SmartTask {
  taskId: string;
  name: string;
  description: string;
  phase: string; // phaseId
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: number;
  estimatedDuration: TimeEstimate;
  dependencies: string[];
  requiredSkills: string[];
  assignedResources: string[];
  aiInsights: {
    riskFactors: string[];
    optimizationOpportunities: string[];
    qualityCheckpoints: string[];
    successMetrics: string[];
  };
}

export interface ProjectPhase {
  phaseId: string;
  name: string;
  description: string;
  duration: TimeEstimate;
  deliverables: string[];
  milestones: string[];
  qualityGates: string[];
}

export interface TimeEstimate {
  optimistic: number;
  mostLikely: number;
  pessimistic: number;
  confidence: number;
  factors: string[];
}

export interface ProjectTemplate {
  templateId: string;
  name: string;
  description: string;
  methodology: string;
  phases: ProjectPhase[];
  tasks: SmartTask[];
  qualityStandards: string[];
  successCriteria: string[];
}

export interface OptimizationStrategy {
  strategyId: string;
  name: string;
  description: string;
  type: 'schedule' | 'cost' | 'quality' | 'risk' | 'resource';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface LearningInsight {
  insightId: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'recommendation';
  description: string;
  confidence: number;
  actionableItems: string[];
}

export interface ResourceIntelligence {
  capabilityMatrix: Record<string, TeamCapability>;
  resourceAllocation: ResourceAllocation;
  skillGaps: SkillGap[];
  trainingPlans: TrainingPlan[];
  workloadOptimization: WorkloadOptimization;
}

export interface TeamCapability {
  memberId: string;
  name: string;
  role: string;
  technicalSkills: Skill[];
  softSkills: Skill[];
  experience: number;
  availability: number;
  cost: number;
}

export interface Skill {
  skillId: string;
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'tool';
  level: 'beginner' | 'intermediate' | 'expert';
  yearsOfExperience: number;
}

export interface ResourceAllocation {
  recommendations: string[];
  optimalAssignments: Record<string, string[]>;
  capacityPlanning: CapacityPlan[];
  costOptimization: CostOptimization;
}

export interface CapacityPlan {
  period: string;
  availableHours: number;
  allocatedHours: number;
  utilization: number;
  recommendations: string[];
}

export interface CostOptimization {
  currentCost: number;
  optimizedCost: number;
  savings: number;
  recommendations: string[];
}

export interface SkillGap {
  gapId: string;
  skillName: string;
  requiredLevel: string;
  availableLevel: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  trainingRecommendation: string;
}

export interface TrainingPlan {
  planId: string;
  skillName: string;
  trainingType: 'online' | 'workshop' | 'mentoring' | 'certification';
  duration: number;
  cost: number;
  expectedOutcome: string;
}

export interface WorkloadOptimization {
  currentWorkload: Record<string, number>;
  optimizedWorkload: Record<string, number>;
  recommendations: string[];
  riskFactors: string[];
}

export interface ProjectHealthAI {
  healthScore: {
    overall: number;
    schedule: number;
    budget: number;
    quality: number;
    risk: number;
    stakeholder: number;
    recommendations: string[];
  };
  deliveryForecast: {
    probability: number;
    confidence: number;
    factors: string[];
    timeline: TimeEstimate;
  };
  earlyWarnings: Warning[];
  correctiveActions: CorrectiveAction[];
}

export interface Warning {
  warningId: string;
  type: 'schedule' | 'budget' | 'quality' | 'risk' | 'stakeholder';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: string;
}

export interface CorrectiveAction {
  actionId: string;
  type: 'schedule' | 'budget' | 'quality' | 'risk' | 'stakeholder';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  expectedOutcome: string;
}

export interface CommunicationAI {
  stakeholderUpdates: Record<string, StakeholderUpdate>;
  meetingContent: MeetingContent;
  executiveSummary: ExecutiveSummary;
}

export interface StakeholderUpdate {
  stakeholderId: string;
  role: string;
  update: string;
  priority: 'low' | 'medium' | 'high';
  actions: string[];
}

export interface MeetingContent {
  agenda: string[];
  materials: string[];
  objectives: string[];
  followUpActions: string[];
}

export interface ExecutiveSummary {
  summary: string;
  keyMetrics: Metric[];
  recommendations: string[];
  nextSteps: string[];
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface LearningEngine {
  patternRecognition: Pattern[];
  failureAnalysis: FailureAnalysis[];
  userBehaviorLearning: UserBehavior[];
  industryBestPractices: BestPractice[];
  learningInsights: LearningInsight[];
}

export interface Pattern {
  patternId: string;
  type: 'success' | 'failure' | 'efficiency' | 'risk';
  description: string;
  frequency: number;
  confidence: number;
  actionableInsights: string[];
}

export interface FailureAnalysis {
  failureId: string;
  type: 'schedule' | 'budget' | 'quality' | 'scope' | 'stakeholder';
  description: string;
  rootCauses: string[];
  lessonsLearned: string[];
  preventionStrategies: string[];
}

export interface UserBehavior {
  behaviorId: string;
  type: 'preference' | 'pattern' | 'efficiency' | 'collaboration';
  description: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
}

export interface BestPractice {
  practiceId: string;
  category: 'methodology' | 'communication' | 'risk' | 'quality' | 'resource';
  name: string;
  description: string;
  applicability: string[];
  implementationGuidance: string[];
}

export interface ProjectData {
  projectId: string;
  metrics: Metric[];
  progress: ProjectProgress;
  teamPerformance: TeamPerformance;
  risks: Risk[];
  issues: Issue[];
  historicalData?: {
    similarProjects: HistoricalProject[];
    industryBenchmarks: Benchmark[];
    organizationalHistory: HistoricalProject[];
  };
}

export interface ProjectProgress {
  completionPercentage: number;
  completedTasks: number;
  totalTasks: number;
  milestoneProgress: MilestoneProgress[];
  velocity: number;
}

export interface MilestoneProgress {
  milestoneId: string;
  name: string;
  plannedDate: Date;
  actualDate?: Date;
  status: 'completed' | 'in_progress' | 'delayed' | 'at_risk';
  completionPercentage: number;
}

export interface TeamPerformance {
  teamVelocity: number;
  qualityMetrics: QualityMetric[];
  stakeholderSatisfaction: number;
  riskMitigation: number;
}

export interface QualityMetric {
  metricId: string;
  name: string;
  value: number;
  target: number;
  status: 'on_target' | 'below_target' | 'above_target';
}

export interface Risk {
  riskId: string;
  name: string;
  description: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'identified' | 'mitigated' | 'occurred' | 'closed';
  mitigationStrategy: string;
}

export interface Issue {
  issueId: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo: string;
  resolution: string;
}

export interface HistoricalProject {
  projectId: string;
  type: 'agile' | 'waterfall' | 'hybrid' | 'lean';
  outcome: 'success' | 'failure';
  metrics: {
    schedulePerformance: number;
    costPerformance: number;
    qualityMetrics: QualityMetric[];
    stakeholderSatisfaction: number;
  };
  lessonsLearned: string[];
}

export interface Benchmark {
  benchmarkId: string;
  industry: string;
  metric: string;
  value: number;
  percentile: number;
  source: string;
}

export interface ProjectHistory {
  projectId: string;
  startDate: Date;
  endDate: Date;
  outcome: 'success' | 'failure';
  metrics: Record<string, number>;
  lessonsLearned: string[];
}

export interface Capability {
  capabilityId: string;
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'tool';
  level: 'beginner' | 'intermediate' | 'expert';
  experience: number;
}

export interface Metrics {
  metricId: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'schedule' | 'cost' | 'quality' | 'risk' | 'stakeholder';
}
