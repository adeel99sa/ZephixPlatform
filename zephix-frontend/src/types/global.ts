/**
 * Global Type Definitions for Zephix Platform
 * 
 * This file provides comprehensive type definitions to replace 'any' types
 * throughout the application while maintaining backward compatibility.
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationRole: 'admin' | 'member' | 'viewer';
  currentWorkspaceId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  profilePicture?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  ownerId: string;
  isActive: boolean;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  theme?: string;
  notifications?: NotificationSettings;
  features?: FeatureSettings;
  integrations?: IntegrationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface FeatureSettings {
  timeTracking: boolean;
  resourceManagement: boolean;
  aiSuggestions: boolean;
  advancedAnalytics: boolean;
}

export interface IntegrationSettings {
  slack?: SlackIntegration;
  googleCalendar?: GoogleCalendarIntegration;
  jira?: JiraIntegration;
}

export interface SlackIntegration {
  enabled: boolean;
  webhookUrl?: string;
  channel?: string;
}

export interface GoogleCalendarIntegration {
  enabled: boolean;
  calendarId?: string;
  syncDirection: 'one-way' | 'two-way';
}

export interface JiraIntegration {
  enabled: boolean;
  baseUrl?: string;
  username?: string;
  apiToken?: string;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  organizationId: string;
  workspaceId: string;
  createdBy: string;
  assignedTo?: string[];
  tags: string[];
  budget?: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 
  | 'planning' 
  | 'active' 
  | 'on-hold' 
  | 'completed' 
  | 'cancelled';

export type ProjectPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'urgent';

export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  assignedTo?: string;
  tags?: string[];
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  workspaceId: string;
  assignedTo?: string;
  createdBy: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  dependencies: string[];
  subtasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 
  | 'todo' 
  | 'in-progress' 
  | 'review' 
  | 'completed' 
  | 'cancelled';

export type TaskPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'urgent';

// ============================================================================
// RESOURCE TYPES
// ============================================================================

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  currentAllocation: number;
  skills: string[];
  hourlyRate?: number;
  availability: ResourceAvailability;
  workspaceId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 
  | 'human' 
  | 'equipment' 
  | 'room' 
  | 'vehicle' 
  | 'other';

export interface ResourceAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  isAvailable: boolean;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  projectId: string;
  taskId?: string;
  percentage: number;
  startDate: string;
  endDate: string;
  status: AllocationStatus;
  isActive: boolean;
  justification?: string;
  createdAt: string;
  updatedAt: string;
}

export type AllocationStatus = 
  | 'pending' 
  | 'active' 
  | 'completed' 
  | 'cancelled';

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

export interface TableColumn<T = unknown> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = unknown> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationProps;
  onRowClick?: (record: T) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, unknown>) => void;
}

export interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string | number;
  closable?: boolean;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// API ENDPOINT TYPES
// ============================================================================

export interface ApiEndpoints {
  auth: {
    login: '/api/auth/login';
    signup: '/api/auth/signup';
    refresh: '/api/auth/refresh';
    logout: '/api/auth/logout';
    forgotPassword: '/api/auth/forgot-password';
    resetPassword: '/api/auth/reset-password';
  };
  workspaces: {
    list: '/api/workspaces';
    create: '/api/workspaces';
    update: '/api/workspaces/:id';
    delete: '/api/workspaces/:id';
    members: '/api/workspaces/:id/members';
  };
  projects: {
    list: '/api/projects';
    create: '/api/projects';
    update: '/api/projects/:id';
    delete: '/api/projects/:id';
    tasks: '/api/projects/:id/tasks';
  };
  tasks: {
    list: '/api/tasks';
    create: '/api/tasks';
    update: '/api/tasks/:id';
    delete: '/api/tasks/:id';
  };
  resources: {
    list: '/api/resources';
    create: '/api/resources';
    update: '/api/resources/:id';
    delete: '/api/resources/:id';
    heatmap: '/api/resources/heatmap';
    allocations: '/api/resources/allocations';
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: ValidationError[];
  timestamp: string;
}

// ============================================================================
// STORE TYPES
// ============================================================================

export interface RootState {
  auth: AuthState;
  workspace: WorkspaceState;
  projects: ProjectsState;
  tasks: TasksState;
  resources: ResourcesState;
  ui: UIState;
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
}

export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  filters: ProjectFilters;
  isLoading: boolean;
  error: string | null;
}

export interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  filters: TaskFilters;
  isLoading: boolean;
  error: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  projectId?: string;
  search?: string;
}

export interface ResourcesState {
  resources: Resource[];
  allocations: ResourceAllocation[];
  heatmapData: HeatmapData | null;
  isLoading: boolean;
  error: string | null;
}

export interface HeatmapData {
  resources: Resource[];
  dateRange: {
    start: string;
    end: string;
  };
  heatmap: HeatmapCell[];
}

export interface HeatmapCell {
  resourceId: string;
  date: string;
  utilization: number;
  tasks: Task[];
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  modals: Record<string, boolean>;
  notifications: Notification[];
  loading: Record<string, boolean>;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy type for backward compatibility
 * @deprecated Use specific types instead of 'any'
 */
export type LegacyAny = any;

/**
 * Safe type assertion helper
 * Use this instead of direct 'as any' casts
 */
export function safeAssert<T>(value: unknown): T {
  return value as T;
}

/**
 * Type guard for API responses
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value
  );
}

/**
 * Type guard for error responses
 */
export function isApiError(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'error' in value &&
    (value as ApiErrorResponse).success === false
  );
}
