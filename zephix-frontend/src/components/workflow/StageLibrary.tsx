import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Inbox, 
  Folder, 
  Shield, 
  CheckCircle,
  Zap,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Settings
} from 'lucide-react';
import { WorkflowStage } from '../../types/workflow';
import { Button } from '../ui/Button';

interface StageLibraryProps {
  onAddStage: (stage: Partial<WorkflowStage>) => void;
}

const STAGE_TEMPLATES = [
  // Intake Stages
  {
    category: 'Intake',
    stages: [
      {
        id: 'intake_initial_review',
        name: 'Initial Review',
        type: 'intake_stage' as const,
        description: 'First review of incoming requests',
        icon: Inbox,
        color: 'purple',
        defaultConfig: {
          required: true,
          automations: [
            {
              trigger: 'stage_enter',
              action: 'send_notification',
              conditions: {},
              config: { template: 'intake_received' }
            }
          ],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'intake_assessment',
        name: 'Request Assessment',
        type: 'intake_stage' as const,
        description: 'Detailed assessment of request feasibility',
        icon: FileText,
        color: 'purple',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'intake_approval',
        name: 'Intake Approval',
        type: 'approval_gate' as const,
        description: 'Final approval to proceed with request',
        icon: Shield,
        color: 'amber',
        defaultConfig: {
          required: true,
          automations: [
            {
              trigger: 'approval_received',
              action: 'move_to_stage',
              conditions: {},
              config: {}
            }
          ],
          approvers: [],
          notifications: []
        }
      }
    ]
  },
  // Project Phases
  {
    category: 'Project',
    stages: [
      {
        id: 'project_planning',
        name: 'Project Planning',
        type: 'project_phase' as const,
        description: 'Define scope, timeline, and resources',
        icon: Folder,
        color: 'blue',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'project_execution',
        name: 'Execution',
        type: 'project_phase' as const,
        description: 'Active development and implementation',
        icon: Settings,
        color: 'blue',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'project_review',
        name: 'Review & Testing',
        type: 'project_phase' as const,
        description: 'Quality assurance and review',
        icon: CheckCircle,
        color: 'blue',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      }
    ]
  },
  // Approval Gates
  {
    category: 'Approvals',
    stages: [
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        type: 'approval_gate' as const,
        description: 'Requires manager approval to proceed',
        icon: Users,
        color: 'amber',
        defaultConfig: {
          required: true,
          automations: [
            {
              trigger: 'stage_enter',
              action: 'send_notification',
              conditions: {},
              config: { template: 'approval_required' }
            }
          ],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'budget_approval',
        name: 'Budget Approval',
        type: 'approval_gate' as const,
        description: 'Financial approval for project costs',
        icon: Shield,
        color: 'amber',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'security_approval',
        name: 'Security Review',
        type: 'approval_gate' as const,
        description: 'Security team approval and review',
        icon: Shield,
        color: 'amber',
        defaultConfig: {
          required: false,
          automations: [],
          approvers: [],
          notifications: []
        }
      }
    ]
  },
  // ORR Sections
  {
    category: 'ORR',
    stages: [
      {
        id: 'orr_technical_readiness',
        name: 'Technical Readiness',
        type: 'orr_section' as const,
        description: 'Technical systems and architecture review',
        icon: Settings,
        color: 'green',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'orr_operational_readiness',
        name: 'Operational Readiness',
        type: 'orr_section' as const,
        description: 'Operations team readiness verification',
        icon: CheckCircle,
        color: 'green',
        defaultConfig: {
          required: true,
          automations: [],
          approvers: [],
          notifications: []
        }
      },
      {
        id: 'orr_handoff',
        name: 'Production Handoff',
        type: 'orr_section' as const,
        description: 'Final handoff to production operations',
        icon: AlertTriangle,
        color: 'green',
        defaultConfig: {
          required: true,
          automations: [
            {
              trigger: 'stage_complete',
              action: 'webhook',
              conditions: {},
              config: { event: 'orr.ready_for_handoff' }
            }
          ],
          approvers: [],
          notifications: []
        }
      }
    ]
  }
];

const QUICK_STAGES = [
  {
    name: 'Custom Stage',
    type: 'project_phase' as const,
    icon: Plus,
    color: 'gray',
    description: 'Create a custom stage from scratch'
  },
  {
    name: 'Approval Gate',
    type: 'approval_gate' as const,
    icon: Shield,
    color: 'amber',
    description: 'Add an approval checkpoint'
  },
  {
    name: 'Automation Hub',
    type: 'project_phase' as const,
    icon: Zap,
    color: 'blue',
    description: 'Stage with multiple automations'
  }
];

interface StageTemplateCardProps {
  stage: any;
  onAdd: () => void;
}

const StageTemplateCard: React.FC<StageTemplateCardProps> = ({ stage, onAdd }) => {
  const Icon = stage.icon;
  const colorClasses = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:border-purple-500/40',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/40',
    green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:border-green-500/40',
    gray: 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:border-gray-500/40'
  };

  return (
    <div
      onClick={onAdd}
      className={`
        p-3 border rounded-lg cursor-pointer transition-all duration-200 group
        ${colorClasses[stage.color]}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-white truncate">
            {stage.name}
          </h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {stage.description}
          </p>
        </div>
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500 capitalize">
          {stage.type?.replace('_', ' ') || 'Custom'}
        </span>
        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

export const StageLibrary: React.FC<StageLibraryProps> = ({ onAddStage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...STAGE_TEMPLATES.map(t => t.category)];

  const filteredTemplates = STAGE_TEMPLATES.filter(template => {
    if (selectedCategory !== 'All' && template.category !== selectedCategory) {
      return false;
    }
    
    if (searchTerm) {
      return template.stages.some(stage => 
        stage.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stage.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return true;
  });

  const handleAddStage = (stageTemplate: any) => {
    const stage: Partial<WorkflowStage> = {
      name: stageTemplate.name,
      type: stageTemplate.type,
      required: stageTemplate.defaultConfig?.required ?? true,
      automations: stageTemplate.defaultConfig?.automations ?? [],
      approvers: stageTemplate.defaultConfig?.approvers ?? [],
      notifications: stageTemplate.defaultConfig?.notifications ?? []
    };
    
    onAddStage(stage);
  };

  const handleQuickAdd = (quickStage: any) => {
    const stage: Partial<WorkflowStage> = {
      name: quickStage.name,
      type: quickStage.type,
      required: true,
      automations: [],
      approvers: [],
      notifications: []
    };
    
    onAddStage(stage);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Stage Library</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex space-x-1 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Quick Add */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-3">Quick Add</h3>
          <div className="grid gap-2">
            {QUICK_STAGES.map((stage, index) => (
              <StageTemplateCard
                key={index}
                stage={stage}
                onAdd={() => handleQuickAdd(stage)}
              />
            ))}
          </div>
        </div>

        {/* Stage Templates */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No Stages Found</h3>
            <p className="text-slate-500">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTemplates.map((template) => (
              <div key={template.category}>
                <h3 className="text-sm font-medium text-white mb-3">{template.category} Stages</h3>
                <div className="grid gap-2">
                  {template.stages
                    .filter(stage => 
                      !searchTerm || 
                      stage.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      stage.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((stage) => (
                      <StageTemplateCard
                        key={stage.id}
                        stage={stage}
                        onAdd={() => handleAddStage(stage)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">💡 Pro Tips</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Drag stages from the library to the canvas</li>
            <li>• Click on any stage to configure automations</li>
            <li>• Use approval gates for sign-off processes</li>
            <li>• ORR sections help with operational handoffs</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
