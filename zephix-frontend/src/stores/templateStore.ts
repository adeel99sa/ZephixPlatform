import { create } from 'zustand';
import { templates } from '../services/api.service';

interface TemplatePhase {
  id: string;
  name: string;
  order_index: number;
  gate_requirements: any[];
  duration_days?: number;
}

interface Template {
  id: string;
  name: string;
  methodology: string;
  description?: string;
  structure: any[];
  metrics: any[];
  is_active: boolean;
  is_system: boolean;
  organization_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
  phases: TemplatePhase[];
}

interface TemplateState {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTemplates: () => Promise<void>;
  selectTemplate: (template: Template) => void;
  clearSelection: () => void;
  clearError: () => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templatesData = await templates.getSystemTemplates();
      set({ templates: templatesData, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
        isLoading: false 
      });
    }
  },

  selectTemplate: (template: Template) => {
    set({ selectedTemplate: template });
  },

  clearSelection: () => {
    set({ selectedTemplate: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
