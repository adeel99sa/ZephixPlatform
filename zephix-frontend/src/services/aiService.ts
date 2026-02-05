import { request } from '@/lib/api';
import type { Project, CreateProjectData } from '../types';

// Inline projectsApi to replace deleted services/api - use request for unwrapped responses
const projectsApi = {
  create: (data: CreateProjectData) => request.post<{ project: Project }>('/projects', data),
  getById: (id: string) => request.get<{ project: Project }>(`/projects/${id}`),
};

export interface AIResponse {
  content: string;
  action?: {
    type: 'create_project' | 'navigate' | 'show_projects' | 'analytics' | 'logout';
    data?: any;
  };
}

export class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async processMessage(userInput: string, context: {
    projects: Project[];
    user: any;
  }): Promise<AIResponse> {
    const input = userInput.toLowerCase().trim();
    
    // Project creation
    if (this.matchesPattern(input, ['create', 'new', 'start']) && 
        this.matchesPattern(input, ['project', 'task', 'work'])) {
      return {
        content: "I'll help you create a new project! What would you like to name it? You can also tell me more details about the project and I'll help you set it up properly.",
        action: {
          type: 'create_project',
          data: { trigger: 'project_creation' }
        }
      };
    }

    // List projects
    if (this.matchesPattern(input, ['show', 'list', 'view', 'see']) && 
        this.matchesPattern(input, ['project', 'projects'])) {
      const projectCount = context.projects.length;
      
      if (projectCount === 0) {
        return {
          content: "You don't have any projects yet. Would you like me to help you create your first project? Just tell me what you'd like to work on!",
          action: {
            type: 'create_project',
            data: { trigger: 'first_project' }
          }
        };
      }

      const projectList = context.projects.map(p => 
        `• **${p.name}** - (${p.status || 'Planning'})`
      ).join('\n');

      return {
        content: `You have ${projectCount} project${projectCount > 1 ? 's' : ''}:\n\n${projectList}\n\nWould you like me to help you manage any of these projects or create a new one?`,
        action: {
          type: 'show_projects',
          data: { projects: context.projects }
        }
      };
    }

    // Project analytics
    if (this.matchesPattern(input, ['analytics', 'statistics', 'stats', 'report', 'progress'])) {
      // Count non-complete projects as "active"
      const activeProjects = context.projects.filter(p => p.status !== 'Complete').length;
      const totalProjects = context.projects.length;
      
      return {
        content: `Here's your project analytics:\n\n📊 **Project Overview**\n• Total Projects: ${totalProjects}\n• Active Projects: ${activeProjects}\n• Completion Rate: ${totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0}%\n\nWould you like me to show you detailed analytics or help you improve your project management?`,
        action: {
          type: 'analytics',
          data: { projects: context.projects }
        }
      };
    }

    // Help and capabilities
    if (this.matchesPattern(input, ['help', 'what can you do', 'capabilities', 'features'])) {
      return {
        content: `I'm your AI project management assistant! Here's what I can help you with:\n\n🤖 **AI-Powered Features**\n• Create and manage projects\n• Analyze project data and statistics\n• Generate insights and reports\n• Team collaboration setup\n• Task prioritization\n• Progress tracking\n\n💡 **Smart Capabilities**\n• Natural language project creation\n• Intelligent task suggestions\n• Automated progress updates\n• Performance analytics\n• Team communication\n\nJust ask me anything about your projects!`,
        action: {
          type: 'navigate',
          data: { section: 'help' }
        }
      };
    }

    // User profile
    if (this.matchesPattern(input, ['profile', 'account', 'settings', 'me'])) {
      return {
        content: `Here's your profile information:\n\n👤 **User Profile**\n• Name: ${context.user?.firstName} ${context.user?.lastName}\n• Email: ${context.user?.email}\n• Member since: ${new Date().toLocaleDateString()}\n• Projects created: ${context.projects.length}\n\nYou can update your profile settings in the top right menu.`,
        action: {
          type: 'navigate',
          data: { section: 'profile' }
        }
      };
    }

    // Logout
    if (this.matchesPattern(input, ['logout', 'sign out', 'exit', 'quit'])) {
      return {
        content: "I'll help you sign out. Click the logout button in the top right corner, or I can do it for you. Thanks for using Zephix AI! 👋",
        action: {
          type: 'logout',
          data: { confirm: true }
        }
      };
    }

    // Project management suggestions
    if (this.matchesPattern(input, ['manage', 'organize', 'improve'])) {
      const suggestions = this.generateProjectSuggestions(context.projects);
      return {
        content: `Here are some suggestions to improve your project management:\n\n${suggestions}\n\nWould you like me to help you implement any of these suggestions?`,
        action: {
          type: 'navigate',
          data: { section: 'suggestions' }
        }
      };
    }

    // Default response
    return {
      content: `I understand you said: "${userInput}". I'm here to help you manage your projects and workflow. You can ask me to:\n\n• Create new projects\n• Show your current projects\n• Analyze project data\n• Generate reports\n• Help with team collaboration\n• Provide project suggestions\n\nWhat would you like to work on today?`,
      action: {
        type: 'navigate',
        data: { section: 'general' }
      }
    };
  }

  private matchesPattern(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword));
  }

  private generateProjectSuggestions(projects: Project[]): string {
    const suggestions = [];
    
    if (projects.length === 0) {
      suggestions.push("🎯 **Start your first project** - Create a project to begin your journey");
    } else if (projects.length < 3) {
      suggestions.push("📈 **Expand your portfolio** - Consider creating more projects to diversify your work");
    }
    
    // Count non-complete projects as "active"
    const activeProjects = projects.filter(p => p.status !== 'Complete');
    if (activeProjects.length > 5) {
      suggestions.push("⚡ **Focus on priorities** - Consider completing some projects before starting new ones");
    }
    
    if (suggestions.length === 0) {
      suggestions.push("🎉 **Great job!** - Your projects are well organized. Keep up the excellent work!");
    }
    
    return suggestions.join('\n');
  }

  async createProjectFromAI(projectData: {
    name: string;
    description?: string;
    category?: string;
  }): Promise<Project> {
    try {
      const createData: CreateProjectData = {
        name: projectData.name,
        description: projectData.description || `AI-created project: ${projectData.name}`,
      };
      
      const response = await projectsApi.create(createData);
      return response.project;
    } catch {
      throw new Error('Failed to create project via AI');
    }
  }

  async getProjectInsights(projectId: string): Promise<any> {
    try {
      const project = await projectsApi.getById(projectId);
      // Here you could integrate with analytics services
      return {
        project: project.project,
        insights: {
          progress: Math.random() * 100,
          teamSize: Math.floor(Math.random() * 10) + 1,
          estimatedCompletion: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        }
      };
    } catch (error) {
      throw new Error('Failed to get project insights');
    }
  }
}

export const aiService = AIService.getInstance();
