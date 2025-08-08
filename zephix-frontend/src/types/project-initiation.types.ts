export interface ProjectCharter {
  projectTitle: string;
  businessCase: string;
  projectObjectives: string[];
  successCriteria: string[];
  scope: {
    included: string[];
    excluded: string[];
  };
  assumptions: string[];
  constraints: string[];
  highLevelTimeline: {
    startDate: string;
    endDate: string;
    majorMilestones: Array<{
      name: string;
      date: string;
      deliverables: string[];
    }>;
  };
  budgetEstimate: {
    range: string;
    confidence: 'low' | 'medium' | 'high';
    breakdown: Array<{
      category: string;
      percentage: number;
    }>;
  };
  projectManager: string;
  sponsor: string;
  approvalCriteria: string[];
}

export interface StakeholderAnalysis {
  stakeholders: Array<{
    name: string;
    role: string;
    organization: string;
    influence: 'low' | 'medium' | 'high';
    interest: 'low' | 'medium' | 'high';
    category: 'champion' | 'supporter' | 'neutral' | 'critic' | 'blocker';
    communicationNeeds: string[];
    engagementStrategy: string;
  }>;
  raciMatrix: Array<{
    activity: string;
    responsible: string[];
    accountable: string;
    consulted: string[];
    informed: string[];
  }>;
  influenceInterestGrid: {
    manageClosely: string[];
    keepSatisfied: string[];
    keepInformed: string[];
    monitor: string[];
  };
}

export interface RiskAssessment {
  risks: Array<{
    category: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
    responseStrategy: 'avoid' | 'transfer' | 'mitigate' | 'accept';
    responseActions: string[];
    owner: string;
    triggerConditions: string[];
  }>;
  riskSummary: {
    totalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
}

export interface WBSStructure {
  level1: Array<{
    name: string;
    description: string;
    level2: Array<{
      name: string;
      description: string;
      deliverables: string[];
      dependencies: string[];
    }>;
  }>;
}

export interface AIRecommendations {
  methodology: 'waterfall' | 'agile' | 'hybrid';
  teamSize: string;
  criticalSuccessFactors: string[];
  governanceStructure: string;
  communicationPlan: string;
}

export interface ProjectInitiationData {
  projectId: string;
  charter: ProjectCharter;
  stakeholders: StakeholderAnalysis;
  risks: RiskAssessment;
  wbsStructure: WBSStructure;
  analysis: any;
  recommendations: AIRecommendations;
}

export interface DocumentAnalysisRequest {
  file: File;
  type: string;
  organizationContext: {
    industry?: string;
    companySize?: string;
    projectComplexity?: 'low' | 'medium' | 'high';
    teamSize?: string;
    budget?: string;
    timeline?: string;
  };
}

export interface ProjectMetrics {
  overallReadiness: number;
  charterCompleteness: number;
  stakeholderAnalysis: number;
  riskAssessment: number;
  wbsCompleteness: number;
  recommendations: number;
}
