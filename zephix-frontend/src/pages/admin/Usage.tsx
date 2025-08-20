import React, { useState } from 'react';
import { BarChart3, TrendingUp, HardDrive, Users, Activity, Download, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/admin/shared/Card';
import { Button } from '../../components/admin/shared/Button';
import { mockDashboardData } from '../../mocks/adminData';

export const Usage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('users');

  // Mock usage data
  const usageData = {
    users: mockDashboardData.usage.users,
    storage: mockDashboardData.usage.storage,
    apiCalls: mockDashboardData.usage.apiCalls,
    aiCredits: mockDashboardData.usage.aiCredits
  };

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const metrics = [
    { key: 'users', label: 'User Activity', icon: Users, color: 'text-blue-600' },
    { key: 'storage', label: 'Storage Usage', icon: HardDrive, color: 'text-green-600' },
    { key: 'apiCalls', label: 'API Usage', icon: Activity, color: 'text-purple-600' },
    { key: 'aiCredits', label: 'AI Credits', icon: TrendingUp, color: 'text-orange-600' }
  ];

  const getMetricData = (metricKey: string) => {
    switch (metricKey) {
      case 'users':
        return {
          current: usageData.users[usageData.users.length - 1]?.activeUsers || 0,
          previous: usageData.users[usageData.users.length - 2]?.activeUsers || 0,
          change: '+12%',
          trend: 'up'
        };
      case 'storage':
        return {
          current: usageData.storage.used,
          previous: usageData.storage.limit,
          change: `${((usageData.storage.used / usageData.storage.limit) * 100).toFixed(1)}%`,
          trend: 'up'
        };
      case 'apiCalls':
        return {
          current: usageData.apiCalls[usageData.apiCalls.length - 1]?.calls || 0,
          previous: usageData.apiCalls[usageData.apiCalls.length - 2]?.calls || 0,
          change: '+8%',
          trend: 'up'
        };
      case 'aiCredits':
        return {
          current: usageData.aiCredits.used,
          previous: usageData.aiCredits.limit,
          change: `${((usageData.aiCredits.used / usageData.aiCredits.limit) * 100).toFixed(1)}%`,
          trend: 'up'
        };
      default:
        return { current: 0, previous: 0, change: '0%', trend: 'neutral' };
    }
  };

  const currentMetric = getMetricData(selectedMetric);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Usage & Analytics</h1>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setSelectedMetric(metric.key)}
            className={`p-4 border rounded-lg text-left transition-colors ${
              selectedMetric === metric.key
                ? 'border-primary bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <metric.icon className={`w-6 h-6 ${metric.color}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{metric.label}</div>
                <div className="text-xs text-gray-500">Click to view details</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Metric Display */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {(() => {
              const metric = metrics.find(m => m.key === selectedMetric);
              const Icon = metric?.icon || TrendingUp;
              return <Icon className="w-6 h-6 text-primary" />;
            })()}
            <h2 className="text-xl font-medium text-gray-900">
              {metrics.find(m => m.key === selectedMetric)?.label}
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{timeRangeOptions.find(o => o.value === timeRange)?.label}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{currentMetric.current}</div>
            <div className="text-sm text-gray-500">Current</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{currentMetric.previous}</div>
            <div className="text-sm text-gray-500">Previous</div>
          </div>
          
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              currentMetric.trend === 'up' ? 'text-green-600' : 
              currentMetric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {currentMetric.change}
            </div>
            <div className="text-sm text-gray-500">Change</div>
          </div>
        </div>
        
        {/* Chart placeholder */}
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">
            📊 {metrics.find(m => m.key === selectedMetric)?.label} Chart for {timeRangeOptions.find(o => o.value === timeRange)?.label}
          </span>
        </div>
      </Card>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Details */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">User Activity Details</h3>
          </div>
          
          <div className="space-y-3">
            {usageData.users.slice(-5).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{day.date}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(day.activeUsers / 25) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{day.activeUsers}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <Button variant="outline" size="sm" className="w-full">
              View Full Report
            </Button>
          </div>
        </Card>

        {/* Storage Usage Details */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <HardDrive className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">Storage Breakdown</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Documents</span>
                <span className="font-medium">45 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '37.5%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Images & Media</span>
                <span className="font-medium">32 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '26.7%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Database</span>
                <span className="font-medium">28 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '23.3%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Other</span>
                <span className="font-medium">15 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '12.5%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <Button variant="outline" size="sm" className="w-full">
              Storage Management
            </Button>
          </div>
        </Card>
      </div>

      {/* Usage Alerts */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-warning" />
          <h3 className="text-lg font-medium text-gray-900">Usage Alerts</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">Storage usage approaching limit</div>
              <div className="text-xs text-yellow-700">Current usage: 120 GB / 200 GB (60%)</div>
            </div>
            <Button size="sm" variant="outline">
              Upgrade Plan
            </Button>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-800">High API usage detected</div>
              <div className="text-xs text-blue-700">API calls increased by 25% this week</div>
            </div>
            <Button size="sm" variant="outline">
              View Details
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

