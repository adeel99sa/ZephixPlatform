import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckIcon,
  BuildingOfficeIcon as BuildingIcon,
  CodeBracketIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { useProjectStore } from '../../stores/projectStore';
import { useOrganizationStore } from '../../stores/organizationStore';

// Enhanced project creation data structure
const enhancedProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Please provide a detailed description'),
  template: z.enum(['marketing', 'software', 'infrastructure', 'research', 'custom']),
  methodology: z.enum(['agile', 'waterfall', 'hybrid']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  department: z.string().min(1, 'Department is required'),
  stakeholders: z.array(z.string()).min(1, 'Please select at least one stakeholder'),
});

type EnhancedProjectData = z.infer<typeof enhancedProjectSchema>;

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  phases: string[];
  estimatedDuration: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface EnhancedCreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledData?: Partial<EnhancedProjectData>;
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'Multi-channel marketing campaigns with campaign planning, content creation, and performance tracking',
    icon: PaintBrushIcon,
    color: 'bg-pink-500',
    phases: ['Planning & Strategy', 'Creative Development', 'Campaign Launch', 'Performance Analysis'],
    estimatedDuration: '8-12 weeks'
  },
  {
    id: 'software',
    name: 'Software Development',
    description: 'Full-stack software projects with agile development methodology and continuous integration',
    icon: CodeBracketIcon,
    color: 'bg-blue-500',
    phases: ['Requirements Analysis', 'System Design', 'Development', 'Testing', 'Deployment'],
    estimatedDuration: '12-24 weeks'
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Project',
    description: 'IT infrastructure and system implementation projects with compliance and security focus',
    icon: ComputerDesktopIcon,
    color: 'bg-green-500',
    phases: ['Assessment', 'Architecture Design', 'Implementation', 'Testing & Validation'],
    estimatedDuration: '16-32 weeks'
  },
  {
    id: 'research',
    name: 'Research & Development',
    description: 'Research projects with hypothesis testing, data collection, and analysis phases',
    icon: MagnifyingGlassIcon,
    color: 'bg-purple-500',
    phases: ['Literature Review', 'Methodology Design', 'Data Collection', 'Analysis & Reporting'],
    estimatedDuration: '12-20 weeks'
  },
  {
    id: 'custom',
    name: 'Custom Project',
    description: 'Flexible project template for unique requirements with customizable phases and milestones',
    icon: CogIcon,
    color: 'bg-gray-500',
    phases: ['Planning', 'Execution', 'Monitoring', 'Closure'],
    estimatedDuration: 'Variable'
  }
];

const METHODOLOGY_OPTIONS = [
  {
    id: 'agile',
    name: 'Agile',
    description: 'Iterative development with sprints, daily standups, and continuous feedback',
    benefits: ['Flexible', 'Fast delivery', 'Customer collaboration']
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    description: 'Sequential phases with clear gates and comprehensive documentation',
    benefits: ['Predictable', 'Well-documented', 'Clear milestones']
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'Combination approach with structured planning and agile execution',
    benefits: ['Balanced', 'Adaptable', 'Best of both worlds']
  }
];

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Product',
  'Operations',
  'Finance',
  'Human Resources',
  'Customer Success',
  'Research & Development',
  'IT'
];

