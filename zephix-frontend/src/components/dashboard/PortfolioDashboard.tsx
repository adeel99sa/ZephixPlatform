import { useState, useEffect } from 'react';
import api from '@/services/api';

export function PortfolioDashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioKPIs();
  }, []);

  const fetchPortfolioKPIs = async () => {
    try {
      const response = await api.get('/kpi/portfolio');
      setPortfolio(response.data?.success ? response.data.data : response.data);
    } catch (error) {
      console.error('Failed to fetch portfolio KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading portfolio data...</div>;
  if (!portfolio) return <div className="p-6">No portfolio data available</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Portfolio Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-3xl font-bold">{portfolio.totalProjects}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg shadow">
          <p className="text-sm text-green-600">On Track</p>
          <p className="text-3xl font-bold text-green-700">{portfolio.projectsOnTrack}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <p className="text-sm text-yellow-600">At Risk</p>
          <p className="text-3xl font-bold text-yellow-700">{portfolio.projectsAtRisk}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg shadow">
          <p className="text-sm text-red-600">Off Track</p>
          <p className="text-3xl font-bold text-red-700">{portfolio.projectsOffTrack}</p>
        </div>
      </div>

      {/* Resource Utilization */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resource Utilization</h2>
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
            <div
              className={`h-4 rounded-full ${
                portfolio.overallResourceUtilization > 100 ? 'bg-red-500' :
                portfolio.overallResourceUtilization > 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(portfolio.overallResourceUtilization, 100)}%` }}
            />
          </div>
          <span className="font-bold">{portfolio.overallResourceUtilization}%</span>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Budget Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Budget</p>
            <p className="text-xl font-bold">${(portfolio.totalBudget || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Consumed</p>
            <p className="text-xl font-bold">${(portfolio.budgetConsumed || 0).toLocaleString()}</p>
          </div>
        </div>
        
        {portfolio.criticalRisks > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded">
            <p className="text-red-700 font-medium">⚠️ {portfolio.criticalRisks} critical risks detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

