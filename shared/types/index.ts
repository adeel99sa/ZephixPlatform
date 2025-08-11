// Template Types
export interface Template {
  id: string;
  name: string;
  description: string;
  industry: Industry;
  category: TemplateCategory;
  fields: TemplateField[];
  version: number;
  isPublic: boolean;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  aiSettings?: AISettings;
}

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  validation?: FieldValidation;
  aiSuggestionEnabled?: boolean;
  options?: string[]; // For select/multiselect fields
  dependsOn?: string; // Field ID that this field depends on
  visibilityCondition?: VisibilityCondition;
}

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  FILE = 'file',
  RICH_TEXT = 'rich_text',
  TABLE = 'table',
  SECTION = 'section'
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
}

export interface VisibilityCondition {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
  value: any;
}

export enum Industry {
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  ECOMMERCE = 'ecommerce',
  EDUCATION = 'education',
  MANUFACTURING = 'manufacturing',
  TECHNOLOGY = 'technology',
  RETAIL = 'retail',
  GOVERNMENT = 'government',
  OTHER = 'other'
}

export enum TemplateCategory {
  PROJECT_INITIATION = 'project_initiation',
  REQUIREMENTS_ANALYSIS = 'requirements_analysis',
  TECHNICAL_SPECIFICATION = 'technical_specification',
  BUSINESS_CASE = 'business_case',
  RISK_ASSESSMENT = 'risk_assessment',
  RESOURCE_PLANNING = 'resource_planning',
  INTEGRATION_PLANNING = 'integration_planning',
  CUSTOM = 'custom'
}

// Document Types
export interface BRDDocument {
  id: string;
  templateId: string;
  title: string;
  status: DocumentStatus;
  data: Record<string, any>;
  version: number;
  organizationId: string;
  createdBy: string;
  assignedTo: string[];
  collaborators: Collaborator[];
  approvals: Approval[];
  comments: Comment[];
  changeHistory: ChangeHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  aiAnalysis?: AIAnalysis;
}

export enum DocumentStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: Permission[];
  addedAt: Date;
  addedBy: string;
}

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  VIEWER = 'viewer',
  APPROVER = 'approver'
}

export enum Permission {
  VIEW = 'view',
  EDIT = 'edit',
  COMMENT = 'comment',
  APPROVE = 'approve',
  DELETE = 'delete',
  SHARE = 'share',
  EXPORT = 'export'
}

// Approval Workflow Types
export interface Approval {
  id: string;
  approverId: string;
  status: ApprovalStatus;
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  level: number;
  required: boolean;
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped'
}

// Collaboration Types
export interface Comment {
  id: string;
  userId: string;
  content: string;
  fieldId?: string; // For field-specific comments
  parentId?: string; // For threaded comments
  createdAt: Date;
  updatedAt?: Date;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  mentions?: string[]; // User IDs
}

export interface ChangeHistoryEntry {
  id: string;
  userId: string;
  action: ChangeAction;
  fieldId?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  comment?: string;
}

export enum ChangeAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMMENTED = 'commented',
  SHARED = 'shared',
  EXPORTED = 'exported'
}

// AI Features Types
export interface AISettings {
  enableFieldSuggestions: boolean;
  enableRiskAssessment: boolean;
  enableResourcePrediction: boolean;
  enableTimelineOptimization: boolean;
  enableIntegrationAnalysis: boolean;
  customPrompts?: Record<string, string>;
}

export interface AIAnalysis {
  riskAssessment?: RiskAssessment;
  resourcePrediction?: ResourcePrediction;
  timelineOptimization?: TimelineOptimization;
  integrationComplexity?: IntegrationComplexity;
  suggestions?: AISuggestion[];
  generatedAt: Date;
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: Risk[];
  mitigationStrategies: string[];
}

export interface Risk {
  id: string;
  category: string;
  description: string;
  probability: number;
  impact: number;
  score: number;
  mitigation?: string;
}

export interface ResourcePrediction {
  estimatedTeamSize: number;
  requiredRoles: Role[];
  estimatedBudget: BudgetRange;
  recommendedSkills: string[];
}

export interface Role {
  title: string;
  count: number;
  skills: string[];
  level: 'junior' | 'mid' | 'senior' | 'lead';
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
  confidence: number;
}

export interface TimelineOptimization {
  estimatedDuration: number; // in days
  recommendedStartDate: Date;
  milestones: Milestone[];
  criticalPath: string[];
  bufferRecommendation: number; // percentage
}

export interface Milestone {
  id: string;
  name: string;
  duration: number;
  dependencies: string[];
  deliverables: string[];
}

export interface IntegrationComplexity {
  score: number; // 1-10
  systems: SystemIntegration[];
  recommendations: string[];
  estimatedEffort: number; // in hours
}

export interface SystemIntegration {
  name: string;
  type: string;
  complexity: 'low' | 'medium' | 'high';
  requirements: string[];
}

export interface AISuggestion {
  fieldId: string;
  suggestion: string;
  confidence: number;
  reasoning?: string;
}

// User and Organization Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
  avatar?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  lastActive: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer'
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: NotificationPreferences;
  defaultIndustry?: Industry;
  language: string;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  mentions: boolean;
  approvals: boolean;
  updates: boolean;
}

export interface Organization {
  id: string;
  name: string;
  industry: Industry;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  settings: OrganizationSettings;
  createdAt: Date;
}

export interface OrganizationSettings {
  allowTemplateSharing: boolean;
  requireApprovals: boolean;
  approvalLevels: number;
  aiFeatures: AISettings;
  branding?: Branding;
}

export interface Branding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Real-time Collaboration Types
export interface RealtimeEvent {
  type: RealtimeEventType;
  documentId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum RealtimeEventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  FIELD_UPDATED = 'field_updated',
  COMMENT_ADDED = 'comment_added',
  STATUS_CHANGED = 'status_changed',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed'
}

export interface UserPresence {
  userId: string;
  documentId: string;
  cursor?: CursorPosition;
  selection?: Selection;
  activeField?: string;
  status: 'active' | 'idle' | 'away';
  lastSeen: Date;
}

export interface CursorPosition {
  fieldId: string;
  position: number;
}

export interface Selection {
  fieldId: string;
  start: number;
  end: number;
}