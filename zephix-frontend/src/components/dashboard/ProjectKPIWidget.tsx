import { useState, useEffect } from 'react';
import api from '@/services/api';

interface ProjectKPIWidgetProps {
  projectId: string;
}

export function ProjectKPIWidget({ projectId }: ProjectKPIWidgetProps) {
  const [kpis, setKPIs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, [projectId]);

  const fetchKPIs = async () => {
    try {
      const response = await api.get(`/kpi/project/${projectId}`);
      setKPIs(response.data?.success ? response.data.data : response.data);
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading KPIs...</div>;
  if (!kpis) return <div>No KPI data available</div>;

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800';
      case 'off-track': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Project Health</h3>
      
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getHealthColor(kpis.healthStatus)}`}>
        {kpis.healthStatus?.toUpperCase()}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Completion</p>
          <p className="text-2xl font-bold">{kpis.completionPercentage}%</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Tasks</p>
          <p className="text-2xl font-bold">{kpis.tasksCompleted}/{kpis.tasksTotal}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Resource Load</p>
          <p className="text-2xl font-bold">{kpis.resourceUtilization}%</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Risk Score</p>
          <p className="text-2xl font-bold">{kpis.riskScore}/100</p>
        </div>
      </div>

      {kpis.tasksOverdue > 0 && (
        <div className="mt-4 p-2 bg-red-50 rounded">
          <p className="text-red-600 text-sm">⚠️ {kpis.tasksOverdue} tasks overdue</p>
        </div>
      )}
    </div>
  );
}

