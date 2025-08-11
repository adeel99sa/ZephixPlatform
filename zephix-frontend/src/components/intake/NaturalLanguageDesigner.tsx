import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  Eye, 
  Rocket, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  RefreshCw,
  Settings,
  Download,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AIFormPreview } from './AIFormPreview';
import { RefinementInterface } from './RefinementInterface';
import { DeploymentOptions } from './DeploymentOptions';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  data?: any;
  suggestions?: string[];
  nextSteps?: string[];
}

interface GeneratedFormResult {
  formStructure: any;
  workflowConfiguration: any;
  intelligentFeatures: any;
  confidence: number;
  suggestedImprovements: string[];
  generationMetadata: {
    originalDescription: string;
    processingTime: number;
    modelUsed: string;
    complexity: string;
    detectedPatterns: string[];
  };
  previewUrl?: string;
}

const quickSuggestions = [
  "Create a marketing project request form that captures project name, budget, timeline, and key stakeholders",
  "Build an IT support ticket form with priority levels, affected systems, and business impact",
  "Design a vendor onboarding form with company info, services, and compliance documents",
  "Make an event planning request form with venue, catering, and AV requirements",
  "Create a training request form with business justification and success metrics"
];

const ConversationMessage: React.FC<{ message: ConversationMessage }> = ({ message }) => {
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-4xl ${message.type === 'user' ? 'bg-blue-600' : 'bg-slate-700'} rounded-lg p-4`}>
        <div className="flex items-start space-x-3">
          {message.type === 'ai' && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          
          <div className="flex-1">
            <p className="text-white text-sm leading-relaxed">{message.message}</p>
            
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-slate-300 text-xs mb-2">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-600 text-slate-200"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      {suggestion}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {message.nextSteps && message.nextSteps.length > 0 && (
              <div className="mt-3">
                <p className="text-slate-300 text-xs mb-2">Next steps:</p>
                <div className="space-y-1">
                  {message.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-center text-xs text-slate-300">
                      <div className="w-1 h-1 bg-blue-400 rounded-full mr-2" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {message.type === 'user' && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-400">
            {message.timestamp.toLocaleTimeString()}
          </span>
          
          {message.data && (
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Form generated</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConfidenceIndicator: React.FC<{ confidence: number }> = ({ confidence }) => {
  const getColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-400 bg-green-400/20';
    if (conf >= 0.6) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-red-400 bg-red-400/20';
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getColor(confidence)}`}>
      <div className="w-2 h-2 rounded-full bg-current mr-1" />
      {Math.round(confidence * 100)}% confidence
    </div>
  );
};

