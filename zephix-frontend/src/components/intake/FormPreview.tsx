import React, { useState } from 'react';
import { FormPreviewProps, IntakeForm } from '../../types/workflow';
import { Button } from '../ui/Button';
import { 
  Send, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  Mail,
  Phone,
  Link
} from 'lucide-react';

const FormFieldRenderer: React.FC<{
  field: any;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onChange(files);
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
            rows={4}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    if (e.target.checked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">{option}</span>
              </label>
            ))}
          </div>
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
          <div>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {value && value.length > 0 && (
              <div className="mt-2 space-y-1">
                {value.map((file: File, index: number) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span>({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

  const getFieldIcon = () => {
    switch (field.type) {
      case 'email': return <Mail className="w-4 h-4 text-slate-400" />;
      case 'phone': return <Phone className="w-4 h-4 text-slate-400" />;
      case 'url': return <Link className="w-4 h-4 text-slate-400" />;
      case 'date': return <Calendar className="w-4 h-4 text-slate-400" />;
      case 'file': return <Upload className="w-4 h-4 text-slate-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        <div className="flex items-center space-x-2">
          {getFieldIcon()}
          <span>{field.label}</span>
          {field.required && <span className="text-red-400">*</span>}
        </div>
      </label>
      
      {renderField()}
      
      {field.helpText && (
        <p className="text-xs text-slate-500">{field.helpText}</p>
      )}
      
      {error && (
        <div className="flex items-center space-x-1 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export const FormPreview: React.FC<FormPreviewProps> = ({ 
  form, 
  testMode = false 
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    form.formSchema.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Additional validation based on field type
      const value = formData[field.id];
      if (value && field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      if (value && field.type === 'url') {
        try {
          new URL(value);
        } catch {
          newErrors[field.id] = 'Please enter a valid URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (testMode) {
        // Simulate submission delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSubmitted(true);
      } else {
        // In a real app, this would submit to the API
        console.log('Form submission:', formData);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({});
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Thank You!</h2>
          <p className="text-slate-400 mb-6">
            {form.thankYouMessage || 'Your submission has been received. We will get back to you soon.'}
          </p>
          {testMode && (
            <Button onClick={handleReset} variant="outline">
              Submit Another Response
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Form Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-slate-400">{form.description}</p>
            )}
            {testMode && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-4">
                Preview Mode - Form submissions will not be saved
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.formSchema.sections.map((section) => (
                <div key={section.id} className="space-y-6">
                  {section.title && (
                    <div className="border-b border-slate-700 pb-2">
                      <h3 className="text-lg font-medium text-white">{section.title}</h3>
                      {section.description && (
                        <p className="text-sm text-slate-400 mt-1">{section.description}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-6">
                    {section.fields.map((fieldId) => {
                      const field = form.formSchema.fields.find(f => f.id === fieldId);
                      if (!field) return null;

                      return (
                        <FormFieldRenderer
                          key={field.id}
                          field={field}
                          value={formData[field.id]}
                          onChange={(value) => handleFieldChange(field.id, value)}
                          error={errors[field.id]}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Submit Button */}
              <div className="pt-6 border-t border-slate-700">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Form Info */}
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>
              Powered by Zephix • 
              {form.settings.requireLogin ? ' Login required' : ' No login required'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
