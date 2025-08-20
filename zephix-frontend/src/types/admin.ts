export interface AdminDashboardData {
  systemHealth: SystemHealthData;
  userStats: UserStatistics;
  governance: GovernanceMetrics;
  usage: UsageMetrics;
}

export interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'error';
  services: Record<string, string>;
  lastChecked: string;
}

export interface UserStatistics {
  active: number;
  total: number;
  licensed: number;
  growth: string;
  newThisWeek: number;
}

export interface GovernanceMetrics {
  projectsWithApprovalGates: number;
  totalProjects: number;
  pendingApprovals: number;
  complianceScore: number;
}

export interface UsageMetrics {
  users: UserActivity[];
  storage: StorageUsage;
  apiCalls: ApiUsage[];
  aiCredits: CreditUsage;
}

export interface UserActivity {
  date: string;
  activeUsers: number;
}

export interface StorageUsage {
  used: number;
  limit: number;
  unit: string;
}

export interface ApiUsage {
  date: string;
  calls: number;
}

export interface CreditUsage {
  used: number;
  limit: number;
  unit: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string | null;
  organizationId: string;
  avatar: string;
}

export interface SecuritySettings {
  require2FA: boolean;
  enableSSO: boolean;
  ssoProvider: string;
  sessionTimeout: number;
  passwordPolicy: string;
  auditLogging: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  lastModified: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export interface UserFilterParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface InviteUserRequest {
  email: string;
  role: string;
  organizationId: string;
}

export type UserRole = 'Admin' | 'Member' | 'Viewer';

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Dashboard Overview
export interface AdminOverview {
  uptimePct: number;
  lastUpdated: string;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  users: {
    active: number;
    licensed: number;
    viewers: number;
    growthRate: number;
    lastSync: string;
  };
  security: {
    sso: boolean;
    mfaRequired: boolean;
    activeSessions: number;
    failedLoginAttempts: number;
    lastSecurityScan: string;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  governance: {
    pending: number;
    breaches: number;
    avgApprovalTime: number;
    complianceScore: number;
    lastAudit: string;
  };
  usage: {
    aiUsed: number;
    aiTotal: number;
    api24h: number;
    storageUsed: number;
    storageTotal: number;
    bandwidth24h: number;
  };
}

// Security Policies
export interface SecurityPolicies {
  id: string;
  version: string;
  lastModified: string;
  modifiedBy: string;
  mfaRequired: boolean;
  passwordMinLength: number;
  passwordComplexity: {
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventCommonPasswords: boolean;
  };
  sessionTimeoutMin: number;
  maxConcurrentSessions: number;
  ipAllowlist: string[];
  ipBlocklist: string[];
  sso: {
    enabled: boolean;
    provider: 'okta' | 'azure' | 'google' | 'custom';
    config: Record<string, unknown>;
    lastSync: string;
    userCount: number;
  };
  auditLogging: {
    enabled: boolean;
    retentionDays: number;
    logLevel: 'basic' | 'detailed' | 'verbose';
  };
  auditTrail: AuditEntry[];
}

// Active Sessions
export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  userId?: string;
}

// Audit Events
export interface AuditEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  resource: string;
  before: Record<string, any>;
  after: Record<string, any>;
}

// Governance Approvals
export interface GovernanceApproval {
  id: string;
  title: string;
  type: 'budget_change' | 'security_review' | 'compliance_check' | 'architecture_review' | 'vendor_selection';
  projectId: string;
  projectName: string;
  gate: string;
  due: string;
  slaHours: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  amount?: number;
  currency?: string;
  requestor: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
  };
  owner: string;
  approvers: ApprovalStep[];
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'request_changes';
  justification: string;
  attachments: Attachment[];
  riskAssessment: RiskAssessment;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStep {
  role: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  assignedAt: string;
  slaDeadline: string;
  approvedAt?: string;
  rejectedAt?: string;
  comment?: string;
  delegatedTo?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  mitigations: string[];
  impact: string;
  probability: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
  comment?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Governance Rules
export interface GovernanceRule {
  id: string;
  name: string;
  scope: string;
  enabled: boolean;
}

// Enhanced Template
export interface Template {
  id: string;
  name: string;
  version: string;
  phases: string[];
  gates: string[];
  docs: string[];
}

// Enhanced Usage Metrics
export interface UsageMetrics {
  activeUsers: [string, number][];
  apiCalls: [string, number][];
  aiCredits: {
    used: number;
    total: number;
  };
}

// Error Response
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  traceId: string;
}

export interface ApiClient {
  // Dashboard
  getDashboard(): Promise<AdminDashboardData>;
  getOverview(): Promise<AdminOverview>;
  
  // User Management  
  getUsers(params?: UserFilterParams): Promise<UserListResponse>;
  inviteUser(data: InviteUserRequest): Promise<User>;
  updateUserRole(userId: string, role: UserRole): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Security
  getSecuritySettings(): Promise<SecuritySettings>;
  updateSecuritySettings(settings: SecuritySettings): Promise<void>;
  getSecurityPolicies(): Promise<SecurityPolicies>;
  updateSecurityPolicies(policies: Partial<SecurityPolicies>): Promise<void>;
  getActiveSessions(): Promise<ActiveSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  getAuditEvents(filters?: AuditFilters): Promise<AuditEvent[]>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  createTemplate(data: CreateTemplateRequest): Promise<Template>;
  cloneTemplate(templateId: string): Promise<Template>;
  publishTemplate(templateId: string): Promise<Template>;
  
  // Governance
  getGovernanceApprovals(status?: string): Promise<GovernanceApproval[]>;
  makeApprovalDecision(approvalId: string, decision: 'approve' | 'reject', comment: string): Promise<void>;
  getGovernanceRules(): Promise<GovernanceRule[]>;
  
  // Usage & Analytics
  getUsageMetrics(timeRange: string): Promise<UsageMetrics>;
  getAuditLogs(filters?: AuditFilters): Promise<AuditLog[]>;
  exportAuditData(filters?: AuditFilters, format: 'csv' | 'json'): Promise<Blob>;
}
