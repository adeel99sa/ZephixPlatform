export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  team?: {
    id: string;
    name: string;
    members: TeamMember[];
  };
}

export interface TeamMember {
  id: string;
  user: User;
  role: {
    id: string;
    name: string;
  };
  joinedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  startDate?: string;
  endDate?: string;
  budget?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface FeedbackData {
  type: 'bug' | 'feature_request' | 'usability' | 'general';
  content: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface Feedback {
  id: string;
  type: 'bug' | 'feature_request' | 'usability' | 'general';
  content: string;
  context?: string;
  status: 'new' | 'reviewing' | 'acknowledged' | 'implemented' | 'closed';
  user: User;
  createdAt: string;
} 