import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IntakeForm } from '../types/workflow';
import { intakeFormService } from '../services/workflowService';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FormPreview } from '../components/intake/FormPreview';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const PublicIntakeForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadForm(slug);
    }
  }, [slug]);

  const loadForm = async (formSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const loadedForm = await intakeFormService.getPublicForm(formSlug);
      setForm(loadedForm);
    } catch (err: any) {
      console.error('Failed to load form:', err);
      setError(err.message || 'Form not found or not accessible');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-400">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Form Not Available</h2>
          <p className="text-slate-400 mb-6">
            {error || 'The requested form could not be found or is not currently available.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit Zephix
          </a>
        </div>
      </div>
    );
  }

  if (!form.isActive || !form.isPublic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Form Unavailable</h2>
          <p className="text-slate-400 mb-6">
            This form is currently disabled or not available for public submissions.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit Zephix
          </a>
        </div>
      </div>
    );
  }

  return <FormPreview form={form} testMode={false} />;
};
