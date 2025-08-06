// types/index.ts - Type definitions for Zephix Platform

export type Message = {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  project?: Project;
  type?: 'text' | 'project' | 'error' | 'success';
};

export type Project = {
  id: string;
  name: string;
  status: 'Planning' | 'Building' | 'Review' | 'Complete';
  health: 'On Track' | 'At Risk' | 'Off Track';
  progress: number;
  milestones: Milestone[];
  risks: Risk[];
  opportunities: Opportunity[];
  team: TeamMember[];
  budget?: number;
  deadline?: Date;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Marketing' | 'Development' | 'Operations' | 'Strategy';
};

export type Milestone = {
  id: string;
  name: string;
  status: 'done' | 'inprogress' | 'todo' | 'blocked';
  dueDate?: Date;
  assignee?: string;
};

export type Risk = {
  id: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  mitigation?: string;
};

export type Opportunity = {
  id: string;
  description: string;
  potential: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  availability: 'Available' | 'Busy' | 'Away';
};

// Legacy types for backward compatibility
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type CreateProjectData = {
  name: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  budget?: number;
};

// API Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type ProjectsResponse = {
  projects: Project[];
  count: number;
  message?: string;
};

export type ProjectResponse = {
  project: Project;
  message?: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  message?: string;
};

// File upload types
export type FileUploadResponse = {
  fileId: string;
  fileName: string;
  fileSize: number;
  message?: string;
};

// AI Chat types
export type ChatMessage = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  projectId?: string;
};

export type AIResponse = {
  content: string;
  action?: {
    type: 'create_project' | 'show_projects' | 'analytics' | 'logout' | 'navigate';
    data?: any;
  };
};

// Constants
export const PROJECT_STATUS_LABELS = {
  'Planning': 'Planning',
  'Building': 'Building',
  'Review': 'Review',
  'Complete': 'Complete',
} as const;

export const PROJECT_PRIORITY_LABELS = {
  'High': 'High',
  'Medium': 'Medium',
  'Low': 'Low',
} as const;

export const PROJECT_STATUS_COLORS = {
  'Planning': 'bg-blue-100 text-blue-800',
  'Building': 'bg-yellow-100 text-yellow-800',
  'Review': 'bg-purple-100 text-purple-800',
  'Complete': 'bg-green-100 text-green-800',
} as const;

export const PROJECT_PRIORITY_COLORS = {
  'High': 'bg-red-100 text-red-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'Low': 'bg-green-100 text-green-800',
} as const; 