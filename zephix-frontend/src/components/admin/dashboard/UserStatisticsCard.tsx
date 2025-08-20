import React from 'react';
import { Users, TrendingUp, UserPlus } from 'lucide-react';
import { Card } from '../shared/Card';
import type { UserStatistics } from '../../../types/admin';

interface UserStatisticsCardProps {
  data: UserStatistics;
}

export const UserStatisticsCard: React.FC<UserStatisticsCardProps> = ({ data }) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">User Statistics</h3>
        <Users className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.active}</div>
          <div className="text-sm text-gray-500">Active Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.total}</div>
          <div className="text-sm text-gray-500">Total Users</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Licensed Users</span>
          <span className="font-medium">{data.licensed}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Growth</span>
          <span className="flex items-center text-success font-medium">
            <TrendingUp className="w-4 h-4 mr-1" />
            {data.growth}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">New This Week</span>
          <span className="flex items-center text-primary font-medium">
            <UserPlus className="w-4 h-4 mr-1" />
            {data.newThisWeek}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="text-sm text-primary hover:text-blue-700 font-medium">
          View all users →
        </button>
      </div>
    </Card>
  );
};

