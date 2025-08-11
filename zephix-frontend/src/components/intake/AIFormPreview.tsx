import React, { useState } from 'react';
import { 
  Eye, 
  ExternalLink, 
  Copy, 
  Download, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  FileText,
  Users,
  Clock,
  Target,
  Zap,
  Code,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { Button } from '../ui/Button';

interface GeneratedFormResult {
  formStructure: {
    fields: Array<{
      id: string;
      label: string;
      type: string;
      required: boolean;
      placeholder?: string;
      helpText?: string;
      options?: string[];
      validation?: any;
      defaultValue?: any;
    }>;
    sections: Array<{
      id: string;
      title: string;
      description?: string;
      fields: string[];
    }>;
    layout: string;
    styling: any;
  };
  workflowConfiguration: any;
  intelligentFeatures: {
    conditionalLogic: any[];
    validationRules: any[];
    integrationSuggestions: string[];
    autoFieldTypes: Record<string, string>;
  };
  confidence: number;
  suggestedImprovements: string[];
  generationMetadata: {
    originalDescription: string;
    processingTime: number;
    modelUsed: string;
    complexity: string;
    detectedPatterns: string[];
  };
}

interface AIFormPreviewProps {
  form: GeneratedFormResult;
  onEdit?: (fieldId: string) => void;
  showAnalytics?: boolean;
}

const FormFieldRenderer: React.FC<{
  field: any;
  value: any;
  onChange: (value: any) => void;
  showAIIndicators?: boolean;
}> = ({ field, value, onChange, showAIIndicators = true }) => {
  const getFieldIcon = () => {
    switch (field.type) {
      case 'email': return '📧';
      case 'phone': return '📞';
      case 'date': return '📅';
      case 'file': return '📎';
      case 'number': return '🔢';
      case 'url': return '🔗';
      default: return '📝';
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">{field.label}</span>
          </label>
        );

      case 'file':
        return (
          <input
            type="file"
            multiple
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getFieldIcon()}</span>
            <span>{field.label}</span>
            {field.required && <span className="text-red-400">*</span>}
          </div>
          
          {showAIIndicators && (
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-400">AI Generated</span>
            </div>
          )}
        </div>
      </label>
      
      {renderField()}
      
      {field.helpText && (
        <p className="text-xs text-slate-500">{field.helpText}</p>
      )}
      
      {field.validation && (
        <div className="flex items-center space-x-1 text-xs text-blue-400">
          <CheckCircle className="w-3 h-3" />
          <span>Smart validation enabled</span>
        </div>
      )}
    </div>
  );
};

const WorkflowVisualization: React.FC<{ workflow: any }> = ({ workflow }) => {
  if (!workflow) return null;

  return (
    <div className="space-y-4">
      {workflow.approvalChain && workflow.approvalChain.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            Approval Chain
          </h5>
          <div className="space-y-2">
            {workflow.approvalChain.map((approval: any, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-slate-700/50 rounded-md">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                  {approval.level}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-slate-300">{approval.role}</span>
                  {approval.condition && approval.condition !== 'always' && (
                    <p className="text-xs text-slate-500">When: {approval.condition}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workflow.assignmentRules && workflow.assignmentRules.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-1" />
            Auto-Assignment Rules
          </h5>
          <div className="space-y-2">
            {workflow.assignmentRules.map((rule: any, index: number) => (
              <div key={index} className="p-2 bg-slate-700/50 rounded-md">
                <div className="text-sm text-slate-300">{rule.assignTo}</div>
                <div className="text-xs text-slate-500">
                  Condition: {rule.condition} • Priority: {rule.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DevicePreview: React.FC<{ 
  device: 'desktop' | 'tablet' | 'mobile'; 
  isActive: boolean; 
  onClick: () => void;
}> = ({ device, isActive, onClick }) => {
  const icons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone
  };
  
  const Icon = icons[device];
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="capitalize">{device}</span>
    </button>
  );
};

export const AIFormPreview: React.FC<AIFormPreviewProps> = ({ 
  form, 
  onEdit,
  showAnalytics = true
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const getDeviceClass = () => {
    switch (previewDevice) {
      case 'tablet': return 'max-w-2xl';
      case 'mobile': return 'max-w-sm';
      default: return 'max-w-4xl';
    }
  };

  const handleCopyUrl = async () => {
    if (form.generationMetadata) {
      await navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };

  const handleExportCode = () => {
    const formCode = `
<!-- AI Generated Form -->
<form class="ai-generated-form">
  ${form.formStructure.sections.map(section => `
  <section class="form-section">
    <h3>${section.title}</h3>
    ${section.description ? `<p>${section.description}</p>` : ''}
    ${section.fields.map(fieldId => {
      const field = form.formStructure.fields.find(f => f.id === fieldId);
      return field ? `
    <div class="form-field">
      <label for="${field.id}">${field.label}${field.required ? '*' : ''}</label>
      <input type="${field.type}" id="${field.id}" name="${field.id}" ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} ${field.required ? 'required' : ''} />
      ${field.helpText ? `<small>${field.helpText}</small>` : ''}
    </div>` : '';
    }).join('')}
  </section>`).join('')}
  <button type="submit">Submit</button>
</form>

<style>
.ai-generated-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
}
.form-section {
  margin-bottom: 24px;
}
.form-field {
  margin-bottom: 16px;
}
.form-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  color: #374151;
}
.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}
.form-field small {
  color: #6b7280;
  font-size: 12px;
}
</style>`;

    const blob = new Blob([formCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-generated-form.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Live Preview
          </h3>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-700 rounded-md p-1">
              <DevicePreview 
                device="desktop" 
                isActive={previewDevice === 'desktop'} 
                onClick={() => setPreviewDevice('desktop')} 
              />
              <DevicePreview 
                device="tablet" 
                isActive={previewDevice === 'tablet'} 
                onClick={() => setPreviewDevice('tablet')} 
              />
              <DevicePreview 
                device="mobile" 
                isActive={previewDevice === 'mobile'} 
                onClick={() => setPreviewDevice('mobile')} 
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCode(!showCode)}
            >
              <Code className="w-4 h-4 mr-1" />
              {showCode ? 'Preview' : 'Code'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleExportCode}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" />
              Full Screen
            </Button>
          </div>
        </div>

        {/* Analytics Bar */}
        {showAnalytics && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{form.formStructure.fields.length}</div>
              <div className="text-xs text-slate-400">Fields</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">{Math.round(form.confidence * 100)}%</div>
              <div className="text-xs text-slate-400">Confidence</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{form.generationMetadata.processingTime}ms</div>
              <div className="text-xs text-slate-400">Generation</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400 capitalize">{form.generationMetadata.complexity}</div>
              <div className="text-xs text-slate-400">Complexity</div>
            </div>
          </div>
        )}

        {/* Device Preview Frame */}
        <div className="flex justify-center">
          <div className={`${getDeviceClass()} transition-all duration-300`}>
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
              {!showCode ? (
                <div className="p-6">
                  {/* Form Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {form.formStructure.sections[0]?.title || 'Intake Form'}
                    </h1>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span>Generated by AI</span>
                    </div>
                  </div>

                  {/* Form Sections */}
                  <form className="space-y-8">
                    {form.formStructure.sections.map((section) => (
                      <div key={section.id} className="space-y-6">
                        {section.title && (
                          <div className="border-b border-gray-200 pb-2">
                            <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                            {section.description && (
                              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-6">
                          {section.fields.map((fieldId) => {
                            const field = form.formStructure.fields.find(f => f.id === fieldId);
                            if (!field) return null;

                            return (
                              <div key={field.id} className="relative">
                                <FormFieldRenderer
                                  field={field}
                                  value={formData[field.id]}
                                  onChange={(value) => handleFieldChange(field.id, value)}
                                  showAIIndicators={false}
                                />
                                
                                {onEdit && (
                                  <button
                                    type="button"
                                    onClick={() => onEdit(field.id)}
                                    className="absolute top-0 right-0 opacity-0 hover:opacity-100 p-1 bg-blue-500 text-white rounded-full transition-opacity"
                                  >
                                    <Settings className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-gray-200">
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled
                      >
                        Submit Request
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        This is a preview - submissions are disabled
                      </p>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-6 bg-gray-900 text-green-400 font-mono text-sm overflow-auto max-h-96">
                  <pre>{`<!-- AI Generated Form Code -->
<form class="ai-generated-form">
${form.formStructure.sections.map(section => `
  <section class="form-section">
    <h3>${section.title}</h3>
    ${section.fields.map(fieldId => {
      const field = form.formStructure.fields.find(f => f.id === fieldId);
      return field ? `
    <div class="form-field">
      <label for="${field.id}">${field.label}${field.required ? '*' : ''}</label>
      <input type="${field.type}" id="${field.id}" name="${field.id}" />
    </div>` : '';
    }).join('')}
  </section>`).join('')}
  <button type="submit">Submit</button>
</form>`}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Analysis */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Intelligent Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Smart Validation */}
          {form.intelligentFeatures.validationRules.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Smart Validation</h4>
              <div className="space-y-2">
                {form.intelligentFeatures.validationRules.map((rule, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">{rule.message || rule.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integration Suggestions */}
          {form.intelligentFeatures.integrationSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Suggested Integrations</h4>
              <div className="flex flex-wrap gap-2">
                {form.intelligentFeatures.integrationSuggestions.map((integration, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  >
                    {integration}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detected Patterns */}
          {form.generationMetadata.detectedPatterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Detected Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {form.generationMetadata.detectedPatterns.map((pattern, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-600/20 text-purple-400 border border-purple-600/30"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Configuration */}
          {form.workflowConfiguration && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Workflow Configuration</h4>
              <WorkflowVisualization workflow={form.workflowConfiguration} />
            </div>
          )}
        </div>
      </div>

      {/* Improvements Suggestions */}
      {form.suggestedImprovements.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
          <h3 className="text-lg font-medium text-amber-400 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Suggested Improvements
          </h3>
          <div className="space-y-3">
            {form.suggestedImprovements.map((improvement, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-amber-400">{index + 1}</span>
                </div>
                <p className="text-sm text-amber-300">{improvement}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
