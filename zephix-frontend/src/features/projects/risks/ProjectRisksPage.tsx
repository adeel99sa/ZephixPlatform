/**
 * Phase 7: Project Risks Page
 * List view of all project risks
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi, Risk } from '../../projects/projects.api';
import { Shield, AlertTriangle } from 'lucide-react';

export default function ProjectRisksPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadRisks();
    }
  }, [id]);

  const loadRisks = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const risksData = await projectsApi.getProjectRisks(id);
      setRisks(risksData);
    } catch (err: any) {
      console.error('Failed to load risks:', err);
      setError(err?.response?.data?.message || 'Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="project-risks-root">
        <div className="text-center py-12 text-gray-500">Loading risks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="project-risks-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading risks</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="project-risks-root">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Risks</h1>
      </div>

      {risks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No risks found for this project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{risk.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(risk.severity)}`}>
                      {risk.severity}
                    </span>
                    {risk.source && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {risk.source}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Type: {risk.type}</span>
                    <span>Status: {risk.status}</span>
                    <span>Detected: {formatDate(risk.detectedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: Risk editing will be available in a future update.</p>
      </div>
    </div>
  );
}

