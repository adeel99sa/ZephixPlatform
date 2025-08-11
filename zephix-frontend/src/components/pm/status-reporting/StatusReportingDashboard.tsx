import React, { useState, useEffect } from 'react';
import { useStatusReporting } from '../../../hooks/useStatusReporting';
import PerformanceMetrics from './PerformanceMetrics';
import TrendAnalysis from './TrendAnalysis';
import RiskMonitoring from './RiskMonitoring';
import StakeholderViews from './StakeholderViews';
import ReportExport from './ReportExport';
import AlertConfiguration from './AlertConfiguration';

interface StatusReportingDashboardProps {
  projectId: string;
  onReportGenerated?: (reportId: string) => void;
}

interface ProjectStatus {
  overallStatus: 'green' | 'yellow' | 'red';
  healthScore: number;
  scheduleVariance: number;
  budgetVariance: number;
  scopeCompletion: number;
  activeRisks: number;
  criticalRisks: number;
}

const StatusReportingDashboard: React.FC<StatusReportingDashboardProps> = ({
  projectId,
  onReportGenerated,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    generateReport,
    getMetrics,
    getTrends,
    exportReport,
    configureAlerts,
    loading: serviceLoading,
    error: serviceError,
  } = useStatusReporting();

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load metrics and trends in parallel
      const [metricsData, trendsData] = await Promise.all([
        getMetrics(projectId),
        getTrends(projectId),
      ]);

      setMetrics(metricsData);
      setTrends(trendsData);

      // Calculate overall project status
      const status = calculateProjectStatus(metricsData);
      setProjectStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectStatus = (metricsData: any): ProjectStatus => {
    // Calculate overall status based on metrics
    const healthScore = metricsData?.healthIndicators?.overallHealth || 75;
    const scheduleVariance = metricsData?.currentMetrics?.schedule?.variance || 0;
    const budgetVariance = metricsData?.currentMetrics?.budget?.variance || 0;
    const scopeCompletion = metricsData?.currentMetrics?.scope?.completion || 0;
    const activeRisks = metricsData?.currentMetrics?.risk?.active || 0;
    const criticalRisks = metricsData?.currentMetrics?.risk?.critical || 0;

    let overallStatus: 'green' | 'yellow' | 'red' = 'green';
    if (healthScore < 60 || criticalRisks > 2) {
      overallStatus = 'red';
    } else if (healthScore < 80 || activeRisks > 3) {
      overallStatus = 'yellow';
    }

    return {
      overallStatus,
      healthScore,
      scheduleVariance,
      budgetVariance,
      scopeCompletion,
      activeRisks,
      criticalRisks,
    };
  };

  const handleGenerateReport = async (config: any) => {
    try {
      const report = await generateReport({
        projectId,
        ...config,
      });

      if (onReportGenerated) {
        onReportGenerated(report.reportId);
      }

      // Refresh project data after report generation
      await loadProjectData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    }
  };

  const handleExportReport = async (reportId: string, format: string) => {
    try {
      const result = await exportReport(reportId, format, 'executive');
      // Handle download
      window.open(result.downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  const handleConfigureAlerts = async (config: any) => {
    try {
      await configureAlerts(projectId, config);
      // Show success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure alerts');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading project data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Status Reporting Dashboard</h1>
            <p className="text-gray-600">Project ID: {projectId}</p>
          </div>
          <div className="flex items-center space-x-4">
            {projectStatus && (
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    projectStatus.overallStatus === 'green'
                      ? 'bg-green-500'
                      : projectStatus.overallStatus === 'yellow'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {projectStatus.overallStatus.toUpperCase()}
                </span>
              </div>
            )}
            <div className="text-right">
              <div className="text-sm text-gray-600">Health Score</div>
              <div className="text-lg font-semibold text-gray-900">
                {projectStatus?.healthScore || 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" data-testid="status-reporting-tabs">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'metrics', name: 'Performance Metrics', icon: '📈' },
              { id: 'trends', name: 'Trend Analysis', icon: '📉' },
              { id: 'risks', name: 'Risk Monitoring', icon: '⚠️' },
              { id: 'stakeholders', name: 'Stakeholder Views', icon: '👥' },
              { id: 'export', name: 'Report Export', icon: '📄' },
              { id: 'alerts', name: 'Alert Configuration', icon: '🔔' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`status-tab-${tab.id}`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-blue-600">Schedule Variance</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {projectStatus?.scheduleVariance ? `${projectStatus.scheduleVariance}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-green-600">Budget Variance</div>
                    <div className="text-lg font-semibold text-green-900">
                      {projectStatus?.budgetVariance ? `${projectStatus.budgetVariance}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-purple-600">Scope Completion</div>
                    <div className="text-lg font-semibold text-purple-900">
                      {projectStatus?.scopeCompletion ? `${projectStatus.scopeCompletion}%` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-red-600">Active Risks</div>
                    <div className="text-lg font-semibold text-red-900">
                      {projectStatus?.activeRisks || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <PerformanceMetrics
              projectId={projectId}
              metrics={metrics}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'trends' && (
            <TrendAnalysis
              projectId={projectId}
              trends={trends}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'risks' && (
            <RiskMonitoring
              projectId={projectId}
              activeRisks={projectStatus?.activeRisks || 0}
              criticalRisks={projectStatus?.criticalRisks || 0}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'stakeholders' && (
            <StakeholderViews
              projectId={projectId}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'export' && (
            <ReportExport
              projectId={projectId}
              onExportReport={handleExportReport}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertConfiguration
              projectId={projectId}
              onConfigureAlerts={handleConfigureAlerts}
            />
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {serviceLoading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <div className="mt-2 text-sm text-gray-600">Processing...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusReportingDashboard;
