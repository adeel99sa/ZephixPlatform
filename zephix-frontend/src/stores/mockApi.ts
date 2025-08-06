// mockApi.ts - Abstracted API logic for Zephix Platform
import type { Project, TeamMember } from '../types';

// Utility function for generating initials
export const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Initial mock data
const initialMockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Q4 Marketing Campaign',
    status: 'Building',
    health: 'On Track',
    progress: 65,
    priority: 'High',
    category: 'Marketing',
    budget: 150000,
    deadline: new Date('2025-12-15'),
    milestones: [
      { id: 'm1', name: 'Creative Brief Approved', status: 'done', assignee: 'Sarah Chen' },
      { id: 'm2', name: 'Ad Creatives Finalized', status: 'inprogress', dueDate: new Date('2025-08-20'), assignee: 'Mike Rodriguez' },
      { id: 'm3', name: 'Campaign Launch', status: 'todo', dueDate: new Date('2025-09-01') },
    ],
    risks: [
      { id: 'r1', description: 'Ad spend budget might be tight for Q4 push', severity: 'Medium', probability: 'Medium', mitigation: 'Negotiate volume discounts with platforms' }
    ],
    opportunities: [
      { id: 'o1', description: 'Potential for viral TikTok trend integration', potential: 'High', effort: 'Low' }
    ],
    team: [
      { id: 't1', name: 'Sarah Chen', role: 'Creative Director', avatar: 'SC', availability: 'Available' },
      { id: 't2', name: 'Mike Rodriguez', role: 'Digital Strategist', avatar: 'MR', availability: 'Busy' },
      { id: 't3', name: 'Lisa Park', role: 'Analytics Lead', avatar: 'LP', availability: 'Available' },
    ]
  },
  {
    id: 'proj-2',
    name: 'Mobile API Infrastructure',
    status: 'Review',
    health: 'At Risk',
    progress: 80,
    priority: 'High',
    category: 'Development',
    deadline: new Date('2025-08-25'),
    milestones: [
      { id: 'm4', name: 'Authentication System', status: 'done' },
      { id: 'm5', name: 'Data Models & Validation', status: 'done' },
      { id: 'm6', name: 'Security Audit & Penetration Testing', status: 'inprogress', dueDate: new Date('2025-08-15') },
      { id: 'm7', name: 'Load Testing & Optimization', status: 'blocked' },
    ],
    risks: [
      { id: 'r2', description: 'Third-party payment API showing 15% latency degradation', severity: 'High', probability: 'High', mitigation: 'Implement fallback providers and circuit breakers' }
    ],
    opportunities: [
      { id: 'o2', description: 'Architecture can be white-labeled for enterprise clients', potential: 'High', effort: 'Medium' }
    ],
    team: [
      { id: 't4', name: 'David Kim', role: 'Backend Lead', avatar: 'DK', availability: 'Available' },
      { id: 't5', name: 'Emma Watson', role: 'Security Engineer', avatar: 'EW', availability: 'Busy' },
    ]
  },
];

// In-memory storage for mock data
let mockProjects: Project[] = [...initialMockProjects];

// Performance monitoring utility
const logApiCall = (method: string, startTime: number, success: boolean, data?: any) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (success) {
    console.log(`✅ API ${method}: Completed in ${duration.toFixed(2)}ms`);
    if (data) {
      console.log(`📊 API ${method}: Data:`, data);
    }
  } else {
    console.error(`❌ API ${method}: Failed after ${duration.toFixed(2)}ms`);
  }
};

