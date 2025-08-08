import React from 'react';

interface RiskMonitoringProps {
  projectId: string;
  activeRisks: number;
  criticalRisks: number;
  onGenerateReport: (config: any) => Promise<void>;
}

const RiskMonitoring: React.FC<RiskMonitoringProps> = ({
  projectId,
  activeRisks,
  criticalRisks,
  onGenerateReport,
}) => {
  const mockRisks = [
    {
      id: 1,
      title: 'Resource constraints affecting timeline',
      severity: 'high',
      probability: 0.4,
      impact: 'medium',
      status: 'active',
      mitigation: 'Hiring additional developers',
      owner: 'John Doe',
      dueDate: '2024-12-15',
    },
    {
      id: 2,
      title: 'Scope creep in Module B',
      severity: 'critical',
      probability: 0.3,
      impact: 'high',
      status: 'active',
      mitigation: 'Strict change control process',
      owner: 'Jane Smith',
      dueDate: '2024-12-10',
    },
    {
      id: 3,
      title: 'Third-party API integration delays',
      severity: 'medium',
      probability: 0.2,
      impact: 'medium',
      status: 'monitored',
      mitigation: 'Alternative API providers',
      owner: 'Bob Johnson',
      dueDate: '2024-12-20',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'mitigated':
        return 'bg-green-100 text-green-800';
      case 'monitored':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">{criticalRisks}</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Critical Risks</div>
              <div className="text-lg font-semibold text-red-600">{criticalRisks}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-semibold">{activeRisks}</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Active Risks</div>
              <div className="text-lg font-semibold text-orange-600">{activeRisks}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">2</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Mitigated</div>
              <div className="text-lg font-semibold text-green-600">2</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">85%</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-600">Risk Score</div>
              <div className="text-lg font-semibold text-blue-600">85%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Matrix */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Risk Matrix</h4>
        <div className="grid grid-cols-5 gap-2">
          {/* Matrix Headers */}
          <div className="text-center text-xs font-medium text-gray-500">Probability</div>
          <div className="text-center text-xs font-medium text-gray-500">Very Low</div>
          <div className="text-center text-xs font-medium text-gray-500">Low</div>
          <div className="text-center text-xs font-medium text-gray-500">Medium</div>
          <div className="text-center text-xs font-medium text-gray-500">High</div>
          <div className="text-center text-xs font-medium text-gray-500">Very High</div>

          {/* Matrix Rows */}
          {['Very High', 'High', 'Medium', 'Low', 'Very Low'].map((impact, index) => (
            <React.Fragment key={impact}>
              <div className="text-xs font-medium text-gray-500 flex items-center">{impact}</div>
              {[1, 2, 3, 4, 5].map((prob) => {
                const riskLevel = Math.max(prob, 6 - index);
                const bgColor = riskLevel >= 15 ? 'bg-red-200' : riskLevel >= 10 ? 'bg-orange-200' : 'bg-yellow-200';
                return (
                  <div key={prob} className={`${bgColor} p-2 rounded text-center text-xs`}>
                    {riskLevel}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Risk List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Active Risks</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {mockRisks.map((risk) => (
            <div key={risk.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h5 className="text-sm font-medium text-gray-900">{risk.title}</h5>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(risk.severity)}`}>
                      {risk.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(risk.status)}`}>
                      {risk.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Probability:</span> {(risk.probability * 100).toFixed(0)}%
                    </div>
                    <div>
                      <span className="font-medium">Impact:</span> {risk.impact}
                    </div>
                    <div>
                      <span className="font-medium">Owner:</span> {risk.owner}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span> {risk.dueDate}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-700">Mitigation:</span>
                    <span className="text-sm text-gray-600 ml-1">{risk.mitigation}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Risk Trends</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Risk Evolution</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Week 1</span>
                <span className="font-medium">5 risks</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Week 2</span>
                <span className="font-medium">4 risks</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Week 3</span>
                <span className="font-medium">3 risks</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Week 4</span>
                <span className="font-medium">3 risks</span>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Severity Distribution</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Critical</span>
                <span className="font-medium text-red-600">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High</span>
                <span className="font-medium text-orange-600">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Medium</span>
                <span className="font-medium text-yellow-600">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Low</span>
                <span className="font-medium text-green-600">0</span>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Mitigation Progress</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium text-blue-600">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Not Started</span>
                <span className="font-medium text-gray-600">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      <div className="bg-red-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-red-900 mb-4">Risk Alerts</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-red-800">
                Critical risk "Scope creep in Module B" requires immediate attention
              </p>
              <p className="text-xs text-red-600 mt-1">Due: Dec 10, 2024</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-red-800">
                High risk "Resource constraints" mitigation plan needs review
              </p>
              <p className="text-xs text-red-600 mt-1">Due: Dec 15, 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Risk Report */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Generate Risk Report</h4>
        <p className="text-sm text-blue-800 mb-4">
          Create a comprehensive risk assessment report for stakeholders
        </p>
        <button
          onClick={() => onGenerateReport({
            projectId,
            reportingPeriod: {
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
            },
            stakeholderAudience: 'executive',
            reportFormat: 'detailed',
            dataSourcesConfig: {
              includeJira: true,
              includeGitHub: true,
              includeTeamsData: true,
              includeBudgetData: true,
              includeManualUpdates: true,
            },
          })}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Generate Risk Report
        </button>
      </div>
    </div>
  );
};

export default RiskMonitoring;
