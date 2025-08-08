import React, { useState } from 'react';

interface PerformanceMetricsProps {
  projectId: string;
  metrics: any;
  onGenerateReport: (config: any) => Promise<void>;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  projectId,
  metrics,
  onGenerateReport,
}) => {
  const [reportConfig, setReportConfig] = useState({
    stakeholderAudience: 'executive',
    reportFormat: 'detailed',
    dataSourcesConfig: {
      includeJira: true,
      includeGitHub: true,
      includeTeamsData: true,
      includeBudgetData: true,
      includeManualUpdates: true,
    },
  });

  const handleGenerateReport = async () => {
    await onGenerateReport({
      projectId,
      reportingPeriod: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      ...reportConfig,
    });
  };

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No metrics available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Generation Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Generate Status Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stakeholder Audience
            </label>
            <select
              value={reportConfig.stakeholderAudience}
              onChange={(e) =>
                setReportConfig({ ...reportConfig, stakeholderAudience: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="executive">Executive</option>
              <option value="sponsor">Sponsor</option>
              <option value="team">Team</option>
              <option value="client">Client</option>
              <option value="all">All Stakeholders</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Format
            </label>
            <select
              value={reportConfig.reportFormat}
              onChange={(e) =>
                setReportConfig({ ...reportConfig, reportFormat: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="executive-summary">Executive Summary</option>
              <option value="detailed">Detailed Report</option>
              <option value="dashboard">Dashboard</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Sources
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(reportConfig.dataSourcesConfig).map(([key, value]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) =>
                    setReportConfig({
                      ...reportConfig,
                      dataSourcesConfig: {
                        ...reportConfig.dataSourcesConfig,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Generate Report
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Schedule Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Schedule Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">SPI</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.schedule?.spi?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variance</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.schedule?.variance?.toFixed(2) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completion</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.schedule?.completion?.toFixed(1) || 'N/A'}%
              </span>
            </div>
          </div>
        </div>

        {/* Budget Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Budget Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">CPI</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.budget?.cpi?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variance</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.budget?.variance?.toFixed(2) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Spent</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.budget?.spent?.toFixed(1) || 'N/A'}%
              </span>
            </div>
          </div>
        </div>

        {/* Scope Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Scope Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Completion</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.scope?.completion?.toFixed(1) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deliverables</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.scope?.deliverables || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Milestones</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.scope?.milestones || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Quality Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Defect Rate</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.quality?.defectRate?.toFixed(2) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Test Coverage</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.quality?.testCoverage?.toFixed(1) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Satisfaction</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.quality?.satisfaction?.toFixed(1) || 'N/A'}%
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Risks</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.risk?.active || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Critical Risks</span>
              <span className="font-semibold text-red-600">
                {metrics?.currentMetrics?.risk?.critical || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Risk Score</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.risk?.score?.toFixed(2) || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Team Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Velocity</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.team?.velocity?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.team?.utilization?.toFixed(1) || 'N/A'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Members</span>
              <span className="font-semibold">
                {metrics?.currentMetrics?.team?.members || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Indicators */}
      {metrics?.healthIndicators && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Health Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(metrics.healthIndicators).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{value}%</div>
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baseline Comparison */}
      {metrics?.baseline && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Baseline Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Schedule</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Planned</span>
                  <span className="text-sm font-medium">
                    {metrics.baseline.schedule?.planned || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Actual</span>
                  <span className="text-sm font-medium">
                    {metrics.currentMetrics?.schedule?.actual || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Budget</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Planned</span>
                  <span className="text-sm font-medium">
                    {metrics.baseline.budget?.planned || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Actual</span>
                  <span className="text-sm font-medium">
                    {metrics.currentMetrics?.budget?.actual || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Scope</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Planned</span>
                  <span className="text-sm font-medium">
                    {metrics.baseline.scope?.planned || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Actual</span>
                  <span className="text-sm font-medium">
                    {metrics.currentMetrics?.scope?.actual || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetrics;
