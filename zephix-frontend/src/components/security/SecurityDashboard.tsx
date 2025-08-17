/**
 * Enterprise Security Dashboard Component
 * Provides comprehensive security monitoring and management
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, RefreshCw, Trash2, Download, Activity } from 'lucide-react';
import { useSecurity } from '../../hooks/useSecurity';
import { securityConfig } from '../../config/security.config';
import SecurityMonitor from './SecurityMonitor';

interface SecurityDashboardProps {
  className?: string;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ className = '' }) => {
  const [securityState, securityActions] = useSecurity();
  const [isExpanded, setIsExpanded] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'config' | 'audit'>('overview');

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

  const getOverallStatus = () => {
    if (!securityState.isInitialized) return { status: 'initializing', color: 'text-gray-400', icon: <RefreshCw className="w-4 h-4 animate-spin" /> };
    if (!securityState.environmentValid) return { status: 'critical', color: 'text-red-500', icon: <XCircle className="w-4 h-4" /> };
    if (securityState.securityIssues.length > 0) return { status: 'warning', color: 'text-yellow-500', icon: <AlertTriangle className="w-4 h-4" /> };
    return { status: 'secure', color: 'text-green-500', icon: <CheckCircle className="w-4 h-4" /> };
  };

  const handleRefresh = () => {
    const report = securityActions.getAuditReport();
    setAuditReport(report);
  };

  const handleClearEvents = () => {
    securityActions.clearEvents();
    setAuditReport(null);
  };

  const handleDownloadReport = () => {
    if (auditReport) {
      const dataStr = JSON.stringify(auditReport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Security Dashboard</h2>
              <p className="text-sm text-gray-500">Enterprise-grade security monitoring and management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${overallStatus.color} bg-gray-100`}>
              {overallStatus.icon}
              <span className="capitalize">{overallStatus.status}</span>
            </span>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              title={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
            >
              {isExpanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Status */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{securityState.eventCount}</div>
            <div className="text-xs text-gray-500">Security Events</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {securityState.environmentValid ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-500">Environment</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{securityState.securityIssues.length}</div>
            <div className="text-xs text-gray-500">Issues</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {securityState.lastAudit ? '✓' : '✗'}
            </div>
            <div className="text-xs text-gray-500">Audit Ready</div>
          </div>
        </div>
      </div>

      {/* Expanded Dashboard */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Tabs */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
                { id: 'events', label: 'Events', icon: <Activity className="w-4 h-4" /> },
                { id: 'config', label: 'Configuration', icon: <CheckCircle className="w-4 h-4" /> },
                { id: 'audit', label: 'Audit Report', icon: <Download className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="px-6 py-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Security Overview</h3>
                
                {/* Security Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Current Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Environment Validation</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        securityState.environmentValid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {securityState.environmentValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Security Issues</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        securityState.securityIssues.length === 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {securityState.securityIssues.length === 0 ? 'None' : securityState.securityIssues.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Event Monitoring</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {auditReport && auditReport.recentEvents && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {auditReport.recentEvents.slice(0, 5).map((event: any, index: number) => (
                        <div key={index} className="text-xs bg-white px-2 py-1 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{event.type}</span>
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
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Security Events</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRefresh}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 inline mr-1" />
                      Refresh
                    </button>
                    <button
                      onClick={handleClearEvents}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Clear
                    </button>
                  </div>
                </div>
                
                {auditReport && auditReport.recentEvents && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {auditReport.recentEvents.map((event: any, index: number) => (
                      <div key={index} className="text-sm bg-gray-50 px-3 py-2 rounded border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.type}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {event.severity}
                          </span>
                        </div>
                        <div className="text-gray-600 mt-1 text-xs">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        {event.details && (
                          <div className="text-gray-500 mt-1 text-xs">
                            {JSON.stringify(event.details, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Security Configuration</h3>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Current Settings</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">HTTPS Required:</span>
                      <span className="ml-2 font-medium">{securityConfig.HTTPS_REQUIRED ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">API Timeout:</span>
                      <span className="ml-2 font-medium">{securityConfig.API_TIMEOUT}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Max Retries:</span>
                      <span className="ml-2 font-medium">{securityConfig.MAX_RETRIES}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Log Level:</span>
                      <span className="ml-2 font-medium capitalize">{securityConfig.LOG_LEVEL}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Audit Enabled:</span>
                      <span className="ml-2 font-medium">{securityConfig.SECURITY_AUDIT_ENABLED ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Environment:</span>
                      <span className="ml-2 font-medium capitalize">{import.meta.env.MODE}</span>
                    </div>
                  </div>
                </div>

                {/* Environment Validation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Environment Validation</h4>
                  <div className="space-y-2">
                    {securityState.securityIssues.length > 0 ? (
                      securityState.securityIssues.map((issue, index) => (
                        <div key={index} className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
                          {issue}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
                        All environment checks passed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Security Audit Report</h3>
                  <button
                    onClick={handleDownloadReport}
                    disabled={!auditReport}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Download
                  </button>
                </div>
                
                {auditReport ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Report Generated:</span>
                        <span className="ml-2 text-sm">{new Date(auditReport.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-600">Total Events:</span>
                        <span className="ml-2 text-sm">{auditReport.totalEvents}</span>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-600">Events by Severity:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(auditReport.eventsBySeverity || {}).map(([severity, count]) => (
                            <div key={severity} className="text-xs">
                              <span className="capitalize">{severity}:</span>
                              <span className="ml-2">{count as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No audit report available. Click refresh to generate one.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;