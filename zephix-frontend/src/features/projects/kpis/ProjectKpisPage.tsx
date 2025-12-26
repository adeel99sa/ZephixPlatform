/**
 * Phase 7: Project KPIs Page
 * List view of all project KPIs
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi, KPI } from '../../projects/projects.api';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

export default function ProjectKpisPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadKPIs();
    }
  }, [id]);

  const loadKPIs = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const kpisData = await projectsApi.getProjectKPIs(id);
      setKpis(kpisData);
    } catch (err: any) {
      console.error('Failed to load KPIs:', err);
      setError(err?.response?.data?.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getDirectionIcon = (direction?: string) => {
    if (direction === 'higher_is_better') {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (direction === 'lower_is_better') {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="project-kpis-root">
        <div className="text-center py-12 text-gray-500">Loading KPIs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="project-kpis-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading KPIs</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="project-kpis-root">
      <div className="mb-6 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">KPIs</h1>
      </div>

      {kpis.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No KPIs found for this project.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200" data-testid="project-kpis-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {kpis.map((kpi) => (
                <tr key={kpi.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{kpi.metricType}</div>
                    {kpi.notes && (
                      <div className="text-xs text-gray-500 mt-1">{kpi.notes.substring(0, 50)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {kpi.metricCategory}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kpi.metricValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {kpi.metricMetadata?.target?.toLocaleString() || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {kpi.metricUnit || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {getDirectionIcon(kpi.metricMetadata?.direction)}
                      <span className="text-xs text-gray-600">
                        {kpi.metricMetadata?.direction?.replace(/_/g, ' ') || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(kpi.metricDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: KPI editing will be available in a future update.</p>
      </div>
    </div>
  );
}

