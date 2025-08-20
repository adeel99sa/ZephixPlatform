import React from 'react';
import { BarChart3, TrendingUp, HardDrive } from 'lucide-react';
import { Card } from '../shared/Card';
import type { UserActivity, StorageUsage } from '../../../types/admin';

interface UsageMetricsCardProps {
  title: string;
  data: UserActivity[] | StorageUsage;
  type: 'line' | 'bar';
}

export const UsageMetricsCard: React.FC<UsageMetricsCardProps> = ({ title, data, type }) => {
  const isStorageData = 'used' in data && 'limit' in data;
  const isUserData = Array.isArray(data);

  const getIcon = () => {
    if (isStorageData) return HardDrive;
    return TrendingUp;
  };

  const Icon = getIcon();

  const renderStorageContent = (storageData: StorageUsage) => {
    const percentage = (storageData.used / storageData.limit) * 100;
    const colorClass = percentage > 80 ? 'text-error' : percentage > 60 ? 'text-warning' : 'text-success';
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${colorClass}`}>
            {storageData.used} {storageData.unit}
          </div>
          <div className="text-sm text-gray-500">of {storageData.limit} {storageData.unit}</div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          {percentage.toFixed(1)}% used
        </div>
      </div>
    );
  };

  const renderUserContent = (userData: UserActivity[]) => {
    const latestData = userData[userData.length - 1];
    const previousData = userData[userData.length - 2];
    const change = previousData ? latestData.activeUsers - previousData.activeUsers : 0;
    const changePercent = previousData ? (change / previousData.activeUsers) * 100 : 0;
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {latestData.activeUsers}
          </div>
          <div className="text-sm text-gray-500">Active Users</div>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <span className={`text-sm font-medium ${
            change >= 0 ? 'text-success' : 'text-error'
          }`}>
            {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500">from yesterday</span>
        </div>
        
        {/* Chart placeholder */}
        <div className="h-20 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500">
            {type === 'line' ? '📈 Line Chart' : '📊 Bar Chart'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      
      {isStorageData ? renderStorageContent(data as StorageUsage) : renderUserContent(data as UserActivity[])}
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="text-sm text-primary hover:text-blue-700 font-medium">
          View details →
        </button>
      </div>
    </Card>
  );
};

