import React, { useState } from 'react';
import { 
  Send, 
  Loader2, 
  Plus, 
  Minus, 
  Settings, 
  Shuffle, 
  CheckSquare,
  Edit3,
  Trash2,
  ArrowRight,
  Lightbulb,
  Zap,
  RefreshCw,
  Type,
  List,
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '../ui/Button';

interface GeneratedFormResult {
  formStructure: any;
  workflowConfiguration: any;
  intelligentFeatures: any;
  confidence: number;
  suggestedImprovements: string[];
  generationMetadata: any;
}

interface RefinementInterfaceProps {
  form: GeneratedFormResult;
  onRefine: (refinementRequest: string) => Promise<void>;
  isProcessing?: boolean;
}

const commonRefinements = [
  {
    category: 'Field Operations',
    items: [
      "Add a field for key stakeholders",
      "Include a priority level selection field",
      "Add estimated timeline field",
      "Include file upload for supporting documents",
      "Add budget range dropdown",
      "Include department selection"
    ]
  },
  {
    category: 'Field Modifications',
    items: [
      "Make the budget field a dropdown with pre-set ranges",
      "Change project description to a larger text area",
      "Convert priority to radio buttons instead of dropdown",
      "Make contact email field required",
      "Add validation to phone number field",
      "Set default value for department field"
    ]
  },
  {
    category: 'Workflow Enhancements',
    items: [
      "Add approval workflow for requests over $10k",
      "Include manager approval for all requests",
      "Set up automatic assignment based on department",
      "Add notification to project coordinators",
      "Create escalation rules for urgent requests",
      "Include SLA tracking for response times"
    ]
  },
  {
    category: 'User Experience',
    items: [
      "Group related fields into logical sections",
      "Add progress indicator for multi-step form",
      "Include helpful tooltips for complex fields",
      "Reorganize fields in order of importance",
      "Add conditional logic to show/hide fields",
      "Create a more user-friendly field layout"
    ]
  }
];

const fieldTypeOptions = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'textarea', label: 'Text Area', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'radio', label: 'Radio Buttons', icon: CheckSquare },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'date', label: 'Date Picker', icon: Calendar },
  { value: 'number', label: 'Number Input', icon: Type },
  { value: 'email', label: 'Email Input', icon: Type },
  { value: 'phone', label: 'Phone Input', icon: Type },
  { value: 'file', label: 'File Upload', icon: FileText }
];

