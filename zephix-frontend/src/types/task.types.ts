import { User } from './global';

export interface Task {
  id: string;
  projectId: string;
  phaseId?: string;
  name: string;
  description?: string;
  assignedTo?: string;
  assignee?: User;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  dependencies?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  projectId: string;
  phaseId?: string;
  assignedTo?: string;
  estimatedHours?: number;
  startDate?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  type: 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance';
  order: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  tasks?: Task[];
}