export const EnhancedCreateProjectModal: React.FC<EnhancedCreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledData
}) => {
  const { createProject, isLoading } = useProjectStore();
  const { currentOrganization } = useOrganizationStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // Mock team members - in real app, this would come from the organization store
  const [teamMembers] = useState<TeamMember[]>([
    { id: '1', name: 'John Doe', email: 'john@company.com', role: 'Engineering Manager', department: 'Engineering' },
    { id: '2', name: 'Sarah Smith', email: 'sarah@company.com', role: 'Product Manager', department: 'Product' },
    { id: '3', name: 'Mike Johnson', email: 'mike@company.com', role: 'Marketing Director', department: 'Marketing' },
    { id: '4', name: 'Lisa Brown', email: 'lisa@company.com', role: 'UX Designer', department: 'Design' },
    { id: '5', name: 'David Wilson', email: 'david@company.com', role: 'DevOps Engineer', department: 'Engineering' }
  ]);

  const totalSteps = 4;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger
  } = useForm<EnhancedProjectData>({
    resolver: zodResolver(enhancedProjectSchema),
    defaultValues: {
      template: 'software',
      methodology: 'agile',
      priority: 'medium',
      department: 'Engineering',
      stakeholders: [],
      ...prefilledData
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (prefilledData) {
      Object.entries(prefilledData).forEach(([key, value]) => {
        setValue(key as keyof EnhancedProjectData, value);
      });
    }
  }, [prefilledData, setValue]);

  const selectedTemplate = PROJECT_TEMPLATES.find(t => t.id === watchedValues.template);
  const selectedMethodology = METHODOLOGY_OPTIONS.find(m => m.id === watchedValues.methodology);

  const handleNext = async () => {
    let fieldsToValidate: (keyof EnhancedProjectData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['name', 'description'];
        break;
      case 2:
        fieldsToValidate = ['template', 'methodology'];
        break;
      case 3:
        fieldsToValidate = ['startDate', 'endDate', 'priority', 'department'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: EnhancedProjectData) => {
    setIsCreating(true);
    try {
      // Map priority from schema format to Project format
      const priorityMap: Record<string, 'High' | 'Medium' | 'Low'> = {
        critical: 'High',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      };

      // Create project with enhanced data
      const projectData = {
        name: data.name,
        budget: data.budget ?? 0,
        priority: priorityMap[data.priority] ?? 'Medium',
      };

      const success = await createProject(projectData);
      if (success) {
        reset();
        setCurrentStep(1);
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    reset();
    setCurrentStep(1);
    onClose();
  };

  const toggleStakeholder = (memberId: string) => {
    const currentStakeholders = watchedValues.stakeholders || [];
    const isSelected = currentStakeholders.includes(memberId);
    
    if (isSelected) {
      setValue('stakeholders', currentStakeholders.filter(id => id !== memberId));
    } else {
      setValue('stakeholders', [...currentStakeholders, memberId]);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
            step < currentStep 
              ? 'bg-indigo-600 border-indigo-600 text-white' 
              : step === currentStep
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-gray-300 text-gray-300 bg-white'
          }`}>
            {step < currentStep ? (
              <CheckIcon className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{step}</span>
            )}
          </div>
          {step < totalSteps && (
            <div className={`w-16 h-0.5 transition-colors ${
              step < currentStep ? 'bg-indigo-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Information</h3>
        <p className="text-sm text-gray-600">Let's start with the basics about your project</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name *
        </label>
        <input
          {...register('name')}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter a descriptive project name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Description *
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Describe the project goals, objectives, and key deliverables..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>
    </div>
  );

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Template & Methodology</h3>
        <p className="text-sm text-gray-600">Choose a template and methodology that fits your project</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Project Template</label>
        <div className="grid grid-cols-1 gap-4">
          {PROJECT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                onClick={() => setValue('template', template.id as any)}
                className={`relative rounded-lg border p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                  watchedValues.template === template.id
                    ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${template.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Duration:</span> {template.estimatedDuration}
                    </div>
                  </div>
                  {watchedValues.template === template.id && (
                    <CheckIcon className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">Methodology</label>
        <div className="grid grid-cols-1 gap-3">
          {METHODOLOGY_OPTIONS.map((methodology) => (
            <div
              key={methodology.id}
              onClick={() => setValue('methodology', methodology.id as any)}
              className={`rounded-lg border p-3 cursor-pointer transition-all hover:bg-gray-50 ${
                watchedValues.methodology === methodology.id
                  ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{methodology.name}</h4>
                  <p className="text-xs text-gray-600">{methodology.description}</p>
                </div>
                {watchedValues.methodology === methodology.id && (
                  <CheckIcon className="w-5 h-5 text-indigo-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProjectDetails = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Details</h3>
        <p className="text-sm text-gray-600">Set timeline, priority, and organizational details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
          <input
            {...register('startDate')}
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
          <input
            {...register('endDate')}
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
          <select
            {...register('priority')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
          <select
            {...register('department')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Budget (Optional)</label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            {...register('budget', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  );

  const renderStakeholderSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Team</h3>
        <p className="text-sm text-gray-600">Select team members and stakeholders for this project</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Stakeholders * ({watchedValues.stakeholders?.length || 0} selected)
        </label>
        <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => toggleStakeholder(member.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${
                watchedValues.stakeholders?.includes(member.id)
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-600">{member.role} • {member.department}</div>
                  </div>
                </div>
                {watchedValues.stakeholders?.includes(member.id) && (
                  <CheckIcon className="w-5 h-5 text-indigo-600" />
                )}
              </div>
            </div>
          ))}
        </div>
        {errors.stakeholders && (
          <p className="mt-1 text-sm text-red-600">{errors.stakeholders.message}</p>
        )}
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Create</h3>
        <p className="text-sm text-gray-600">Review your project details before creating</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Project Overview</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div><span className="font-medium">Name:</span> {watchedValues.name}</div>
            <div><span className="font-medium">Description:</span> {watchedValues.description}</div>
            <div><span className="font-medium">Template:</span> {selectedTemplate?.name}</div>
            <div><span className="font-medium">Methodology:</span> {selectedMethodology?.name}</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Timeline & Details</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div><span className="font-medium">Start Date:</span> {watchedValues.startDate}</div>
            <div><span className="font-medium">End Date:</span> {watchedValues.endDate}</div>
            <div><span className="font-medium">Priority:</span> {watchedValues.priority}</div>
            <div><span className="font-medium">Department:</span> {watchedValues.department}</div>
            {watchedValues.budget && (
              <div><span className="font-medium">Budget:</span> ${watchedValues.budget.toLocaleString()}</div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Team Members</h4>
          <div className="text-sm text-gray-600">
            {watchedValues.stakeholders?.map(id => {
              const member = teamMembers.find(m => m.id === id);
              return member ? (
                <div key={id} className="flex items-center space-x-2">
                  <span>•</span>
                  <span>{member.name} ({member.role})</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {selectedTemplate && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Project Phases</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {selectedTemplate.phases.map((phase, index) => (
                <div key={phase} className="flex items-center space-x-2">
                  <span className="text-indigo-600 font-medium">{index + 1}.</span>
                  <span>{phase}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderBasicInfo();
      case 2: return renderTemplateSelection();
      case 3: return renderProjectDetails();
      case 4: return renderReview();
      default: return renderBasicInfo();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Create New Project
                  </h3>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                {renderStepIndicator()}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {renderCurrentStep()}

                  <div className="flex justify-between pt-6 border-t border-gray-200">
                    <div>
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                        >
                          <ChevronLeftIcon className="w-4 h-4 mr-1 inline" />
                          Previous
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                      >
                        Cancel
                      </Button>
                      {currentStep < totalSteps ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                        >
                          Next
                          <ChevronRightIcon className="w-4 h-4 ml-1 inline" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          loading={isCreating}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          {isCreating ? 'Creating Project...' : 'Create Project'}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