const QuickAction: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}> = ({ title, description, icon: Icon, onClick, variant = 'default' }) => {
  const variantClasses = {
    default: 'bg-slate-700 hover:bg-slate-600 border-slate-600',
    primary: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
    success: 'bg-green-600 hover:bg-green-700 border-green-500',
    warning: 'bg-amber-600 hover:bg-amber-700 border-amber-500'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg border transition-all text-left group ${variantClasses[variant]}`}
    >
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 text-white mt-0.5 group-hover:scale-110 transition-transform" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white">{title}</h4>
          <p className="text-xs text-slate-300 mt-1">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
};

const FieldModificationPanel: React.FC<{
  form: GeneratedFormResult;
  onModify: (action: string) => void;
}> = ({ form, onModify }) => {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">Quick Field Actions</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          title="Add Field"
          description="Insert a new field"
          icon={Plus}
          onClick={() => onModify("Add a new field for additional project details")}
          variant="success"
        />
        
        <QuickAction
          title="Remove Field"
          description="Delete unnecessary field"
          icon={Minus}
          onClick={() => onModify("Remove any unnecessary or redundant fields")}
          variant="warning"
        />
        
        <QuickAction
          title="Reorder Fields"
          description="Improve field flow"
          icon={Shuffle}
          onClick={() => onModify("Reorder the fields to improve the user experience and logical flow")}
        />
        
        <QuickAction
          title="Group Fields"
          description="Organize into sections"
          icon={CheckSquare}
          onClick={() => onModify("Group related fields into logical sections for better organization")}
        />
      </div>

      {/* Field-specific modifications */}
      {form.formStructure.fields && form.formStructure.fields.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-slate-400 mb-2">Modify Specific Fields</h5>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {form.formStructure.fields.slice(0, 5).map((field: any, index: number) => (
              <div key={field.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-xs text-slate-300 truncate flex-1">{field.label}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onModify(`Change "${field.label}" field type or properties`)}
                    className="p-1 hover:bg-slate-600 rounded"
                    title="Modify field"
                  >
                    <Edit3 className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => onModify(`Remove the "${field.label}" field`)}
                    className="p-1 hover:bg-slate-600 rounded"
                    title="Remove field"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WorkflowModificationPanel: React.FC<{
  onModify: (action: string) => void;
}> = ({ onModify }) => {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-300">Workflow Enhancements</h4>
      
      <div className="grid grid-cols-1 gap-3">
        <QuickAction
          title="Add Approval Chain"
          description="Set up approval workflow"
          icon={CheckSquare}
          onClick={() => onModify("Add an approval workflow with manager and department head approval for requests over $5,000")}
          variant="primary"
        />
        
        <QuickAction
          title="Auto-Assignment Rules"
          description="Smart request routing"
          icon={Zap}
          onClick={() => onModify("Set up automatic assignment rules based on department, priority, or request type")}
          variant="primary"
        />
        
        <QuickAction
          title="Notification Setup"
          description="Configure alerts"
          icon={Settings}
          onClick={() => onModify("Add email notifications for key stakeholders when new requests are submitted")}
        />
        
        <QuickAction
          title="Integration Points"
          description="Connect external systems"
          icon={RefreshCw}
          onClick={() => onModify("Suggest integrations with Slack, Teams, or project management tools")}
        />
      </div>
    </div>
  );
};

const SmartSuggestions: React.FC<{
  improvements: string[];
  onApply: (suggestion: string) => void;
}> = ({ improvements, onApply }) => {
  if (improvements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-300 flex items-center">
        <Lightbulb className="w-4 h-4 mr-1" />
        AI Suggestions
      </h4>
      
      <div className="space-y-2">
        {improvements.slice(0, 4).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onApply(suggestion)}
            className="w-full p-3 text-left bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors group"
          >
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-amber-400">{index + 1}</span>
              </div>
              <p className="text-xs text-amber-200 group-hover:text-amber-100">{suggestion}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const RefinementInterface: React.FC<RefinementInterfaceProps> = ({ 
  form, 
  onRefine, 
  isProcessing = false 
}) => {
  const [refinementRequest, setRefinementRequest] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'quick' | 'fields' | 'workflow'>('quick');

  const handleQuickRefinement = async (request: string) => {
    await onRefine(request);
  };

  const handleCustomRefinement = async () => {
    if (!refinementRequest.trim()) return;
    await onRefine(refinementRequest);
    setRefinementRequest('');
  };

  const tabs = [
    { id: 'quick', label: 'Quick Actions', icon: Zap },
    { id: 'fields', label: 'Fields', icon: Type },
    { id: 'workflow', label: 'Workflow', icon: Settings },
    { id: 'custom', label: 'Custom', icon: Edit3 }
  ] as const;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-white">Refine Your Form</h3>
        <div className="text-sm text-slate-400">
          Confidence: {Math.round(form.confidence * 100)}%
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-slate-700/50 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'quick' && (
          <div className="space-y-6">
            <SmartSuggestions 
              improvements={form.suggestedImprovements}
              onApply={handleQuickRefinement}
            />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Common Refinements</h4>
              
              {commonRefinements.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-3">
                  <h5 className="text-xs font-medium text-slate-400">{category.category}</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {category.items.map((refinement, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickRefinement(refinement)}
                        disabled={isProcessing}
                        className="text-left p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {refinement}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <FieldModificationPanel 
            form={form}
            onModify={handleQuickRefinement}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowModificationPanel 
            onModify={handleQuickRefinement}
          />
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Custom Refinement</h4>
            
            <div className="space-y-3">
              <textarea
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                placeholder="Describe the changes you'd like to make...

Examples:
• Add a field for project stakeholders with their roles
• Change the budget field to use predefined ranges
• Make the form mobile-friendly with better field spacing
• Add conditional logic to show additional fields based on project type"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={5}
                disabled={isProcessing}
              />
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {refinementRequest.length}/500 characters
                </span>
                
                <Button
                  onClick={handleCustomRefinement}
                  disabled={!refinementRequest.trim() || isProcessing || refinementRequest.length < 10}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying Changes...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Custom Actions */}
            <div className="border-t border-slate-600 pt-4">
              <h5 className="text-xs font-medium text-slate-400 mb-3">Quick Custom Actions</h5>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRefinementRequest("Make this form more mobile-friendly with better spacing and larger touch targets")}
                  className="p-2 text-xs bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  📱 Mobile Optimize
                </button>
                <button
                  onClick={() => setRefinementRequest("Add accessibility improvements like better labels and ARIA attributes")}
                  className="p-2 text-xs bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  ♿ Accessibility
                </button>
                <button
                  onClick={() => setRefinementRequest("Improve the visual design with better colors and typography")}
                  className="p-2 text-xs bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  🎨 Visual Design
                </button>
                <button
                  onClick={() => setRefinementRequest("Add progress indicators and improve the overall user experience")}
                  className="p-2 text-xs bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                >
                  ✨ UX Enhancement
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mt-6 flex items-center justify-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-3" />
          <span className="text-blue-400 text-sm">
            AI is analyzing your request and updating the form...
          </span>
        </div>
      )}
    </div>
  );
};
