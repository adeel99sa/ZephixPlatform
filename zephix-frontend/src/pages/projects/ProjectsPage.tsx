import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/app/layout/PageHeader';
import { SkeletonList } from '@/app/ui/Skeleton';
import { EmptyState } from '@/app/ui/EmptyState';
import { ErrorBanner } from '@/app/ui/ErrorBanner';
import { useProjects } from '@/features/projects/useProjects';
import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';

const ProjectsPage: React.FC = () => {
  const { data, loading, error, refetch } = useProjects();
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      // TODO: Implement delete using the new API client
      // await api.delete(`/projects/${id}`);
      // refetch(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        description="Manage your initiatives and track portfolio progress."
        actions={
          <button
            onClick={() => setShowCreatePanel(true)}
            className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
          >
            Create Project
          </button>
        }
      />

      {loading && <SkeletonList rows={6} />}

      {!loading && error && (
        <ErrorBanner
          title="Couldn't load projects"
          detail={error.message}
          onRetry={refetch}
        />
      )}

      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          title="No projects yet"
          description="Create your first project to populate analytics and dashboard widgets."
          action={
            <button
              onClick={() => setShowCreatePanel(true)}
              className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
            >
              Create Project
            </button>
          }
        />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Link 
                      to={`/projects/${p.id}`} 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">—</td>
                  <td className="px-4 py-3 text-sm text-gray-700">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => {
          setShowCreatePanel(false);
          refetch(); // Refresh the list
        }}
      />
    </div>
  );
};

export default ProjectsPage;