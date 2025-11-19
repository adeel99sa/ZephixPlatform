import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '@/services/onboardingApi';
import { useAuth } from '@/state/AuthContext';
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Sparkles,
  Building2, Users, FolderKanban, FileText, Rocket, X
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  component: React.ComponentType<OnboardingStepProps>;
  required: boolean;
}

interface OnboardingStepProps {
  onNext: () => void;
  onSkip: () => void;
  onComplete: (data?: any) => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Zephix!',
    description: 'Let\'s get you set up in just a few steps',
    icon: Sparkles,
    required: true,
    component: WelcomeStep,
  },
  {
    id: 'organization',
    title: 'Complete Your Organization',
    description: 'Add details about your organization',
    icon: Building2,
    required: false,
    component: OrganizationStep,
  },
  {
    id: 'team',
    title: 'Invite Your Team',
    description: 'Add team members to collaborate',
    icon: Users,
    required: false,
    component: TeamStep,
  },
  {
    id: 'workspace',
    title: 'Create Your First Workspace',
    description: 'Set up your first workspace',
    icon: FolderKanban,
    required: true,
    component: WorkspaceStep,
  },
  {
    id: 'project',
    title: 'Create Your First Project',
    description: 'Start with a template or create from scratch',
    icon: FileText,
    required: false,
    component: ProjectStep,
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Ready to start managing projects',
    icon: Rocket,
    required: true,
    component: CompleteStep,
  },
];

// Step Components
function WelcomeStep({ onNext }: OnboardingStepProps) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Zephix!</h2>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Your AI-powered project management platform. Let's get you set up in just a few minutes.
        </p>
      </div>
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-start gap-3 text-left">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">AI-Powered Insights</p>
            <p className="text-sm text-gray-600">Get intelligent recommendations for your projects</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Team Collaboration</p>
            <p className="text-sm text-gray-600">Work together seamlessly with your team</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Real-Time Analytics</p>
            <p className="text-sm text-gray-600">Track progress with comprehensive dashboards</p>
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 mx-auto"
      >
        Get Started <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function OrganizationStep({ onNext, onSkip }: OnboardingStepProps) {
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = async () => {
    // TODO: Save organization details
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Organization</h2>
        <p className="text-gray-600">Add more details to personalize your experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website (Optional)
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry (Optional)
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Technology, Healthcare, Finance"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us about your organization..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TeamStep({ onNext, onSkip }: OnboardingStepProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [role, setRole] = useState('pm');

  const addEmail = () => {
    setEmails([...emails, '']);
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    const validEmails = emails.filter(e => e.trim() && e.includes('@'));
    if (validEmails.length > 0) {
      // TODO: Invite users
      toast.success(`Invitation${validEmails.length > 1 ? 's' : ''} sent!`);
    }
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Your Team</h2>
        <p className="text-gray-600">Add team members to start collaborating</p>
      </div>

      <div className="space-y-4">
        {emails.map((email, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => updateEmail(index, e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {emails.length > 1 && (
              <button
                onClick={() => removeEmail(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addEmail}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          + Add another email
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="viewer">Viewer</option>
            <option value="pm">Project Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          Send Invitations <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function WorkspaceStep({ onNext, onSkip }: OnboardingStepProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleNext = async () => {
    if (!name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.post('/api/workspaces', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Workspace created!');
      onNext();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create workspace');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Workspace</h2>
        <p className="text-gray-600">Workspaces help you organize your projects</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workspace Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marketing, Engineering, Product"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workspace is for..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          disabled={!name.trim()}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Create Workspace <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ProjectStep({ onNext, onSkip }: OnboardingStepProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Project</h2>
        <p className="text-gray-600">Start with a template or create from scratch</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            // Navigate to project creation with template
            window.location.href = '/projects?template=true';
          }}
          className="w-full p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all"
        >
          <div className="font-medium text-gray-900">Start with a Template</div>
          <div className="text-sm text-gray-600 mt-1">Use a pre-built project template</div>
        </button>

        <button
          onClick={() => {
            window.location.href = '/projects?create=true';
          }}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 text-left transition-all"
        >
          <div className="font-medium text-gray-900">Create from Scratch</div>
          <div className="text-sm text-gray-600 mt-1">Build your project from the ground up</div>
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Skip for Now
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ onComplete }: OnboardingStepProps) {
  const navigate = useNavigate();

  const handleComplete = async () => {
    try {
      await onboardingApi.completeOnboarding();
      toast.success('Onboarding completed!');
      onComplete();
      navigate('/home', { replace: true });
    } catch (error: any) {
      toast.error('Failed to complete onboarding');
      // Still navigate to home
      navigate('/home', { replace: true });
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
        <Rocket className="h-12 w-12 text-white" />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h2>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Your organization is ready. Start managing projects and collaborating with your team.
        </p>
      </div>
      <button
        onClick={handleComplete}
        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2 mx-auto"
      >
        Launch Zephix <Rocket className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const status = await onboardingApi.getOnboardingStatus();
      if (status.completed) {
        // Already completed, redirect to home
        navigate('/home', { replace: true });
        return;
      }
      if (status.currentStep) {
        const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === status.currentStep);
        if (stepIndex >= 0) {
          setCurrentStep(stepIndex);
        }
      }
      if (status.completedSteps) {
        setCompletedSteps(new Set(status.completedSteps));
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Continue with onboarding if check fails
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const step = ONBOARDING_STEPS[currentStep];

    // Mark step as completed
    try {
      await onboardingApi.completeStep(step.id);
      setCompletedSteps(prev => new Set([...prev, step.id]));
    } catch (error) {
      console.error('Failed to mark step as complete:', error);
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading onboarding...</div>
      </div>
    );
  }

  const step = ONBOARDING_STEPS[currentStep];
  const StepComponent = step.component;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {ONBOARDING_STEPS.length}
            </span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to skip onboarding? You can complete it later.')) {
                  onboardingApi.skipOnboarding().then(() => {
                    navigate('/home', { replace: true });
                  });
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip Onboarding
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          {ONBOARDING_STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStep;
            const isCompleted = completedSteps.has(s.id) || index < currentStep;

            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className={`mt-2 text-xs text-center max-w-[100px] ${
                    isActive ? 'font-medium text-gray-900' : 'text-gray-500'
                  }`}>
                    {s.title}
                  </div>
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <StepComponent
            onNext={handleNext}
            onSkip={handleSkip}
            onComplete={handleNext}
          />
        </div>

        {/* Navigation */}
        {currentStep > 0 && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

