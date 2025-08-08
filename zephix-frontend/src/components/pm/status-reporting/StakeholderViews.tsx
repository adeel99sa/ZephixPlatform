import React, { useState } from 'react';

interface StakeholderViewsProps {
  projectId: string;
  onGenerateReport: (config: any) => Promise<void>;
}

const StakeholderViews: React.FC<StakeholderViewsProps> = ({
  projectId,
  onGenerateReport,
}) => {
  const [selectedStakeholder, setSelectedStakeholder] = useState('executive');

  const stakeholderTypes = [
    { id: 'executive', name: 'Executive', icon: '👔', description: 'High-level summary for C-level executives' },
    { id: 'sponsor', name: 'Sponsor', icon: '💰', description: 'Financial and strategic overview for project sponsors' },
    { id: 'team', name: 'Team', icon: '👥', description: 'Detailed technical and operational information for team members' },
    { id: 'client', name: 'Client', icon: '🤝', description: 'Progress and deliverable status for clients' },
  ];

  const handleGenerateStakeholderReport = async (stakeholderType: string) => {
    await onGenerateReport({
      projectId,
      reportingPeriod: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
      stakeholderAudience: stakeholderType,
      reportFormat: 'detailed',
      dataSourcesConfig: {
        includeJira: true,
        includeGitHub: true,
        includeTeamsData: true,
        includeBudgetData: true,
        includeManualUpdates: true,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Stakeholder Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Stakeholder Views</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stakeholderTypes.map((stakeholder) => (
            <div
              key={stakeholder.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedStakeholder === stakeholder.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedStakeholder(stakeholder.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{stakeholder.icon}</div>
                <div>
                  <h5 className="font-medium text-gray-900">{stakeholder.name}</h5>
                  <p className="text-sm text-gray-600">{stakeholder.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stakeholder-Specific Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-gray-900">
            {stakeholderTypes.find(s => s.id === selectedStakeholder)?.name} View
          </h4>
          <button
            onClick={() => handleGenerateStakeholderReport(selectedStakeholder)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Generate Report
          </button>
        </div>

        {selectedStakeholder === 'executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Project Health</h5>
                <div className="text-2xl font-bold text-green-600">85%</div>
                <p className="text-sm text-green-700">Overall project health score</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Timeline</h5>
                <div className="text-2xl font-bold text-blue-600">On Track</div>
                <p className="text-sm text-blue-700">Expected completion: Dec 15, 2024</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="font-medium text-purple-900 mb-2">Budget</h5>
                <div className="text-2xl font-bold text-purple-600">Under Budget</div>
                <p className="text-sm text-purple-700">2% under planned budget</p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h5 className="font-medium text-yellow-900 mb-2">Key Highlights</h5>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Project is progressing well with 75% completion</li>
                <li>• Team performance has improved by 15% this quarter</li>
                <li>• Quality metrics show significant improvement</li>
                <li>• Risk mitigation strategies are effective</li>
              </ul>
            </div>
          </div>
        )}

        {selectedStakeholder === 'sponsor' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Financial Performance</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Budget Spent</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Cost Variance</span>
                    <span className="font-medium text-green-600">-$10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">ROI</span>
                    <span className="font-medium text-green-600">35%</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Resource Utilization</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Team Utilization</span>
                    <span className="font-medium">88%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Productivity</span>
                    <span className="font-medium text-blue-600">+15%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Efficiency</span>
                    <span className="font-medium text-blue-600">92%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Strategic Insights</h5>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Project is delivering value ahead of schedule</li>
                <li>• Cost savings of $10,000 achieved through efficiency improvements</li>
                <li>• Team productivity has increased by 15%</li>
                <li>• Risk mitigation has prevented potential cost overruns</li>
              </ul>
            </div>
          </div>
        )}

        {selectedStakeholder === 'team' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Development Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Velocity</span>
                    <span className="font-medium">42</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Sprint Success</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Code Quality</span>
                    <span className="font-medium">A</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Quality Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Test Coverage</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Defect Rate</span>
                    <span className="font-medium">3.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Code Review</span>
                    <span className="font-medium">100%</span>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="font-medium text-purple-900 mb-2">Team Performance</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Collaboration</span>
                    <span className="font-medium">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Knowledge Sharing</span>
                    <span className="font-medium">88%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Innovation</span>
                    <span className="font-medium">82%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h5 className="font-medium text-yellow-900 mb-2">Technical Insights</h5>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Code quality has improved by 15% this sprint</li>
                <li>• Test coverage increased from 82% to 87%</li>
                <li>• Team velocity is stable at 42 story points</li>
                <li>• New CI/CD pipeline reduced deployment time by 40%</li>
              </ul>
            </div>
          </div>
        )}

        {selectedStakeholder === 'client' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="font-medium text-green-900 mb-2">Deliverable Status</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Completed</span>
                    <span className="font-medium">12/16</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">In Progress</span>
                    <span className="font-medium">3/16</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">On Schedule</span>
                    <span className="font-medium text-green-600">94%</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Quality Assurance</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Acceptance Rate</span>
                    <span className="font-medium">96%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Client Satisfaction</span>
                    <span className="font-medium">4.8/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Response Time</span>
                    <span className="font-medium">2.3 hours</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h5 className="font-medium text-purple-900 mb-2">Recent Deliverables</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">User Authentication Module</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Dashboard Interface</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">In Progress</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API Integration</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Client Communication</h5>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Weekly status meetings are well attended and productive</li>
                <li>• Client feedback has been positive and constructive</li>
                <li>• Change requests are being handled efficiently</li>
                <li>• Project is meeting all client expectations</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Communication Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Communication Preferences</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Report Frequency</h5>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="radio" name="frequency" className="mr-2" defaultChecked />
                <span className="text-sm">Weekly</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="frequency" className="mr-2" />
                <span className="text-sm">Bi-weekly</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="frequency" className="mr-2" />
                <span className="text-sm">Monthly</span>
              </label>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Delivery Method</h5>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Email</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Dashboard</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Slack</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Teams</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeholderViews;
