/**
 * Enterprise Security Monitor Component
 * Provides real-time security monitoring and audit capabilities
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useSecurity } from '../../hooks/useSecurity';
import { securityConfig } from '../../config/security.config';

interface SecurityMonitorProps {
  showDetails?: boolean;
  className?: string;
}

export const SecurityMonitor: React.FC<SecurityMonitorProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [securityState, securityActions] = useSecurity();
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [auditReport, setAuditReport] = useState<any>(null);

  // Get audit report on mount and when expanded
  useEffect(() => {
    if (isExpanded) {
      const report = securityActions.getAuditReport();
      setAuditReport(report);
    }
  }, [isExpanded, securityActions]);

  // Auto-refresh audit report every 30 seconds when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const interval = setInterval(() => {
      const report = securityActions.getAuditReport();
      setAuditReport(report);
    }, 30000);

    return () => clearInterval(interval);
  }, [isExpanded, securityActions]);

  const getStatusColor = () => {
    if (!securityState.isInitialized) return 'text-gray-400';
    if (!securityState.environmentValid) return 'text-red-500';
    if (securityState.securityIssues.length > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!securityState.isInitialized) return <Shield className="w-4 h-4" />;
    if (!securityState.environmentValid) return <XCircle className="w-4 h-4" />;
    if (securityState.securityIssues.length > 0) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!securityState.isInitialized) return 'Initializing...';
    if (!securityState.environmentValid) return 'Security Issues Detected';
    if (securityState.securityIssues.length > 0) return 'Warnings';
    return 'Secure';
  };

  const handleRefresh = () => {
    const report = securityActions.getAuditReport();
    setAuditReport(report);
  };

  const handleClearEvents = () => {
    securityActions.clearEvents();
    setAuditReport(null);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Security Monitor</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1 text-xs ${getStatusColor()}`}>
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </span>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isExpanded ? 'Hide details' : 'Show details'}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {securityState.eventCount}
            </div>
            <div className="text-xs text-gray-500">Events</div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {securityState.environmentValid ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-500">Environment</div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {securityState.securityIssues.length}
            </div>
            <div className="text-xs text-gray-500">Issues</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Actions */}
          <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Security Actions</span>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleClearEvents}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Clear Events
              </button>
            </div>
          </div>

          {/* Configuration */}
          <div className="px-4 py-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Security Configuration</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>HTTPS Required: {securityConfig.HTTPS_REQUIRED ? 'Yes' : 'No'}</div>
              <div>API Timeout: {securityConfig.API_TIMEOUT}ms</div>
              <div>Max Retries: {securityConfig.MAX_RETRIES}</div>
              <div>Log Level: {securityConfig.LOG_LEVEL}</div>
              <div>Audit Enabled: {securityConfig.SECURITY_AUDIT_ENABLED ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Environment Validation */}
          {securityState.securityIssues.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-red-900 mb-2">Security Issues</h4>
              <div className="space-y-1">
                {securityState.securityIssues.map((issue, index) => (
                  <div key={index} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          {auditReport && auditReport.recentEvents && (
            <div className="px-4 py-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Security Events</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {auditReport.recentEvents.map((event: any, index: number) => (
                  <div key={index} className="text-xs bg-gray-50 px-2 py-1 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.type}</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Audit */}
          {auditReport && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Last audit: {new Date(auditReport.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityMonitor;