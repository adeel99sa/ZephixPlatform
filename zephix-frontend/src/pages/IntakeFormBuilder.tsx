import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { FormBuilder } from '../components/intake/FormBuilder';
import { FormPreview } from '../components/intake/FormPreview';
import { FormSettings } from '../components/intake/FormSettings';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { IntakeForm } from '../types/workflow';
import { intakeFormService } from '../services/workflowService';
import { 
  Save, 
  Eye, 
  Settings, 
  Globe, 
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Share
} from 'lucide-react';

export const IntakeFormBuilder: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<IntakeForm | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isEditing && id) {
      loadForm(id);
    } else {
      // Create new form
      setForm({
        id: '',
        organizationId: '',
        name: 'New Intake Form',
        slug: 'new-intake-form',
        description: '',
        thankYouMessage: 'Thank you for your submission! We will review it and get back to you soon.',
        formSchema: {
          fields: [
            {
              id: 'title',
              label: 'Request Title',
              type: 'text',
              required: true,
              placeholder: 'Enter a descriptive title for your request',
            },
            {
              id: 'description',
              label: 'Description',
              type: 'textarea',
              required: true,
              placeholder: 'Provide details about your request',
            },
            {
              id: 'priority',
              label: 'Priority',
              type: 'select',
              required: true,
              options: ['Low', 'Medium', 'High', 'Urgent'],
            }
          ],
          sections: [
            {
              id: 'basic_info',
              title: 'Basic Information',
              fields: ['title', 'description', 'priority'],
            }
          ],
          layout: 'single_column',
          styling: {
            theme: 'default',
            primaryColor: '#3B82F6',
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
          },
        },
        targetWorkflowId: undefined,
        isPublic: true,
        isActive: true,
        settings: {
          requireLogin: false,
          allowAnonymous: true,
          confirmationMessage: 'Thank you for your submission!',
          emailNotifications: [],
        },
        analytics: {
          totalViews: 0,
          totalSubmissions: 0,
          conversionRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [id, isEditing]);

  const loadForm = async (formId: string) => {
    try {
      setLoading(true);
      const loadedForm = await intakeFormService.getFormById(formId);
      setForm(loadedForm);
    } catch (error) {
      console.error('Failed to load form:', error);
      setErrors(['Failed to load form']);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;

    const validation = validateForm(form);
    if (validation.length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setSaving(true);
      setErrors([]);

      if (isEditing) {
        const updatedForm = await intakeFormService.updateForm(form.id, form);
        setForm(updatedForm);
      } else {
        const newForm = await intakeFormService.createForm(form);
        setForm(newForm);
        navigate(`/intake-forms/${newForm.id}/edit`);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      setErrors(['Failed to save form']);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handlePublish = async () => {
    if (!form) return;

    try {
      const updatedForm = await intakeFormService.updateForm(form.id, {
        ...form,
        isActive: true,
        isPublic: true,
      });
      setForm(updatedForm);
    } catch (error) {
      console.error('Failed to publish form:', error);
    }
  };

  const handleFormUpdate = (updates: Partial<IntakeForm>) => {
    if (!form) return;

    setForm({
      ...form,
      ...updates,
    });
  };

  const validateForm = (form: IntakeForm): string[] => {
    const errors: string[] = [];

    if (!form.name.trim()) {
      errors.push('Form name is required');
    }

    if (!form.slug.trim()) {
      errors.push('Form slug is required');
    }

    if (form.formSchema.fields.length === 0) {
      errors.push('At least one field is required');
    }

    if (form.formSchema.sections.length === 0) {
      errors.push('At least one section is required');
    }

    // Check for duplicate field IDs
    const fieldIds = form.formSchema.fields.map(f => f.id);
    const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate field IDs found: ${duplicateIds.join(', ')}`);
    }

    return errors;
  };

  const getFieldCount = () => form?.formSchema.fields.length || 0;
  const getSectionCount = () => form?.formSchema.sections.length || 0;
  const getPublicUrl = () => form ? `/intake/${form.slug}` : '';

  if (loading) {
    return (
      <MainLayout currentPage="Form Builder">
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!form) {
    return (
      <MainLayout currentPage="Form Builder">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Form Not Found</h2>
            <p className="text-slate-400 mb-4">The intake form could not be loaded.</p>
            <Button onClick={() => navigate('/intake-forms')}>
              Back to Forms
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="Form Builder">
      <div className="flex h-screen bg-slate-950">
        {/* Left Sidebar - Form Settings */}
        <div className={`transition-all duration-300 ${showSettings ? 'w-80' : 'w-16'} bg-slate-900 border-r border-slate-700 flex flex-col`}>
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              {showSettings && (
                <h3 className="text-sm font-medium text-white">Form Settings</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showSettings && (
            <div className="flex-1 overflow-y-auto p-4">
              <FormSettings form={form} onUpdate={handleFormUpdate} />
            </div>
          )}

          {!showSettings && (
            <div className="flex-1 flex flex-col items-center pt-4 space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/intake-forms')}
                title="Back to Forms"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Canvas - Form Builder */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{form.name}</h1>
                <div className="flex items-center space-x-4 mt-2 text-sm text-slate-400">
                  <span>{getFieldCount()} fields</span>
                  <span>•</span>
                  <span>{getSectionCount()} sections</span>
                  <span>•</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {form.isPublic && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Public
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {errors.length > 0 && (
                  <div className="flex items-center text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.length} error{errors.length !== 1 ? 's' : ''}
                  </div>
                )}

                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Form
                </Button>

                {form.isActive && form.isPublic && (
                  <Button variant="secondary" onClick={() => window.open(getPublicUrl(), '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live
                  </Button>
                )}

                {!form.isActive && (
                  <Button onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
                    <Globe className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                )}
              </div>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <h4 className="text-sm font-medium text-red-400 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-300 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Public URL */}
            {form.isPublic && form.slug && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-1">Public Form URL</h4>
                    <p className="text-sm text-blue-300 font-mono">{window.location.origin}{getPublicUrl()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}${getPublicUrl()}`)}
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto">
            {previewMode ? (
              <FormPreview form={form} />
            ) : (
              <FormBuilder form={form} onUpdate={handleFormUpdate} />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
