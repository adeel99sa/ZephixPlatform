import React from 'react';

interface TrendAnalysisProps {
  projectId: string;
  trends: any[];
  onGenerateReport: (config: any) => Promise<void>;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  projectId,
  trends,
  onGenerateReport,
}) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No trend data available</div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving':
        return '📈';
      case 'stable':
        return '➡️';
      case 'deteriorating':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving':
        return 'text-green-600';
      case 'stable':
        return 'text-blue-600';
      case 'deteriorating':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Trend Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Schedule Trend</h4>
              <p className="text-sm text-gray-600">Performance over time</p>
            </div>
            <div className="text-2xl">📅</div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getTrendIcon('improving')}</span>
              <span className={`font-semibold ${getTrendColor('improving')}`}>Improving</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              SPI: 0.98 → 1.02 (+4.1%)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Budget Trend</h4>
              <p className="text-sm text-gray-600">Cost performance</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getTrendIcon('stable')}</span>
              <span className={`font-semibold ${getTrendColor('stable')}`}>Stable</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              CPI: 1.00 → 1.01 (+1.0%)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Quality Trend</h4>
              <p className="text-sm text-gray-600">Defect rate & coverage</p>
            </div>
            <div className="text-2xl">🔍</div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getTrendIcon('improving')}</span>
              <span className={`font-semibold ${getTrendColor('improving')}`}>Improving</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Defect Rate: 5.2% → 3.8% (-27%)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Risk Trend</h4>
              <p className="text-sm text-gray-600">Risk assessment</p>
            </div>
            <div className="text-2xl">⚠️</div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getTrendIcon('stable')}</span>
              <span className={`font-semibold ${getTrendColor('stable')}`}>Stable</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Active Risks: 3 → 3 (0%)
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Schedule Performance</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">SPI Trend</span>
              <span className="text-sm font-medium text-green-600">+4.1%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
              <div>Week 1</div>
              <div>Week 2</div>
              <div>Week 3</div>
              <div>Week 4</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-medium">
              <div>0.94</div>
              <div>0.96</div>
              <div>0.98</div>
              <div>1.02</div>
            </div>
          </div>
        </div>

        {/* Budget Performance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Budget Performance</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">CPI Trend</span>
              <span className="text-sm font-medium text-blue-600">+1.0%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
              <div>Week 1</div>
              <div>Week 2</div>
              <div>Week 3</div>
              <div>Week 4</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-medium">
              <div>0.98</div>
              <div>0.99</div>
              <div>1.00</div>
              <div>1.01</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Data Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Detailed Trend Analysis</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Previous
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Schedule Performance Index
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.02</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0.98</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+4.1%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  <span className="flex items-center">
                    📈 Improving
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Cost Performance Index
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.01</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.00</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">+1.0%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  <span className="flex items-center">
                    ➡️ Stable
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Defect Rate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">3.8%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">5.2%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">-27%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  <span className="flex items-center">
                    📈 Improving
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Test Coverage
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">87%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">82%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+6.1%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  <span className="flex items-center">
                    📈 Improving
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Team Velocity
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">42</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">38</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+10.5%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  <span className="flex items-center">
                    📈 Improving
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Predictive Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Forecasted Completion</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Expected Date</span>
                <span className="text-sm font-medium">Dec 15, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Confidence</span>
                <span className="text-sm font-medium text-green-600">85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Variance</span>
                <span className="text-sm font-medium text-blue-600">+2 days</span>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Budget Forecast</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Expected Cost</span>
                <span className="text-sm font-medium">$520,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Variance</span>
                <span className="text-sm font-medium text-green-600">-$10,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Confidence</span>
                <span className="text-sm font-medium text-green-600">90%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-yellow-900 mb-4">Recommended Actions</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-yellow-800">
                Monitor schedule performance closely as SPI is approaching 1.0
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-yellow-800">
                Continue quality improvement initiatives as defect rate is decreasing
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-yellow-800">
                Consider increasing team capacity as velocity is improving
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;
