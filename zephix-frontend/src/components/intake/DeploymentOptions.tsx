import React, { useState } from 'react';
import { 
  Rocket, 
  Globe, 
  Lock, 
  Settings, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Users,
  Bell,
  Zap,
  Link,
  Code
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

interface DeploymentOptionsProps {
  form: GeneratedFormResult;
  onDeploy: (options: DeploymentConfig) => Promise<void>;
}

interface DeploymentConfig {
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  isActive: boolean;
  settings: {
    requireLogin: boolean;
    allowAnonymous: boolean;
    confirmationMessage: string;
    redirectUrl?: string;
    emailNotifications: string[];
    integrations?: {
      slackWebhook?: string;
      teamsWebhook?: string;
    };
  };
}

const DeploymentStep: React.FC<{
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  isCompleted: boolean;
}> = ({ number, title, description, icon: Icon, isActive, isCompleted }) => {
  return (
    <div className={`flex items-start space-x-4 p-4 rounded-lg transition-colors ${
      isActive ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-slate-700/30'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-slate-600'
      }`}>
        {isCompleted ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : (
          <span className="text-white text-sm font-medium">{number}</span>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
          <h4 className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
            {title}
          </h4>
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
};

const FormSettings: React.FC<{
  config: DeploymentConfig;
  onChange: (config: DeploymentConfig) => void;
}> = ({ config, onChange }) => {
  const handleChange = (field: string, value: any) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const handleSettingsChange = (field: string, value: any) => {
    onChange({
      ...config,
      settings: {
        ...config.settings,
        [field]: value
      }
    });
  };

  const handleEmailsChange = (emailsString: string) => {
    const emails = emailsString.split(',').map(email => email.trim()).filter(Boolean);
    handleSettingsChange('emailNotifications', emails);
  };

  const handleIntegrationChange = (integration: string, value: string) => {
    onChange({
      ...config,
      settings: {
        ...config.settings,
        integrations: {
          ...config.settings.integrations,
          [integration]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Basic Configuration
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Form Name *
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="AI Generated Marketing Form"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              URL Slug
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">/intake/</span>
              <input
                type="text"
                value={config.slug}
                onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="marketing-project-form"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Form description for internal reference"
          />
        </div>
      </div>

      {/* Access Control */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Lock className="w-4 h-4 mr-2" />
          Access Control
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-sm text-slate-300">Public Access</span>
                <p className="text-xs text-slate-500">Anyone with the link can access the form</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.isPublic}
              onChange={(e) => handleChange('isPublic', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-sm text-slate-300">Require Login</span>
                <p className="text-xs text-slate-500">Users must be logged in to submit</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.settings.requireLogin}
              onChange={(e) => handleSettingsChange('requireLogin', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Eye className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-sm text-slate-300">Allow Anonymous</span>
                <p className="text-xs text-slate-500">Accept submissions without user accounts</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.settings.allowAnonymous}
              onChange={(e) => handleSettingsChange('allowAnonymous', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white">Confirmation Settings</h4>
        
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Thank You Message
          </label>
          <textarea
            value={config.settings.confirmationMessage}
            onChange={(e) => handleSettingsChange('confirmationMessage', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Thank you for your submission! We'll get back to you soon."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Redirect URL (optional)
          </label>
          <input
            type="url"
            value={config.settings.redirectUrl || ''}
            onChange={(e) => handleSettingsChange('redirectUrl', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://yoursite.com/thank-you"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Bell className="w-4 h-4 mr-2" />
          Notifications
        </h4>
        
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Email Notifications (comma-separated)
          </label>
          <input
            type="text"
            value={config.settings.emailNotifications.join(', ')}
            onChange={(e) => handleEmailsChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@company.com, manager@company.com"
          />
          <p className="text-xs text-slate-500 mt-1">
            These emails will be notified when new submissions are received
          </p>
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Zap className="w-4 h-4 mr-2" />
          Integrations
        </h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={config.settings.integrations?.slackWebhook || ''}
              onChange={(e) => handleIntegrationChange('slackWebhook', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Microsoft Teams Webhook URL
            </label>
            <input
              type="url"
              value={config.settings.integrations?.teamsWebhook || ''}
              onChange={(e) => handleIntegrationChange('teamsWebhook', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://outlook.office.com/webhook/..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeploymentOptions: React.FC<DeploymentOptionsProps> = ({ form, onDeploy }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<{
    success: boolean;
    formId?: string;
    publicUrl?: string;
    error?: string;
  } | null>(null);
  
  const [config, setConfig] = useState<DeploymentConfig>({
    name: 'AI Generated Form',
    description: 'Form generated using AI assistance',
    slug: 'ai-generated-form',
    isPublic: true,
    isActive: true,
    settings: {
      requireLogin: false,
      allowAnonymous: true,
      confirmationMessage: 'Thank you for your submission! We\'ll get back to you soon.',
      emailNotifications: []
    }
  });

  const steps = [
    {
      number: 1,
      title: 'Configure Settings',
      description: 'Set up form name, access controls, and notifications',
      icon: Settings
    },
    {
      number: 2,
      title: 'Review & Deploy',
      description: 'Final review and deployment to production',
      icon: Rocket
    },
    {
      number: 3,
      title: 'Share & Monitor',
      description: 'Get your form URL and monitor submissions',
      icon: Globe
    }
  ];

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      await onDeploy(config);
      
      // Simulate deployment result
      setDeploymentResult({
        success: true,
        formId: 'form_' + Date.now(),
        publicUrl: `/intake/${config.slug}`
      });
      
      setCurrentStep(3);
    } catch (error) {
      setDeploymentResult({
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCopyUrl = async () => {
    if (deploymentResult?.publicUrl) {
      await navigator.clipboard.writeText(window.location.origin + deploymentResult.publicUrl);
      // TODO: Show toast notification
    }
  };

  const isConfigValid = config.name.trim().length > 0 && config.slug.trim().length > 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-white">Deploy Your Form</h3>
        <div className="text-sm text-slate-400">
          Step {currentStep} of 3
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-8">
        {steps.map((step) => (
          <DeploymentStep
            key={step.number}
            number={step.number}
            title={step.title}
            description={step.description}
            icon={step.icon}
            isActive={currentStep === step.number}
            isCompleted={currentStep > step.number}
          />
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <FormSettings config={config} onChange={setConfig} />
          
          <div className="flex justify-between">
            <div className="text-xs text-slate-500">
              Configure your form settings before deployment
            </div>
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!isConfigValid}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Deployment Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Deployment Summary</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Form Name:</span>
                <span className="text-white ml-2">{config.name}</span>
              </div>
              <div>
                <span className="text-slate-400">URL:</span>
                <span className="text-white ml-2">/intake/{config.slug}</span>
              </div>
              <div>
                <span className="text-slate-400">Access:</span>
                <span className="text-white ml-2">
                  {config.isPublic ? 'Public' : 'Private'}
                  {config.settings.requireLogin && ' (Login Required)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Notifications:</span>
                <span className="text-white ml-2">
                  {config.settings.emailNotifications.length} email(s)
                </span>
              </div>
            </div>
          </div>

          {/* Pre-deployment Checklist */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Pre-deployment Checklist
            </h4>
            <div className="space-y-2 text-sm text-blue-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3" />
                <span>Form structure validated</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3" />
                <span>Field validation rules applied</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3" />
                <span>Workflow configuration ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3" />
                <span>Access controls configured</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
            >
              Back to Settings
            </Button>
            
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDeploying ? (
                <>
                  <Rocket className="w-4 h-4 mr-2 animate-bounce" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Form
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6">
          {deploymentResult?.success ? (
            <>
              {/* Success Message */}
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">🚀 Form Deployed Successfully!</h4>
                <p className="text-slate-400">Your AI-generated form is now live and ready to accept submissions.</p>
              </div>

              {/* Form URL */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center">
                  <Link className="w-4 h-4 mr-2" />
                  Your Form URL
                </h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-slate-800 rounded text-green-300 text-sm">
                    {window.location.origin}{deploymentResult.publicUrl}
                  </code>
                  <Button size="sm" onClick={handleCopyUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <h5 className="text-sm font-medium text-white mb-1">Share with Team</h5>
                  <p className="text-xs text-slate-400">Send the form URL to your team members</p>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <Bell className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <h5 className="text-sm font-medium text-white mb-1">Monitor Submissions</h5>
                  <p className="text-xs text-slate-400">Track submissions in your dashboard</p>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                  <Settings className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h5 className="text-sm font-medium text-white mb-1">Configure Workflows</h5>
                  <p className="text-xs text-slate-400">Set up approval processes and integrations</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center space-x-4">
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Form
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Settings
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Code className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Deployment Failed</h4>
              <p className="text-slate-400 mb-4">{deploymentResult?.error}</p>
              <Button
                onClick={() => setCurrentStep(2)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
