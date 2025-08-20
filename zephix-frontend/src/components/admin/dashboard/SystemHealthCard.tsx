import React from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '../shared/Card';
import type { SystemHealthData } from '../../../types/admin';

interface SystemHealthCardProps {
  data: SystemHealthData;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ data }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'text-success', bg: 'bg-green-100', icon: CheckCircle, text: 'All systems operational' };
      case 'degraded':
        return { color: 'text-warning', bg: 'bg-yellow-100', icon: AlertCircle, text: 'Some issues detected' };
      case 'error':
        return { color: 'text-error', bg: 'bg-red-100', icon: AlertCircle, text: 'Service interruption' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-100', icon: Activity, text: 'Status unknown' };
    }
  };

  const statusConfig = getStatusConfig(data.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">System Health</h3>
        <Activity className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className={`flex items-center space-x-2 p-3 rounded-lg ${statusConfig.bg} mb-4`}>
        <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
        <span className={`font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </span>
      </div>

      <div className="space-y-2">
        {Object.entries(data.services).map(([service, status]) => (
          <div key={service} className="flex justify-between items-center text-sm">
            <span className="capitalize text-gray-600">{service}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'operational' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button className="text-sm text-primary hover:text-blue-700 font-medium">
          View system logs →
        </button>
      </div>
    </Card>
  );
};

