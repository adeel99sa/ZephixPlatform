import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { Zap, Building2, ArrowRight } from 'lucide-react';

export default function CreateFirstWorkspacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Workspace name must be at least 2 characters');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await api.post('/workspaces', { name: name.trim(), slug });
      navigate(`/w/${slug}/home`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create workspace. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    navigate('/home', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Welcome to Zephix{user?.firstName ? `, ${user.firstName}` : ''}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your organization is ready. Create your first workspace to start managing projects.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow sm:rounded-lg">
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-indigo-900">What is a workspace?</h3>
            <p className="mt-1 text-sm text-indigo-700">
              A workspace is a dedicated space for your team. It contains projects, tasks, and KPIs.
              You can create multiple workspaces to organize by department, client, or initiative.
              Team members are invited to specific workspaces with their own roles and permissions.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700">
                Workspace Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="workspaceName"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g. Engineering, Marketing, Product"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Workspace'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
