/**
 * TYPE-SAFE MIGRATION EXAMPLE
 * 
 * This file demonstrates how to migrate from 'any' types to proper TypeScript
 * without breaking existing functionality. This is a real example you can use
 * as a template for migrating your components.
 */

import React, { useState, useEffect } from 'react';
import { 
  Project, 
  User, 
  ApiResponse, 
  ProjectFilters,
  safeToProject,
  isProject,
  safeExtractArray
} from '../types/global';
import { createTypeSafeApi } from '../services/type-safe-api';
import { api } from '../services/api'; // existing API service

// ============================================================================
// EXAMPLE 1: MIGRATING A PROJECT LIST COMPONENT
// ============================================================================

/**
 * BEFORE: Component with 'any' types (current state)
 * This is what your components probably look like now
 */
const ProjectListComponent_BEFORE = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {projects.map((project: any) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <span>Status: {project.status}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * AFTER: Type-safe component (migrated state)
 * This is what the component looks like after migration
 */
const ProjectListComponent_AFTER = () => {
  // ✅ Proper typing instead of 'any'
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Type-safe API service
  const typeSafeApi = createTypeSafeApi(api);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Type-safe API call with proper error handling
      const response = await typeSafeApi.getProjects();
      
      if (response.success) {
        setProjects(response.data);
      } else {
        setError(response.message || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <span>Status: {project.status}</span>
          {/* ✅ TypeScript now knows project properties */}
          <span>Priority: {project.priority}</span>
          <span>Progress: {project.progress}%</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: MIGRATING WITH LEGACY DATA
// ============================================================================

/**
 * This example shows how to handle legacy data that might not match
 * the new types perfectly, using safe conversion functions
 */
const LegacyDataMigrationExample = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjectsWithLegacySupport = async () => {
    try {
      setLoading(true);
      
      // This might return data in the old format
      const response = await api.get('/projects');
      
      // ✅ Safe conversion from legacy format
      const projectData = safeExtractArray(response.data, isProject);
      
      // ✅ Additional safety with individual conversion
      const safeProjects = projectData.map(item => {
        const converted = safeToProject(item);
        return converted || {
          // Fallback project if conversion fails
          id: 'unknown',
          name: 'Unknown Project',
          status: 'planning' as const,
          priority: 'medium' as const,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          organizationId: '',
          workspaceId: '',
          createdBy: '',
          tags: [],
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      
      setProjects(safeProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Projects with Legacy Support</h2>
      {loading && <div>Loading...</div>}
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>Status: {project.status}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: MIGRATING API SERVICE CALLS
// ============================================================================

/**
 * BEFORE: Direct API calls with 'any' types
 */
const ApiCalls_BEFORE = {
  async getProjects() {
    const response = await api.get('/projects');
    return response.data;
  },
  
  async createProject(data: any) {
    const response = await api.post('/projects', data);
    return response.data;
  },
  
  async updateProject(id: string, data: any) {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  }
};

/**
 * AFTER: Type-safe API service calls
 */
const ApiCalls_AFTER = {
  typeSafeApi: createTypeSafeApi(api),
  
  async getProjects(): Promise<Project[]> {
    const response = await this.typeSafeApi.getProjects();
    return response.success ? response.data : [];
  },
  
  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<Project | null> {
    const response = await this.typeSafeApi.createProject(data);
    return response.success ? response.data : null;
  },
  
  async updateProject(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Project | null> {
    const response = await this.typeSafeApi.updateProject(id, data);
    return response.success ? response.data : null;
  }
};

// ============================================================================
// EXAMPLE 4: MIGRATING LARGE COMPONENT
// ============================================================================

/**
 * BEFORE: Large component with mixed concerns
 */
const LargeComponent_BEFORE = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});

  // 200+ lines of mixed logic...
  
  return (
    <div>
      {/* 300+ lines of JSX */}
    </div>
  );
};

/**
 * AFTER: Broken down into focused components
 */
const ProjectFilters = ({ filters, onFiltersChange }: {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
}) => {
  return (
    <div>
      {/* Filter UI */}
    </div>
  );
};

const ProjectList = ({ projects, onProjectSelect }: {
  projects: Project[];
  onProjectSelect: (project: Project) => void;
}) => {
  return (
    <div>
      {projects.map(project => (
        <div key={project.id} onClick={() => onProjectSelect(project)}>
          {project.name}
        </div>
      ))}
    </div>
  );
};

const ProjectDetails = ({ project }: { project: Project | null }) => {
  if (!project) return null;
  
  return (
    <div>
      <h2>{project.name}</h2>
      <p>{project.description}</p>
      {/* Project details */}
    </div>
  );
};

const LargeComponent_AFTER = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [loading, setLoading] = useState(false);

  const typeSafeApi = createTypeSafeApi(api);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await typeSafeApi.getProjects(filters);
      if (response.success) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  return (
    <div>
      <ProjectFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
      />
      <ProjectList 
        projects={projects} 
        onProjectSelect={setSelectedProject} 
      />
      <ProjectDetails project={selectedProject} />
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: MIGRATION UTILITIES
// ============================================================================

/**
 * Utility functions to help with migration
 */
export const MigrationUtils = {
  /**
   * Safely migrate an array of unknown data to typed data
   */
  migrateArray<T>(
    data: unknown[], 
    validator: (item: unknown) => item is T,
    converter?: (item: unknown) => T | null
  ): T[] {
    return data
      .map(item => converter ? converter(item) : item)
      .filter(validator);
  },

  /**
   * Create a type-safe wrapper for existing functions
   */
  createTypeSafeWrapper<TInput, TOutput>(
    fn: (input: any) => any,
    inputValidator: (input: unknown) => input is TInput
  ) {
    return (input: TInput): TOutput | null => {
      if (!inputValidator(input)) {
        console.warn('Invalid input provided');
        return null;
      }
      
      try {
        const result = fn(input);
        return result as TOutput;
      } catch (error) {
        console.error('Function execution failed:', error);
        return null;
      }
    };
  },

  /**
   * Debug helper for migration
   */
  debugMigration(label: string, before: any, after: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Migration Debug - ${label}]:`, {
        before: typeof before,
        after: typeof after,
        success: typeof before === typeof after
      });
    }
  }
};

export default {
  ProjectListComponent_BEFORE,
  ProjectListComponent_AFTER,
  LegacyDataMigrationExample,
  ApiCalls_BEFORE,
  ApiCalls_AFTER,
  LargeComponent_BEFORE,
  LargeComponent_AFTER,
  MigrationUtils
};