export const NaturalLanguageDesigner: React.FC = () => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<GeneratedFormResult | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: 'Welcome to the AI Form Designer! I can help you create professional intake forms using natural language. Just describe what kind of form you need, and I\'ll generate it for you.',
      timestamp: new Date(),
      suggestions: [
        'Marketing project form',
        'IT support form',
        'Vendor onboarding form'
      ]
    }
  ]);
  const [currentStep, setCurrentStep] = useState<'describe' | 'preview' | 'refine' | 'deploy'>('describe');

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: description,
      timestamp: new Date()
    };
    
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      // Call the AI form generation API
      const response = await fetch('/api/pm/intake-designer/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          expectedComplexity: 'moderate',
          includeWorkflow: true,
          enableConditionalLogic: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate form');
      }

      const result: GeneratedFormResult = await response.json();
      setGeneratedForm(result);

      // Add AI response to conversation
      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: `I've generated a ${result.generationMetadata.complexity} intake form based on your description. The form has ${result.formStructure.fields?.length || 0} fields organized into ${result.formStructure.sections?.length || 0} sections with ${Math.round(result.confidence * 100)}% confidence.`,
        timestamp: new Date(),
        data: result,
        suggestions: result.suggestedImprovements.slice(0, 3),
        nextSteps: [
          'Preview the generated form',
          'Request refinements if needed',
          'Deploy the form when ready'
        ]
      };

      setConversationHistory(prev => [...prev, aiMessage]);
      setCurrentStep('preview');

    } catch (error) {
      console.error('Form generation failed:', error);
      
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: 'I encountered an issue generating your form. Please try rephrasing your description or check your connection.',
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setDescription('');
    }
  };

  const handleRefine = async (refinementRequest: string) => {
    if (!generatedForm) return;

    setIsGenerating(true);

    try {
      const response = await fetch('/api/pm/intake-designer/temp/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          existingForm: generatedForm,
          refinementRequest
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refine form');
      }

      const refinedForm: GeneratedFormResult = await response.json();
      setGeneratedForm(refinedForm);

      // Add refinement conversation
      const userMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'user',
        message: refinementRequest,
        timestamp: new Date()
      };

      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: 'I\'ve applied your requested changes to the form. You can preview the updated version below.',
        timestamp: new Date(),
        data: refinedForm
      };

      setConversationHistory(prev => [...prev, userMessage, aiMessage]);

    } catch (error) {
      console.error('Form refinement failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async (deploymentOptions: any) => {
    if (!generatedForm) return;

    try {
      const response = await fetch('/api/pm/intake-designer/temp/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formStructure: generatedForm.formStructure,
          ...deploymentOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deploy form');
      }

      const result = await response.json();
      
      const deployMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'ai',
        message: `🚀 Your form has been successfully deployed! It's now live and accepting submissions at: ${result.publicUrl}`,
        timestamp: new Date(),
        nextSteps: [
          'Share the form URL with your team',
          'Monitor submissions in the dashboard',
          'Set up integrations if needed'
        ]
      };

      setConversationHistory(prev => [...prev, deployMessage]);
      setCurrentStep('deploy');

    } catch (error) {
      console.error('Form deployment failed:', error);
    }
  };

  const startNewForm = () => {
    setGeneratedForm(null);
    setCurrentStep('describe');
    setDescription('');
    
    const newFormMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'ai',
      message: 'Ready to create another form! What would you like to build next?',
      timestamp: new Date(),
      suggestions: ['Different department form', 'Enhanced version', 'New use case']
    };
    
    setConversationHistory(prev => [...prev, newFormMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Form Designer</h1>
                <p className="text-slate-400">Create intake forms with natural language</p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className={`flex items-center space-x-2 ${currentStep === 'describe' ? 'text-blue-400' : 'text-slate-500'}`}>
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Describe</span>
              </div>
              <div className="w-8 h-px bg-slate-600"></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-blue-400' : 'text-slate-500'}`}>
                <Eye className="w-4 h-4" />
                <span className="text-sm">Preview</span>
              </div>
              <div className="w-8 h-px bg-slate-600"></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'refine' ? 'text-blue-400' : 'text-slate-500'}`}>
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Refine</span>
              </div>
              <div className="w-8 h-px bg-slate-600"></div>
              <div className={`flex items-center space-x-2 ${currentStep === 'deploy' ? 'text-blue-400' : 'text-slate-500'}`}>
                <Rocket className="w-4 h-4" />
                <span className="text-sm">Deploy</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Conversation Interface */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">Conversation</h3>
                {generatedForm && (
                  <Button 
                    onClick={startNewForm} 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    New Form
                  </Button>
                )}
              </div>

              {/* Conversation History */}
              <div className="h-96 overflow-y-auto mb-6 space-y-4">
                {conversationHistory.map(message => (
                  <ConversationMessage key={message.id} message={message} />
                ))}
                
                {isGenerating && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-slate-700 rounded-lg p-4 max-w-xs">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Generating your form...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                {!generatedForm && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-300">Quick Suggestions:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {quickSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setDescription(suggestion)}
                            className="text-left p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-600 pt-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Or describe your own:</h4>
                      <div className="flex space-x-2">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe your intake form needs...

Example: 'Create a project intake form for our marketing department. I need to capture the project name, a brief description, the requested completion date, the primary business goal, and the estimated budget.'"
                          className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                          disabled={isGenerating}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <span className="text-xs text-slate-500">
                          {description.length}/500 characters
                        </span>
                        <Button
                          onClick={handleGenerate}
                          disabled={!description.trim() || isGenerating || description.length < 10}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Form
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {generatedForm && currentStep !== 'deploy' && (
                  <RefinementInterface 
                    form={generatedForm}
                    onRefine={handleRefine}
                    isProcessing={isGenerating}
                  />
                )}
              </div>
            </div>

            {/* Form Preview/Results */}
            <div className="space-y-6">
              {generatedForm && (
                <>
                  {/* Form Metadata */}
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">Generated Form</h3>
                      <ConfidenceIndicator confidence={generatedForm.confidence} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Fields:</span>
                        <span className="text-white ml-2">{generatedForm.formStructure.fields?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Sections:</span>
                        <span className="text-white ml-2">{generatedForm.formStructure.sections?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Complexity:</span>
                        <span className="text-white ml-2 capitalize">{generatedForm.generationMetadata.complexity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Time:</span>
                        <span className="text-white ml-2">{generatedForm.generationMetadata.processingTime}ms</span>
                      </div>
                    </div>

                    {generatedForm.suggestedImprovements.length > 0 && (
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Suggestions:</h4>
                        <ul className="text-xs text-amber-300 space-y-1">
                          {generatedForm.suggestedImprovements.slice(0, 3).map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                              <Lightbulb className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentStep('preview')}
                        className={currentStep === 'preview' ? 'bg-blue-600 text-white' : ''}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentStep('refine')}
                        className={currentStep === 'refine' ? 'bg-blue-600 text-white' : ''}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Refine
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentStep('deploy')}
                        className={currentStep === 'deploy' ? 'bg-blue-600 text-white' : ''}
                      >
                        <Rocket className="w-4 h-4 mr-1" />
                        Deploy
                      </Button>
                    </div>
                  </div>

                  {/* Dynamic Content Based on Step */}
                  {currentStep === 'preview' && (
                    <AIFormPreview form={generatedForm} />
                  )}

                  {currentStep === 'deploy' && (
                    <DeploymentOptions 
                      form={generatedForm}
                      onDeploy={handleDeploy}
                    />
                  )}
                </>
              )}

              {!generatedForm && (
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-300 mb-2">Ready to Create</h3>
                  <p className="text-slate-500 mb-4">
                    Describe your ideal intake form, and I'll generate it for you in seconds.
                  </p>
                  <div className="text-sm text-slate-600">
                    <p>✨ Natural language processing</p>
                    <p>🎯 Smart field detection</p>
                    <p>⚡ Instant generation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