// Mock API interface with enhanced performance monitoring
export const mockApi = {
  /**
   * Fetch all projects with simulated network delay
   */
  getProjects: async (): Promise<Project[]> => {
    const startTime = performance.now();
    console.log('🔄 API: Fetching projects...');
    
    try {
      const result = new Promise<Project[]>((resolve) => {
        setTimeout(() => {
          console.log(`📦 API: Returning ${mockProjects.length} projects`);
          resolve(mockProjects);
        }, 500);
      });
      
      const projects = await result;
      logApiCall('getProjects', startTime, true, { count: projects.length });
      return projects;
    } catch (error) {
      logApiCall('getProjects', startTime, false);
      console.error('API getProjects Error:', error);
      throw error;
    }
  },

  /**
   * Create a new project based on user input
   */
  createProject: async (text: string): Promise<Project> => {
    const startTime = performance.now();
    console.log('🔄 API: Creating project...', { input: text.substring(0, 50) + '...' });
    
    try {
      const result = new Promise<Project>((resolve) => {
        setTimeout(() => {
          const newTeam: TeamMember[] = [
            { id: `t-${Date.now()}-1`, name: 'Alex Johnson', role: 'Project Lead', avatar: getInitials('Alex Johnson'), availability: 'Available' },
            { id: `t-${Date.now()}-2`, name: 'Sam Chen', role: 'Technical Lead', avatar: getInitials('Sam Chen'), availability: 'Available' },
          ];

          const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: text.length > 40 ? text.substring(0, 37) + '...' : text,
            status: 'Planning',
            health: 'On Track',
            progress: Math.floor(Math.random() * 20) + 5,
            priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)] as 'High' | 'Medium' | 'Low',
            category: ['Development', 'Marketing', 'Operations', 'Strategy'][Math.floor(Math.random() * 4)] as Project['category'],
            deadline: new Date(Date.now() + (Math.random() * 90 + 30) * 24 * 60 * 60 * 1000),
            milestones: [
              { id: `m-${Date.now()}-1`, name: 'Project Scope & Requirements Analysis', status: 'inprogress' },
              { id: `m-${Date.now()}-2`, name: 'Team Assembly & Resource Planning', status: 'todo' },
              { id: `m-${Date.now()}-3`, name: 'Implementation Phase Kickoff', status: 'todo' },
            ],
            risks: [
              { id: `r-${Date.now()}`, description: 'Scope expansion during development phase', severity: 'Medium', probability: 'Medium', mitigation: 'Implement change control process' }
            ],
            opportunities: [
              { id: `o-${Date.now()}`, description: 'Potential for cross-team collaboration and knowledge sharing', potential: 'Medium', effort: 'Low' }
            ],
            team: newTeam,
          };
          
          mockProjects = [newProject, ...mockProjects];
          console.log(`📦 API: Created project "${newProject.name}" with ID ${newProject.id}`);
          resolve(newProject);
        }, 1500 + Math.random() * 1000);
      });
      
      const project = await result;
      logApiCall('createProject', startTime, true, { 
        projectId: project.id, 
        projectName: project.name,
        teamSize: project.team.length,
        milestonesCount: project.milestones.length
      });
      return project;
    } catch (error) {
      logApiCall('createProject', startTime, false);
      console.error('API createProject Error:', error);
      throw error;
    }
  },

  /**
   * Update an existing project
   */
  updateProject: async (projectId: string, updates: Partial<Project>): Promise<Project> => {
    const startTime = performance.now();
    console.log('🔄 API: Updating project...', { projectId, updates });
    
    try {
      const result = new Promise<Project>((resolve, reject) => {
        setTimeout(() => {
          const projectIndex = mockProjects.findIndex(p => p.id === projectId);
          if (projectIndex === -1) {
            reject(new Error('Project not found'));
            return;
          }
          
          mockProjects[projectIndex] = { ...mockProjects[projectIndex], ...updates };
          console.log(`📦 API: Updated project "${mockProjects[projectIndex].name}"`);
          resolve(mockProjects[projectIndex]);
        }, 800);
      });
      
      const project = await result;
      logApiCall('updateProject', startTime, true, { 
        projectId: project.id, 
        projectName: project.name 
      });
      return project;
    } catch (error) {
      logApiCall('updateProject', startTime, false);
      console.error('API updateProject Error:', error);
      throw error;
    }
  },

  /**
   * Delete a project
   */
  deleteProject: async (projectId: string): Promise<void> => {
    const startTime = performance.now();
    console.log('🔄 API: Deleting project...', { projectId });
    
    try {
      const result = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          const projectIndex = mockProjects.findIndex(p => p.id === projectId);
          if (projectIndex === -1) {
            reject(new Error('Project not found'));
            return;
          }
          
          const deletedProject = mockProjects[projectIndex];
          mockProjects = mockProjects.filter(p => p.id !== projectId);
          console.log(`📦 API: Deleted project "${deletedProject.name}"`);
          resolve();
        }, 600);
      });
      
      await result;
      logApiCall('deleteProject', startTime, true, { projectId });
    } catch (error) {
      logApiCall('deleteProject', startTime, false);
      console.error('API deleteProject Error:', error);
      throw error;
    }
  },

  /**
   * Reset mock data to initial state (for testing)
   */
  resetData: () => {
    console.log('🔄 API: Resetting mock data to initial state');
    mockProjects = [...initialMockProjects];
    console.log(`📦 API: Reset complete, ${mockProjects.length} projects loaded`);
  }
};
